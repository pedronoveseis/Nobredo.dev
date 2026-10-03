"use strict";

const token = location.pathname.split("/")[2];
const POLL_MS = 30_000;

let state = null;
let clockOffset = 0; // servidor - cliente, para a contagem não depender do relógio dela
let dropsSignature = "";
let reloadPending = false;

const $ = (id) => document.getElementById(id);

async function load() {
  reloadPending = false;
  try {
    const res = await fetch(`/api/p/${encodeURIComponent(token)}/state`, { cache: "no-store" });
    if (!res.ok) return;
    state = await res.json();
    clockOffset = Date.parse(state.serverNow) - Date.now();
    render();
    tick();
  } catch (_) {
    /* sem rede: mantém o que já está na tela */
  }
}

function render() {
  const { phase } = state;
  $("countdown").hidden = phase !== "COUNTDOWN";
  $("final").hidden = phase === "COUNTDOWN" || !state.finalScene;
  $("together").hidden = phase !== "TOGETHER";
  $("garden").hidden = state.drops.length === 0;

  renderDrops();
  if (phase !== "COUNTDOWN" && state.finalScene) renderFinalScene(state.finalScene);
}

function renderDrops() {
  const signature = state.drops.map((d) => d.id).join(",");
  if (signature === dropsSignature) return;
  dropsSignature = signature;

  const list = $("drops");
  list.replaceChildren(...state.drops.map(renderDrop));
}

// Um renderizador por tipo de drop. Tipo novo = entrada nova aqui.
const renderers = {
  texto: (p) => el("p", p.text),
  flor: (p) => frag(el("p", p.name, "flower-name"), p.note && el("p", p.note)),
  coordenada: (p) => frag(el("p", `${p.lat}, ${p.lng}`, "coords"), p.note && el("p", p.note)),
  gif: (p) => image(p),
  imagem: (p) => image(p),
};

function renderDrop(drop) {
  const li = document.createElement("li");
  li.className = "drop";
  const render = renderers[drop.kind] ?? ((p) => (p.text ? el("p", p.text) : null));
  const body = render(drop.payload ?? {});
  if (body) li.append(body);
  if (drop.hint) li.append(el("p", drop.hint, "hint"));
  return li;
}

function renderFinalScene(scene) {
  const target = $("final-scene");
  const word = String(scene.word ?? "");
  if (target.dataset.word === word) return;
  target.dataset.word = word;
  target.style.setProperty("--n", String([...word].length));
  target.replaceChildren(
    ...[...word].map((letter, i) => {
      const span = el("span", letter);
      span.style.animationDelay = `${i * 0.35}s`;
      return span;
    }),
  );
  target.setAttribute("aria-label", word);
}

function tick() {
  if (!state) return;
  const now = Date.now() + clockOffset;

  if (state.phase === "COUNTDOWN") {
    const target = Date.parse(state.targetAt);
    drawClock($("countdown-clock"), target - now);
    if (now >= target && !reloadPending) {
      reloadPending = true;
      setTimeout(load, 500);
    }
  } else if (state.phase === "TOGETHER" && state.togetherSince) {
    drawClock($("together-clock"), now - Date.parse(state.togetherSince));
  }
}

function drawClock(node, ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const parts = [
    [Math.floor(total / 86400), "dias"],
    [Math.floor(total / 3600) % 24, "horas"],
    [Math.floor(total / 60) % 60, "min"],
    [total % 60, "seg"],
  ];
  if (node.children.length !== parts.length) {
    node.replaceChildren(
      ...parts.map(() => {
        const unit = el("div", null, "unit");
        unit.append(el("span", "", "value"), el("span", "", "label"));
        return unit;
      }),
    );
  }
  parts.forEach(([value, label], i) => {
    const [v, l] = node.children[i].children;
    v.textContent = String(value).padStart(2, "0");
    l.textContent = label;
  });
}

// Helpers: sempre textContent, nunca innerHTML.
function el(tag, text, className) {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  if (className) node.className = className;
  return node;
}

function frag(...nodes) {
  const f = document.createDocumentFragment();
  nodes.filter(Boolean).forEach((n) => f.append(n));
  return f;
}

function image(p) {
  const src = String(p.src ?? "");
  if (!src.startsWith("/media/") && !src.startsWith("https://")) return null;
  const img = document.createElement("img");
  img.src = src;
  img.alt = p.alt ?? "";
  img.loading = "lazy";
  return img;
}

load();
setInterval(load, POLL_MS);
setInterval(tick, 1000);
