import { INICIO, ALVO, fracao, ordem, embaralhar, encaixadas, partes } from "./core.js";
import { WORDS } from "./words.js";

const SEED_SLOTS = 4;   // ordem das palavras dentro da forma
const SEED_REVEAL = 22; // ordem em que as palavras se encaixam
const RODAPE = 120;     // espaço reservado ao relógio (px)

// ?data=2026-11-10T12:00:00-03:00 simula outra data (o tempo segue correndo a partir dela).
const simulada = Date.parse(new URLSearchParams(location.search).get("data") ?? "");
const deslocamento = Number.isNaN(simulada) ? 0 : simulada - Date.now();
const agora = () => Date.now() + deslocamento;

const reduzido = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canvas = document.getElementById("stage");
const ctx = canvas.getContext("2d");
const css = getComputedStyle(document.documentElement);
const cor = (n) => css.getPropertyValue(n).trim();

const palavras = ordem(WORDS.length, SEED_SLOTS).map((i) => WORDS[i]);
const rank = new Array(palavras.length); // rank[i] = posição de encaixe da palavra i
ordem(palavras.length, SEED_REVEAL).forEach((idx, r) => (rank[idx] = r));

let W = 0, H = 0, fonte = 8;
let itens = []; // { texto, slot:{x,y}, base:{x,y}, fase, periodo, p }

// ---------- forma VOCÊ ----------
function mascara() {
  const retrato = W < H;
  const linhas = retrato ? ["VO", "CÊ"] : ["VOCÊ"];
  const area = { w: W * 0.92, h: H - RODAPE - 24 };
  const off = document.createElement("canvas");
  off.width = W; off.height = H;
  const c = off.getContext("2d", { willReadFrequently: true });
  const familia = cor("--font-body");
  let tam = 200;
  c.font = `900 ${tam}px ${familia}`;
  const largura = Math.max(...linhas.map((l) => c.measureText(l).width));
  tam = Math.min(tam * (area.w / largura), (area.h / linhas.length) / 1.0);
  c.font = `900 ${tam}px ${familia}`;
  c.textAlign = "center";
  c.textBaseline = "alphabetic";
  c.fillStyle = c.strokeStyle = "#000";
  c.lineJoin = "round";
  c.lineWidth = tam * 0.09; // engrossa as letras para caberem mais palavras
  const alturaTotal = tam * 0.82 * linhas.length + tam * 0.18 * (linhas.length - 1);
  let y = (area.h - alturaTotal) / 2 + 24 / 2 + tam * 0.82 + tam * 0.1;
  for (const l of linhas) {
    c.fillText(l, W / 2, y);
    c.strokeText(l, W / 2, y);
    y += tam * 1.0;
  }
  const px = c.getImageData(0, 0, W, H).data;
  const m = new Uint8Array(W * H);
  for (let i = 0; i < m.length; i++) m[i] = px[i * 4 + 3] > 128 ? 1 : 0;
  return m;
}

function cabe(m, x, y, w, h) {
  const x0 = Math.floor(x), x1 = Math.min(W - 1, Math.ceil(x + w));
  if (x0 < 0 || x1 >= W) return false;
  for (const yy of [y - h / 2, y, y + h / 2]) {
    const row = Math.floor(yy) * W;
    if (yy < 0 || yy >= H) return false;
    for (let xx = x0; xx <= x1; xx += 2) if (!m[row + xx]) return false;
    if (!m[row + x1]) return false;
  }
  return true;
}

// Preenche a forma com as palavras em linhas; devolve slots (por palavra) ou null se não couberem todas.
function preencher(m, f) {
  ctx.font = `${f}px ${cor("--font-body")}`;
  const larguras = palavras.map((p) => ctx.measureText(p).width);
  const folga = f * 0.4;
  const slots = new Array(palavras.length);
  const resto = palavras.map((_, i) => i); // índices ainda sem lugar
  const passo = f * 1.15;
  for (let y = passo; y < H - RODAPE && resto.length; y += passo) {
    let x = 0;
    while (x < W && resto.length) {
      // tenta as próximas palavras da fila: a primeira que cabe neste ponto
      let k = -1;
      for (let c = 0; c < Math.min(40, resto.length); c++) {
        if (cabe(m, x, y, larguras[resto[c]], f * 0.6)) { k = c; break; }
      }
      if (k < 0) { x += 2; continue; }
      const i = resto.splice(k, 1)[0];
      slots[i] = { x, y };
      x += larguras[i] + folga;
    }
  }
  return resto.length === 0 ? slots : null;
}

