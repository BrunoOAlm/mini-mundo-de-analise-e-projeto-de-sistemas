// Senhas (PBKDF2-SHA256) e tokens de sessão, só com WebCrypto (Workers e Node 24).
const ITER = 100000;
const enc = new TextEncoder();

function b64(bytes) { let s = ""; for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b); return btoa(s); }
function deB64(s) { return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); }
function b64url(bytes) { return b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }

async function derivar(senha, sal, iter) {
  const chave = await crypto.subtle.importKey("raw", enc.encode(senha), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: sal, iterations: iter }, chave, 256);
}

export async function hashSenha(senha) {
  const sal = crypto.getRandomValues(new Uint8Array(16));
  return "pbkdf2$" + ITER + "$" + b64(sal) + "$" + b64(await derivar(senha, sal, ITER));
}

export async function confereSenha(senha, guardado) {
  const p = String(guardado || "").split("$");
  if (p.length !== 4 || p[0] !== "pbkdf2") return false;
  const calc = new Uint8Array(await derivar(senha, deB64(p[2]), Number(p[1])));
  const esperado = deB64(p[3]);
  if (calc.length !== esperado.length) return false;
  let dif = 0; for (let i = 0; i < calc.length; i++) dif |= calc[i] ^ esperado[i]; // comparação em tempo constante
  return dif === 0;
}

export function novoToken() { return b64url(crypto.getRandomValues(new Uint8Array(32))); }

export async function sha256hex(s) {
  const h = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)));
  return Array.from(h, (b) => b.toString(16).padStart(2, "0")).join("");
}
