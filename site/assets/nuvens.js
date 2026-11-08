// Nuvens: cada uma é um aglomerado de círculos (como a referência "Rainy cloud") com uma palavra de ruído no
// centro. Lógica pura (sem DOM), testada em tools/nuvens.test.mjs. Nada pessoal aqui: repositório público.
import { mulberry32 } from "./core.js";

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const ESCALA_NUVEM = 0.5625; // tamanho das nuvens (e da palavra do centro) em relação ao tamanho-base

// Tons do mais claro (na frente) ao mais escuro (atrás). `texto` é a cor da palavra no centro.
export const PALETAS = {
  creme: { tons: ["#f6ead0", "#efdeb3", "#d9c496"], texto: "#5d5048", sombra: "rgba(0,0,0,.18)" },
  noite: { tons: ["#b3a07a", "#9a8968", "#7d6f58"], texto: "#352c27", sombra: "rgba(0,0,0,.18)" },
  azul: { tons: ["#ffffff", "#f5f5f5", "#ebebeb"], texto: "#0e5f96", sombra: "rgba(14,126,198,.55)" },
};

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const mistura = (a, b, f) => "#" + hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * f).toString(16).padStart(2, "0")).join("");

// Paleta entre `a` (f = 0) e `b` (f = 1): a transição dia ↔ noite.
export function misturar(a, b, f) {
  const k = clamp(f, 0, 1);
  return { tons: a.tons.map((t, i) => mistura(t, b.tons[i], k)), texto: mistura(a.texto, b.texto, k), sombra: a.sombra };
}

// Sobe de 0 a 1 passando um pouco de 1 (a nuvem "estufa" e assenta).
export function estufar(p) {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const c1 = 1.9, c3 = c1 + 1;
  return 1 + c3 * (p - 1) ** 3 + c1 * (p - 1) ** 2;
}