function montar() {
  const dpr = devicePixelRatio || 1;
  W = innerWidth; H = innerHeight;
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const m = mascara();
  let lo = 3, hi = 40, slots = null;
  for (let i = 0; i < 9; i++) {
    const mid = (lo + hi) / 2;
    const s = preencher(m, mid);
    if (s) { lo = mid; slots = s; } else hi = mid;
  }
  fonte = lo;
  if (!slots) slots = preencher(m, lo) ?? [];

  const antigos = itens;
  const rand = (a) => (Math.sin(a * 127.1) * 43758.5453) % 1;
  itens = palavras.map((texto, i) => ({
    texto,
    slot: slots[i] ?? { x: W / 2, y: H / 2 },
    base: { x: 20 + Math.abs(rand(i + 1)) * (W - 40), y: 20 + Math.abs(rand(i + 77)) * (H - RODAPE - 40) },
    fase: Math.abs(rand(i + 5)) * 6.28,
    periodo: 2500 + Math.abs(rand(i + 9)) * 3500,
    p: antigos[i]?.p ?? null,
  }));
}

// ---------- quadro ----------
let ultimo = performance.now();

function quadro(t) {
  const dt = Math.min(0.1, (t - ultimo) / 1000);
  ultimo = t;
  const f = fracao(agora());
  const feitas = encaixadas(itens.length, f);

  ctx.clearRect(0, 0, W, H);
  ctx.font = `${fonte}px ${cor("--font-body")}`;
  ctx.textBaseline = "middle";

  itens.forEach((it, i) => {
    const alvo = rank[i] < feitas ? 1 : 0;
    if (it.p === null) it.p = alvo; // primeira vez: sem animar o que já estava encaixado
    else it.p += Math.sign(alvo - it.p) * Math.min(Math.abs(alvo - it.p), dt / 1.6);

    const e = it.p * it.p * (3 - 2 * it.p);
    const k = reduzido ? 0 : t / 1000;
    const fx = it.base.x + Math.sin(k * 0.4 + it.fase) * 28;
    const fy = it.base.y + Math.cos(k * 0.33 + it.fase * 1.3) * 22;
    const x = fx + (it.slot.x - fx) * e;
    const y = fy + (it.slot.y - fy) * e;

    let texto = it.texto;
    if (!reduzido && it.p < 1) {
      const emTransito = it.p > 0 && it.p < 0.85;
      const bucket = emTransito ? Math.floor(t / 110) : Math.floor((t + it.fase * 900) / it.periodo);
      const dentro = ((t + it.fase * 900) % it.periodo) / it.periodo;
      if (emTransito || dentro < 0.3) texto = embaralhar(it.texto, bucket * 977 + (it.fase * 1000) | 0);
    }

    ctx.fillStyle = it.p >= 1 ? cor("--color-accent") : cor("--color-muted");
    ctx.globalAlpha = 0.35 + 0.65 * e;
    ctx.fillText(texto, x, y);
  });
  ctx.globalAlpha = 1;

  relogio();
  requestAnimationFrame(quadro);
}

// ---------- relógio ----------
const nos = [];
function relogio() {
  const n = agora();
  const antes = n < ALVO;
  const ms = antes ? ALVO - n : n - ALVO;
  document.getElementById("rotulo").textContent = antes ? "Falta" : "Juntos há";
  const el = document.getElementById("clock");
  const rotulos = ["dias", "horas", "min", "seg"];
  if (!nos.length) {
    rotulos.forEach((r) => {
      const u = document.createElement("div");
      u.className = "unit";
      const v = document.createElement("span"); v.className = "value";
      const l = document.createElement("span"); l.className = "label"; l.textContent = r;
      u.append(v, l);
      el.append(u);
      nos.push(v);
    });
  }
  partes(ms).forEach((v, i) => (nos[i].textContent = String(v).padStart(2, "0")));
}

let redim;
addEventListener("resize", () => { clearTimeout(redim); redim = setTimeout(montar, 150); });
(document.fonts?.ready ?? Promise.resolve()).then(() => { montar(); requestAnimationFrame(quadro); });
