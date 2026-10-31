// Uso: node tools/cifrar.mjs [pessoais.txt]
// Lê as palavras pessoais (uma por linha), cifra e grava site/assets/pessoais.enc.json.
// Imprime a chave: o link dela é  https://<site>/#<chave>  (guarde a chave; sem ela não há como recuperar).
import { readFileSync, writeFileSync } from "node:fs";
import { cifrar, novaChave } from "../site/assets/cripto.js";

const entrada = process.argv[2] ?? "pessoais.txt";
const palavras = readFileSync(entrada, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
if (!palavras.length) throw new Error(`Nenhuma palavra em ${entrada}`);

const chave = process.env.CHAVE || novaChave();
const saida = new URL("../site/assets/pessoais.enc.json", import.meta.url);
writeFileSync(saida, JSON.stringify(await cifrar(palavras, chave)) + "\n");
console.error(`${palavras.length} palavras cifradas em site/assets/pessoais.enc.json`);
console.log(chave);
