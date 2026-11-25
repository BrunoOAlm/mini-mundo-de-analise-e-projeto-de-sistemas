// Monta a pasta publicada no Cloudflare Pages: arquivos do site (do Git e os novos não ignorados, como estão na pasta), 404.html,
// _routes.json (API e vídeos passam pelo worker) e o _worker.js empacotado com esbuild.
// Uso: node scripts/pacote.mjs [pasta]   (padrão: .dist)
import { execFileSync, execSync } from "node:child_process";
import { mkdirSync, rmSync, copyFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";

const destino = process.argv[2] || ".dist";
const FORA = /^(tests|docs|server|scripts)\/|^(README\.md|\.gitignore|wrangler\.toml|package\.json)$/;

rmSync(destino, { recursive: true, force: true });
mkdirSync(destino, { recursive: true });
const arquivos = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" }).split("\n").filter((f) => f && !FORA.test(f) && existsSync(f));
for (const f of arquivos) { mkdirSync(join(destino, dirname(f)), { recursive: true }); copyFileSync(f, join(destino, f)); }

writeFileSync(join(destino, "404.html"), '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>Página não encontrada — Falls Car</title>\n' +
  "<style>body{margin:0;min-height:100vh;display:grid;place-items:center;font-family:system-ui,sans-serif;background:#0a0a0a;color:#fff;text-align:center}a{color:#FFC21A}</style></head>\n" +
  '<body><main><h1>Página não encontrada</h1><p><a href="/">Voltar para a página inicial</a></p></main></body></html>\n');
writeFileSync(join(destino, "_routes.json"), JSON.stringify({ version: 1, include: ["/api/*", "/figma/media/*"], exclude: [] }) + "\n");
execSync('npx --yes esbuild server/worker.mjs --bundle --format=esm --platform=neutral --log-level=warning --outfile="' + join(destino, "_worker.js") + '"', { stdio: "inherit" });
console.log("pacote pronto em " + destino + " (" + arquivos.length + " arquivos do site)");
