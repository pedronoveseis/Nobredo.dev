// Uso: node tools/cifrar.mjs [pessoais.txt] [palavra-final.txt]
// pessoais.txt: uma palavra por linha (as que formam a palavra final). palavra-final.txt: a palavra final.
// Os dois ficam FORA do repositório (.gitignore). Grava site/assets/pessoais.enc.json e imprime a chave:
// o link dela é  https://<site>/#<chave>  (guarde a chave; sem ela não há como recuperar).
import { readFileSync, writeFileSync } from "node:fs";
import { cifrar, novaChave } from "../site/assets/cripto.js";

const linhas = (arquivo) => readFileSync(arquivo, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

const palavras = linhas(process.argv[2] ?? "pessoais.txt");
const palavra = linhas(process.argv[3] ?? "palavra-final.txt")[0];
if (!palavras.length) throw new Error("Nenhuma palavra pessoal.");
if (!palavra) throw new Error("Palavra final vazia.");

const chave = process.env.CHAVE || novaChave();
writeFileSync(new URL("../site/assets/pessoais.enc.json", import.meta.url), JSON.stringify(await cifrar({ palavra, palavras }, chave)) + "\n");
console.error(`${palavras.length} palavras e a palavra final cifradas em site/assets/pessoais.enc.json`);
console.log(chave);
