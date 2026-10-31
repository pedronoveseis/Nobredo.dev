import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = (nome) => readFileSync(new URL(`../site/assets/${nome}`, import.meta.url), "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

test("pessoais.txt: há palavras e todas são uma palavra só", () => {
  const lista = ler("pessoais.txt");
  assert.ok(lista.length >= 30, "poucas palavras");
  assert.deepEqual(lista.filter((p) => /\s/.test(p)), []);
});

test("palavra-final.txt: exatamente uma palavra", () => {
  const lista = ler("palavra-final.txt");
  assert.equal(lista.length, 1);
  assert.ok(!/\s/.test(lista[0]));
});
