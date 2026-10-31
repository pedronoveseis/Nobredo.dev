// Uso: node tools/preview.mjs [porta]
// Pré-visualização local SEM cifrar: serve site/ em 127.0.0.1 e entrega pessoais.txt e palavra-final.txt
// (na raiz do repositório, fora do Git) em /__preview.json. Edite os .txt e recarregue a página.
// Nada disso vai para o site publicado: o app só usa /__preview.json em localhost com ?preview.
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const raizSite = new URL("../site/", import.meta.url).pathname;
const raizRepo = new URL("../", import.meta.url).pathname;
const porta = Number(process.argv[2]) || 8000;
const tipos = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8" };

const linhas = (nome) => {
  const arq = join(raizRepo, nome);
  if (!existsSync(arq)) throw new Error(`Falta ${nome} na raiz do projeto.`);
  return readFileSync(arq, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
};

createServer((req, res) => {
  const { pathname } = new URL(req.url, "http://x");
  try {
    if (pathname === "/__preview.json") {
      const palavras = linhas("pessoais.txt");
      const palavra = linhas("palavra-final.txt")[0];
      res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
      return res.end(JSON.stringify({ palavra, palavras }));
    }
    const rel = normalize(pathname === "/" ? "/index.html" : pathname);
    const arq = join(raizSite, rel);
    if (!arq.startsWith(raizSite) || !existsSync(arq) || !statSync(arq).isFile()) { res.writeHead(404); return res.end("404"); }
    res.writeHead(200, { "content-type": tipos[extname(arq)] ?? "application/octet-stream", "cache-control": "no-store" });
    res.end(readFileSync(arq));
  } catch (e) {
    res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
    res.end(e.message);
  }
}).listen(porta, "127.0.0.1", () => {
  console.log(`Preview: http://localhost:${porta}/?preview&data=2026-11-20T12:00:00-03:00`);
  console.log("Troque a data para ver outros dias (a forma completa é 21/11).");
});
