import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { gerarNuvem, planejarNuvens, maxNuvens, atribuir, posicao, estufar, faixas, misturar, PALETAS } from "../site/assets/nuvens.js";

test("gerarNuvem: determinística e com largura 1 centrada", () => {
  assert.deepEqual(gerarNuvem(7), gerarNuvem(7));
  assert.notDeepEqual(gerarNuvem(7), gerarNuvem(8));
  for (let s = 1; s < 40; s++) {
    const { circulos, aspecto } = gerarNuvem(s);
    const x0 = Math.min(...circulos.map((o) => o.x - o.r)), x1 = Math.max(...circulos.map((o) => o.x + o.r));
    assert.ok(Math.abs(x1 - x0 - 1) < 1e-9 && Math.abs(x0 + x1) < 1e-9, `largura/centro (semente ${s})`);
    assert.ok(aspecto > 0.3 && aspecto < 0.8, `aspecto ${aspecto} (semente ${s})`);
    assert.deepEqual([...new Set(circulos.map((o) => o.tom))].sort(), [0, 1, 2]);
    assert.ok(circulos.every((o) => o.d >= 0 && o.d <= 1 && o.r > 0));
  }
});

test("planejarNuvens: quantidade por tela, dentro da tela no início, mesma forma por índice", () => {
  assert.equal(maxNuvens(390, 844), 12);
  assert.equal(maxNuvens(1440, 900), 16);
  assert.equal(maxNuvens(360, 640), 8);
  for (const [W, H] of [[390, 844], [856, 1028], [1440, 900]]) {
    const l = planejarNuvens(W, H);
    assert.equal(l.length, maxNuvens(W, H));
    for (const nv of l) {
      assert.ok(nv.cx0 - nv.w / 2 >= -nv.w * 0.2 && nv.cx0 + nv.w / 2 <= W + nv.w * 0.2);
      assert.ok(nv.cy >= 0 && nv.cy <= H);
      assert.ok(nv.vel >= 6 && nv.vel <= 33);
    }
  }
  assert.deepEqual(planejarNuvens(390, 844), planejarNuvens(390, 844));
});

test("posicao: deriva para a direita e reentra do outro lado", () => {
  const nv = planejarNuvens(390, 844)[0];
  const a = posicao(nv, 0, 0, 0), b = posicao(nv, 1, 0, 0);
  assert.ok(b.cx > a.cx);
  const volta = posicao(nv, nv.span / nv.vel, 0, 0);
  assert.ok(Math.abs(volta.cx - a.cx) < 1e-6);
  for (let t = 0; t < 200; t += 3) {
    const { cx } = posicao(nv, t, t);
    assert.ok(cx >= nv.xmin && cx <= nv.xmin + nv.span);
  }
});

test("atribuir: toda palavra vai para uma nuvem, sem estourar a capacidade", () => {
  const nuvens = planejarNuvens(390, 844);
  const pontos = Array.from({ length: 300 }, (_, i) => ({ x: (i * 37) % 390, y: (i * 91) % 844 }));
  const d = atribuir(pontos, nuvens);
  assert.equal(d.length, 300);
  assert.ok(d.every((c) => c >= 0 && c < nuvens.length));
  const area = nuvens.map((n) => n.w * n.h), soma = area.reduce((a, b) => a + b, 0);
  nuvens.forEach((_, c) => assert.ok(d.filter((x) => x === c).length <= Math.ceil((300 * area[c]) / soma) + 1));
});

test("estufar: 0 → 1 com leve overshoot", () => {
  assert.equal(estufar(0), 0);
  assert.equal(estufar(1), 1);
  assert.ok(Math.max(...Array.from({ length: 100 }, (_, i) => estufar(i / 100))) > 1);
});

test("nuvens.js não carrega nada pessoal", () => {
  const src = readFileSync(new URL("../site/assets/nuvens.js", import.meta.url), "utf8");
  const pessoais = readFileSync(new URL("../site/assets/pessoais.txt", import.meta.url), "utf8").split(/\r?\n/).map((l) => l.trim().toLowerCase()).filter((l) => l.length > 3);
  assert.deepEqual(pessoais.filter((p) => src.toLowerCase().includes(p)), []);
});

test("faixas: permutação, e qualquer prefixo fica espalhado pela altura", () => {
  for (const n of [5, 7, 10]) {
    const f = faixas(n);
    assert.deepEqual([...f].sort((a, b) => a - b), Array.from({ length: n }, (_, i) => i));
    for (let k = 3; k <= n; k++) {
      const alt = f.slice(0, k).sort((a, b) => a - b);
      const maiorBuraco = Math.max(alt[0] + 1, n - alt[k - 1], ...alt.slice(1).map((v, i) => v - alt[i]));
      assert.ok(maiorBuraco <= Math.ceil((2.2 * n) / k), `buraco ${maiorBuraco} com ${k} de ${n}`);
    }
  }
});

test("formas por índice não dependem de quantas nuvens a tela comporta", () => {
  const a = planejarNuvens(390, 844), b = planejarNuvens(1440, 900);
  assert.deepEqual(a[0].circulos.map((o) => o.tom), b[0].circulos.map((o) => o.tom));
});

test("misturar: extremos e meio", () => {
  const { creme, noite } = PALETAS;
  assert.deepEqual(misturar(creme, noite, 0), creme);
  assert.deepEqual(misturar(creme, noite, 1).tons, noite.tons);
  assert.equal(misturar(creme, noite, 1).texto, noite.texto);
  const meio = misturar(creme, noite, 0.5);
  assert.ok(meio.tons.every((t) => /^#[0-9a-f]{6}$/.test(t)));
  assert.notEqual(meio.tons[0], creme.tons[0]);
  assert.deepEqual(misturar(creme, noite, 9).tons, noite.tons);
});
