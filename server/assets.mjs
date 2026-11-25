// Arquivos do site via env.ASSETS; pedidos Range viram 206 (o Safari precisa disso para tocar vídeo).
export async function servirAsset(request, env) {
  const res = await env.ASSETS.fetch(request);
  const range = request.headers.get("Range");
  if (!range || res.status !== 200) return res;
  const m = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!m) return res;
  const buf = await res.arrayBuffer(); const size = buf.byteLength;
  const start = m[1] === "" ? size - Number(m[2]) : Number(m[1]);
  const end = m[1] === "" || m[2] === "" ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (isNaN(start) || start < 0 || start >= size || end < start) return new Response(null, { status: 416, headers: { "Content-Range": "bytes */" + size } });
  const h = new Headers(res.headers);
  h.set("Content-Range", "bytes " + start + "-" + end + "/" + size); h.set("Content-Length", String(end - start + 1)); h.set("Accept-Ranges", "bytes");
  return new Response(buf.slice(start, end + 1), { status: 206, headers: h });
}
