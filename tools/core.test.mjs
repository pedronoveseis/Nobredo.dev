import test from "node:test";
import assert from "node:assert/strict";
import { INICIO, ALVO, fracao, ordem, embaralhar, encaixadas, partes } from "../site/assets/core.js";

test("fração: limites e meio da janela", () => {
  assert.equal(fracao(INICIO - 1), 0);
  assert.equal(fracao(INICIO), 0);
  assert.equal(fracao(ALVO), 1);
  assert.equal(fracao(ALVO + 1e9), 1);
  assert.equal(fracao((INICIO + ALVO) / 2), 0.5);
});

test("janela: 01/11 00h até 22/11 16h (-03:00)", () => {
  assert.equal(new Date(INICIO).toISOString(), "2026-11-01T03:00:00.000Z");
  assert.equal(new Date(ALVO).toISOString(), "2026-11-22T19:00:00.000Z");
});

test("ordem: permutação determinística", () => {
  const a = ordem(278, 4);
  assert.deepEqual(a, ordem(278, 4));
  assert.notDeepEqual(a, ordem(278, 5));
  assert.deepEqual([...a].sort((x, y) => x - y), Array.from({ length: 278 }, (_, i) => i));
});

test("embaralhar: mesmas letras, determinístico, diferente do original", () => {
  const e = embaralhar("girassol", 7);
  assert.equal(e, embaralhar("girassol", 7));
  assert.notEqual(e, "girassol");
  assert.deepEqual([...e].sort(), [..."girassol"].sort());
  assert.equal(embaralhar("a", 1), "a");
});

test("encaixadas: 0 no início e todas no alvo", () => {
  assert.equal(encaixadas(278, 0), 0);
  assert.equal(encaixadas(278, 1), 278);
  assert.equal(encaixadas(278, 0.5), 139);
});

test("partes", () => {
  assert.deepEqual(partes(86400e3 + 3600e3 + 60e3 + 5e3), [1, 1, 1, 5]);
  assert.deepEqual(partes(-5), [0, 0, 0, 0]);
});
