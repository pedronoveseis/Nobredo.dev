import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const ler = (nome) => readFileSync(new URL(`../site/assets/${nome}`, import.meta.url), "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

test("pessoais.txt: 44 palavras únicas, cada uma 5 vezes (expressões podem ter espaços, sem espaços sobrando)", () => {
  const lista = ler("pessoais.txt");
  assert.ok(lista.length >= 30, "poucas palavras");
  assert.deepEqual(lista.filter((p) => /\s\s/.test(p)), []);
  const cont = new Map();
  for (const p of lista) cont.set(p, (cont.get(p) ?? 0) + 1);
  assert.equal(cont.size, 44);
  assert.deepEqual([...cont].filter(([, n]) => n !== 5).map(([p]) => p), []);
  assert.ok(cont.has("flores do campo"));
});

test("palavra-final.txt: exatamente uma palavra", () => {
  const lista = ler("palavra-final.txt");
  assert.equal(lista.length, 1);
  assert.ok(!/\s/.test(lista[0]));
});
