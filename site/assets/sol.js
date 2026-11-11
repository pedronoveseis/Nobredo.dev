// O sol de palavras: um disco e 10 raios que giram devagar (referência: CodePen "Sun Ray Effect CSS", de abuzar).
// Lógica pura (sem DOM), testada em tools/sol.test.mjs. O desenho fica em app.js.
import { fracao, empacotar, mulberry32 } from "./core.js";

export const SOL_INICIO = Date.parse("2026-11-11T08:00:00-03:00"); // as primeiras palavras vão para o sol
export const SOL_FIM = Date.parse("2026-11-15T00:00:00-03:00"); // sol completo
export const VOLTA_MS = 120000; // os raios dão uma volta em 120 s, como no pen

// 0 antes de SOL_INICIO, 1 em SOL_FIM, linear no meio.
export const fracaoSol = (agora) => fracao(agora, SOL_INICIO, SOL_FIM);

// Os 10 raios do pen: ângulo (graus), comprimento e largura originais (px do pen). Disco de 70 px.
export const RAIOS = [
  { ang: 180, comp: 170, larg: 30 },
  { ang: 220, comp: 100, larg: 8 },
  { ang: 250, comp: 170, larg: 50 },
  { ang: 305, comp: 120, larg: 14 },
  { ang: -15, comp: 140, larg: 30 },
  { ang: 30, comp: 90, larg: 50 },
  { ang: 70, comp: 180, larg: 10 },
  { ang: 100, comp: 120, larg: 30 },
  { ang: 120, comp: 80, larg: 10 },
  { ang: 150, comp: 190, larg: 23 },
];

// Quantas faixas de palavras cabem na largura do raio (1 a 3).
export const faixasDoRaio = (larg) => (larg <= 12 ? 1 : larg <= 32 ? 2 : 3);

// Giro dos raios (radianos) no instante t (ms).
export const giro = (t) => 2 * Math.PI * ((((t % VOLTA_MS) + VOLTA_MS) % VOLTA_MS) / VOLTA_MS);

// Centro, disco e raios para uma área W × util. Os raios nascem logo fora do disco e vão de 40% a 100% do alcance,
// proporcionais ao comprimento do pen (80 a 190).
export function geometriaSol(W, util, f) {
  const m = Math.min(W, util);
  const Rd = m * 0.2;
  const r0 = Rd * 1.12;
  const alcance = m * 0.46 - r0;
  const passo = f * 1.15;
  const raios = RAIOS.map((r, k) => {
    const comp = alcance * (0.4 + 0.6 * ((r.comp - 80) / 110));
    return { k, ang: (r.ang * Math.PI) / 180, r0, rFim: r0 + comp, faixas: faixasDoRaio(r.larg) };
  });
  return { cx: W / 2, cy: util / 2, Rd, r0, passo, raios };
}

// Preenche o disco (linhas) e cada raio (faixas) com as palavras, na ordem dada. `larguras[i]` é a largura da palavra
// i; `candidatas` é a ordem em que as palavras são usadas (cada uma no máximo uma vez). Reusa `empacotar`, que
// justifica as faixas. Devolve [{ i, w, tipo, raio, u, v, r }]: u,v é o CENTRO da palavra; no disco são x,y
// relativos ao centro do sol; no raio, u é a distância ao centro ao longo do raio e v o deslocamento lateral.
export function preencherSol(geo, larguras, candidatas, f) {
  const { Rd, passo, raios } = geo;
  const folga = f * 0.4;
  const pend = [];
  let k = 0;
  const gerar = () => candidatas[k++]; // acabando as palavras, `undefined` não cabe em lugar nenhum
  const slots = [];
  const faixa = (L, mk) => {
    for (const it of empacotar(larguras, pend, gerar, L, folga, 12, f * 1.2)) slots.push({ i: it.i, w: larguras[it.i], ...mk(it.x + larguras[it.i] / 2) });
  };
  // disco: linhas horizontais, palavras em pé
  const n = Math.floor((2 * Rd) / passo);
  for (let j = 0; j < n; j++) {
    const y = (j - (n - 1) / 2) * passo;
    const meia = Math.sqrt(Math.max(0, Rd * Rd - (Math.abs(y) + f * 0.5) ** 2));
    const L = 2 * meia - folga;
    if (L <= 0) continue;
    const ini = -meia + folga / 2;
    faixa(L, (c) => ({ tipo: "disco", raio: -1, u: ini + c, v: y, r: Math.hypot(ini + c, y) }));
  }
  // raios: faixas ao longo do raio; as laterais são um pouco mais curtas (ponta arredondada, como no pen)
  for (const rg of raios) {
    for (let j = 0; j < rg.faixas; j++) {
      const d = j - (rg.faixas - 1) / 2;
      const v = d * passo;
      const fim = rg.r0 + (rg.rFim - rg.r0) * (1 - 0.18 * Math.abs(d));
      const L = fim - rg.r0;
      faixa(L, (c) => ({ tipo: "raio", raio: rg.k, u: rg.r0 + c, v, r: Math.hypot(rg.r0 + c, v) }));
    }
  }
  return slots;
}

// Ordem de entrada: do miolo para fora (menor distância ao centro entra primeiro), com um pouco de sorteio.
// Devolve rank[j] (0 = primeiro) para cada slot j.
export function ordemEntrada(slots, geo, seed) {
  const rand = mulberry32(seed);
  const chave = slots.map((s, j) => ({ j, c: s.r + (rand() - 0.5) * geo.Rd * 0.2 }));
  chave.sort((a, b) => a.c - b.c);
  const rank = new Array(slots.length);
  chave.forEach((o, r) => (rank[o.j] = r));
  return rank;
}

// Posição do CENTRO da palavra e ângulo do texto no instante em que os raios giraram `rot` radianos.
// No disco: parado e em pé. No raio: gira com o raio, e o texto vira de cabeça para cima para continuar legível.
export function posicaoSol(slot, geo, rot) {
  if (slot.tipo === "disco") return { x: geo.cx + slot.u, y: geo.cy + slot.v, ang: 0 };
  const a = geo.raios[slot.raio].ang + rot;
  const c = Math.cos(a), s = Math.sin(a);
  const ang = c < 0 ? a + Math.PI : a;
  return { x: geo.cx + slot.u * c - slot.v * s, y: geo.cy + slot.u * s + slot.v * c, ang: ((ang + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI };
}