// Aglomerado de círculos { x, y, r, tom, d } com largura total 1 e centro em (0, 0).
// `d` (0..1) é a distância ao centro: a ordem em que os círculos estufam. Determinístico por semente.
export function gerarNuvem(seed) {
  const rnd = mulberry32(seed);
  const colunas = 4 + Math.floor(rnd() * 2); // 4 ou 5 (como a referência)
  const xs = [];
  let x = 0;
  for (let i = 0; i < colunas; i++) { xs.push(x); x += 1.55 * (0.9 + 0.2 * rnd()); }
  const rs = xs.map((_, i) => (1 - Math.abs(i / (colunas - 1) - 0.5) * 0.5) * (0.88 + 0.24 * rnd()));

  const c = [];
  for (let i = 0; i < colunas; i++) c.push({ x: xs[i], y: (rnd() - 0.5) * 0.16, r: rs[i], tom: 0 });
  const alto = 0.75 + 0.3 * rnd(), baixo = 0.55 + 0.3 * rnd();
  for (let i = 0; i < colunas - 1; i++) {
    const xm = (xs[i] + xs[i + 1]) / 2, r = ((rs[i] + rs[i + 1]) / 2) * 0.95;
    c.push({ x: xm, y: -0.5 * r, r, tom: 1 }, { x: xm, y: 0.5 * r, r, tom: 1 });
  }
  for (let i = 1; i < colunas - 1; i++) {
    c.push({ x: xs[i], y: -rs[i] * alto, r: rs[i] * (0.9 + 0.2 * rnd()), tom: 2 });
    c.push({ x: xs[i], y: rs[i] * baixo, r: rs[i] * (0.9 + 0.2 * rnd()), tom: 2 });
  }

  const x0 = Math.min(...c.map((o) => o.x - o.r)), x1 = Math.max(...c.map((o) => o.x + o.r));
  const y0 = Math.min(...c.map((o) => o.y - o.r)), y1 = Math.max(...c.map((o) => o.y + o.r));
  const k = 1 / (x1 - x0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const out = c.map((o) => ({ x: (o.x - cx) * k, y: (o.y - cy) * k, r: o.r * k, tom: o.tom }));
  const dmax = Math.max(...out.map((o) => Math.hypot(o.x, o.y)));
  out.forEach((o) => (o.d = Math.hypot(o.x, o.y) / dmax));
  return { circulos: out, aspecto: (y1 - y0) * k }; // aspecto = altura / largura
}

// Quantas nuvens cabem na tela (o conjunto completo; o tempo liga só as primeiras).
export function maxNuvens(W, H) {
  return clamp(Math.round((W * H) / 45000), 5, 10);
}

// Faixa vertical de cada nuvem: ranking de frac((i + 0.5) * phi). Qualquer prefixo (3, 4, 5... nuvens) fica
// bem espalhado pela altura, então ligar ou desligar nuvens não deixa buracos nem amontoa.
export function faixas(n) {
  const chave = Array.from({ length: n }, (_, i) => ((i + 0.5) * 0.6180339887498949) % 1);
  const ordenado = chave.map((c, i) => [c, i]).sort((a, b) => a[0] - b[0]);
  const rank = new Array(n);
  ordenado.forEach(([, i], r) => (rank[i] = r));
  return rank;
}

// Layout do conjunto completo: faixas verticais (cobrem a altura toda, o relógio inclusive), larguras
// variadas, velocidade menor nas maiores. `cx0, cy` é a posição inicial (visível); depois vai à deriva.
export function planejarNuvens(W, H, seed = 61) {
  const n = maxNuvens(W, H);
  const rnd = mulberry32(seed);
  const rankFaixa = faixas(n);
  const alturaFaixa = H / n;
  const lista = [];
  for (let i = 0; i < n; i++) {
    const w = clamp(W * (0.26 + 0.24 * rnd()), 120, 340) * ESCALA_NUVEM;
    const nuvem = gerarNuvem(seed * 101 + i);
    const h = w * nuvem.aspecto;
    const folga = w / 2 + 20;
    lista.push({
      ...nuvem,
      w, h,
      cx0: clamp(((i + 0.2 + 0.6 * rnd()) / n) * W, w * 0.35, W - w * 0.35),
      cy: (rankFaixa[i] + 0.5) * alturaFaixa + (rnd() - 0.5) * alturaFaixa * 0.5,
      vel: clamp(2800 / w, 8, 28) * (0.85 + 0.3 * rnd()),
      periodoBob: 3 + 2 * rnd(),
      faseBob: rnd() * Math.PI * 2,
      xmin: -folga,
      span: W + 2 * folga,
    });
  }
  return lista;
}

// Posição da nuvem depois de `t` segundos de deriva; `bob` (0..1) liga o flutuar.
export function posicao(nv, t, tBob, bob = 1) {
  const cx = ((((nv.cx0 - nv.xmin + nv.vel * t) % nv.span) + nv.span) % nv.span) + nv.xmin;
  const cy = nv.cy + Math.sin((tBob / nv.periodoBob) * Math.PI * 2 + nv.faseBob) * nv.h * 0.1 * bob;
  return { cx, cy };
}

// Distribui as palavras de ruído entre as nuvens: a mais próxima, respeitando a capacidade (proporcional à área).
// Devolve, por ponto, o índice da nuvem.
export function atribuir(pontos, nuvens) {
  const area = nuvens.map((nv) => nv.w * nv.h);
  const soma = area.reduce((a, b) => a + b, 0);
  const cap = area.map((a) => Math.ceil((pontos.length * a) / soma) + 1);
  const uso = nuvens.map(() => 0);
  return pontos.map((p) => {
    let melhor = -1, dm = Infinity;
    nuvens.forEach((nv, c) => {
      if (uso[c] >= cap[c]) return;
      const d = Math.hypot(p.x - nv.cx0, p.y - nv.cy);
      if (d < dm) { dm = d; melhor = c; }
    });
    if (melhor < 0) melhor = 0;
    uso[melhor]++;
    return melhor;
  });
}

// Desenha a nuvem em (cx, cy). `u` (0..1) é o quanto ela já estufou; `alfa` a opacidade geral.
export function desenharNuvem(ctx, nv, cx, cy, u, paleta, alfa = 1) {
  if (u <= 0) return;
  ctx.globalAlpha = alfa;
  for (let tom = 2; tom >= 0; tom--) {
    ctx.fillStyle = paleta.tons[tom];
    for (const o of nv.circulos) {
      if (o.tom !== tom) continue;
      const e = estufar(clamp((u - o.d * 0.45) / 0.55, 0, 1));
      if (e <= 0) continue;
      ctx.beginPath();
      ctx.arc(cx + o.x * nv.w, cy + o.y * nv.w, Math.max(0, o.r * nv.w * e), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function desenharSombra(ctx, nv, cx, cy, paleta, alfa = 1) {
  ctx.globalAlpha = alfa;
  ctx.fillStyle = paleta.sombra;
  ctx.beginPath();
  ctx.ellipse(cx, cy + nv.h / 2 + nv.h * 0.55, nv.w * 0.36, nv.h * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
}
