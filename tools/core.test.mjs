import test from "node:test";
import assert from "node:assert/strict";
import { INICIO, ALVO, JUNTOS_DESDE, fracao, curva, ordem, embaralhar, encaixadas, partes, linhasBloco } from "../site/assets/core.js";
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

test("curva: extremos, monotônica e suave", () => {
  assert.equal(curva(0), 0);
  assert.equal(curva(1), 1);
  assert.ok(curva(0.5) > 0.3 && curva(0.5) < 0.5);
  for (let f = 0; f < 1; f += 0.05) assert.ok(curva(f + 0.05) >= curva(f));
});

test("ritmo: toda a virada de dia encaixa palavras novas", () => {
  const DIA = 86400000;
  for (let t = INICIO; t < ALVO; t += DIA) {
    const novas = encaixadas(500, curva(fracao(t + DIA))) - encaixadas(500, curva(fracao(t)));
    assert.ok(novas >= 5, `dia ${new Date(t).toISOString()}: só ${novas}`);
  }
});

test("bloco: mantém a ordem, cabe na largura e justifica as linhas cheias", () => {
  const w = Array.from({ length: 40 }, (_, i) => 20 + (i % 5) * 7);
  const L = 200, folga = 5;
  const pos = linhasBloco(w, L, folga);
  assert.equal(pos.length, w.length);
  const linhas = new Map();
  pos.forEach((p, i) => { if (!linhas.has(p.linha)) linhas.set(p.linha, []); linhas.get(p.linha).push(i); });
  for (const [, idx] of linhas) {
    for (const i of idx) assert.ok(pos[i].x >= -1e-6 && pos[i].x + w[i] <= L + 1e-6);
    for (let k = 1; k < idx.length; k++) assert.ok(pos[idx[k]].x >= pos[idx[k - 1]].x + w[idx[k - 1]] + folga - 1e-6);
  }
  const cheias = [...linhas.values()].slice(0, -1);
  for (const idx of cheias) { const u = idx[idx.length - 1]; assert.ok(Math.abs(pos[u].x + w[u] - L) < 1e-6); }
  assert.deepEqual(linhasBloco([], 100, 5), []);
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

test("empacotar: respeita o trecho, cola as pontas e usa todas as palavras", async () => {
  const { empacotar } = await import("../site/assets/core.js");
  const larguras = [30, 55, 22, 70, 40, 18, 62, 35, 26, 48];
  let k = 0;
  const gerar = () => k++ % larguras.length;
  const pend = [];
  const usadas = new Set();
  for (let linha = 0; linha < 40; linha++) {
    const L = 200 + (linha % 5) * 17;
    const itens = empacotar(larguras, pend, gerar, L, 6, 12, 14);
    for (const it of itens) usadas.add(it.i);
    assert.ok(itens.length > 0);
    const ultimo = itens.at(-1);
    assert.ok(itens[0].x >= -1e-9, "começa dentro do trecho");
    assert.ok(ultimo.x + larguras[ultimo.i] <= L + 1e-9, "termina dentro do trecho");
    if (itens.length > 1 && (L - itens.reduce((s, it) => s + larguras[it.i], 0) - 6 * (itens.length - 1)) / (itens.length - 1) <= 14) {
      assert.ok(itens[0].x < 1e-9 && L - (ultimo.x + larguras[ultimo.i]) < 1e-6, "pontas coladas quando justificável");
    }
  }
  assert.equal(usadas.size, larguras.length);
});
