import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const raiz = new URL("../site/", import.meta.url).pathname;
const arquivos = (dir) =>
  readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? arquivos(join(dir, n)) : [join(dir, n)]));

test("site/ não contém a palavra final em texto (nem com ou sem acento)", () => {
  const achados = arquivos(raiz).filter((f) => /voc[êe]/i.test(readFileSync(f, "utf8").normalize("NFC")));
  assert.deepEqual(achados, []);
});

test("site/ não contém nenhuma palavra pessoal local (pessoais.txt) nem a palavra final local", () => {
  const raizRepo = new URL("../", import.meta.url).pathname;
  const lista = ["pessoais.txt", "palavra-final.txt"]
    .filter((n) => existsSync(join(raizRepo, n)))
    .flatMap((n) => readFileSync(join(raizRepo, n), "utf8").split(/\r?\n/).map((l) => l.trim().toLowerCase()).filter((l) => l.length > 3));
  const texto = arquivos(raiz).filter((f) => !f.endsWith("ruido.js")).map((f) => readFileSync(f, "utf8").toLowerCase()).join("\n");
  assert.deepEqual(lista.filter((p) => texto.includes(p)), []);
});
