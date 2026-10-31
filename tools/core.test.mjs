import test from "node:test";
import assert from "node:assert/strict";
import { INICIO, ALVO, JUNTOS_DESDE, fracao, curva, ordem, embaralhar, encaixadas, partes } from "../site/assets/core.js";
import { RUIDO } from "../site/assets/ruido.js";
import { readFileSync } from "node:fs";
import { bloqueadasDoArquivo, filtrar, semAcento } from "./importar-ruido.mjs";

test("fração: limites e meio da janela", () => {
  assert.equal(fracao(INICIO - 1), 0);
  assert.equal(fracao(INICIO), 0);
  assert.equal(fracao(ALVO), 1);
  assert.equal(fracao(ALVO + 1e9), 1);
  assert.equal(fracao((INICIO + ALVO) / 2), 0.5);
});

test("datas: início 01/11, alvo 21/11 00h, juntos desde 22/10 (-03:00)", () => {
  assert.equal(new Date(INICIO).toISOString(), "2026-11-01T03:00:00.000Z");
  assert.equal(new Date(ALVO).toISOString(), "2026-11-21T03:00:00.000Z");
  assert.equal(new Date(JUNTOS_DESDE).toISOString(), "2026-10-22T03:00:00.000Z");
});

test("progressiva marca 30 dias no alvo e 31 um dia depois", () => {
  assert.deepEqual(partes(ALVO - JUNTOS_DESDE), [30, 0, 0, 0]);
  assert.deepEqual(partes(ALVO + 86400e3 - JUNTOS_DESDE), [31, 0, 0, 0]);
});

test("curva: extremos, monotônica e lenta no começo", () => {
  assert.equal(curva(0), 0);
  assert.equal(curva(1), 1);
  assert.ok(curva(0.5) < 0.15);
  for (let f = 0; f < 1; f += 0.05) assert.ok(curva(f + 0.05) >= curva(f));
});

test("ruído: entre 900 e 1000 palavras de exatamente 4 letras, sem repetição", () => {
  assert.ok(RUIDO.length >= 900 && RUIDO.length <= 1000);
  assert.ok(RUIDO.every((p) => [...p].length === 4));
  assert.equal(new Set(RUIDO).size, RUIDO.length);
});

test("ruído: nenhuma palavra da lista de bloqueadas (nem a palavra final)", () => {
  const nega = new Set(bloqueadasDoArquivo(readFileSync(new URL("./bloqueadas.txt", import.meta.url), "utf8")).map(semAcento));
  assert.ok(nega.size > 10);
  assert.deepEqual(RUIDO.filter((p) => nega.has(semAcento(p))), []);
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

test("importador: filtra tamanho, maiúsculas, abreviações, duplicatas e bloqueadas", () => {
  const { ficam, fora } = filtrar(["amor", "Davi", "P.S.", "casa", "casa", "ÓDIO", "ódio", "abc", "ação", "você"], ["odio", "voce"]);
  assert.deepEqual(ficam, ["amor", "casa", "ação"]);
  assert.deepEqual(fora, ["Davi", "P.S.", "casa", "ÓDIO", "ódio", "abc", "você"]);
});
