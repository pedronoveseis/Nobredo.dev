// Uso: node tools/importar-ruido.mjs [pagina.html | palavras.txt]
// Sem argumento, baixa https://www.dicio.com.br/palavras-com-quatro-letras/ (fetch direto;
// atrás de proxy, baixe com curl e passe o arquivo .html).
// Gera site/assets/ruido.js só com palavras de 4 letras, sem as de tools/bloqueadas.txt.
import { readFileSync, writeFileSync } from "node:fs";

const URL_FONTE = "https://www.dicio.com.br/palavras-com-quatro-letras/";

export const semAcento = (s) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

export function extrairDaPagina(html) {
  const inicio = html.indexOf('id="resultsTitle"');
  const out = [];
  for (const [, bloco] of html.slice(inicio).matchAll(/<p>([\s\S]*?)<\/p>/g)) {
    if (!/<br\s*\/?>/.test(bloco)) continue;
    for (const parte of bloco.split(/<br\s*\/?>/)) out.push(parte.replace(/<[^>]+>/g, "").trim());
  }
  return out;
}

export function filtrar(palavras, bloqueadas) {
  const nega = new Set(bloqueadas.map(semAcento));
  const vistas = new Set();
  const ficam = [];
  const fora = [];
  for (const bruta of palavras) {
    const p = bruta.trim();
    if (!p) continue;
    // 4 letras, tudo minúsculo (maiúscula = nome próprio ou sigla)
    const valida = [...p].length === 4 && /^\p{L}+$/u.test(p) && p === p.toLowerCase();
    if (!valida || nega.has(semAcento(p)) || vistas.has(p)) { fora.push(p); continue; }
    vistas.add(p);
    ficam.push(p);
  }
  return { ficam, fora };
}

export function bloqueadasDoArquivo(texto) {
  return texto.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const bloqueadas = bloqueadasDoArquivo(readFileSync(new URL("./bloqueadas.txt", import.meta.url), "utf8"));
  const arquivo = process.argv[2];
  const texto = arquivo ? readFileSync(arquivo, "utf8") : await (await fetch(URL_FONTE)).text();
  const bruto = !arquivo || arquivo.endsWith(".html") ? extrairDaPagina(texto) : texto.split(/\s+/);
  const { ficam, fora } = filtrar(bruto, bloqueadas);
  ficam.sort((a, b) => a.localeCompare(b, "pt"));
  const linhas = [];
  for (let i = 0; i < ficam.length; i += 20) linhas.push(ficam.slice(i, i + 20).join(" "));
  writeFileSync(
    new URL("../site/assets/ruido.js", import.meta.url),
    `// Ruído: palavras de EXATAMENTE 4 letras. Gerado por tools/importar-ruido.mjs.\n// Repositório público: nada pessoal aqui.\nexport const RUIDO = \`\n${linhas.join("\n")}\n\`.split(/\\s+/).filter(Boolean);\n`,
  );
  console.error(`${ficam.length} palavras gravadas; ${fora.length} removidas:\n${fora.join(" ")}`);
}
