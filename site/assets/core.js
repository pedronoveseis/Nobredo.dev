// Lógica pura (sem DOM), testada em tools/core.test.mjs.

export const INICIO = Date.parse("2026-11-01T00:00:00-03:00");
export const ALVO = Date.parse("2026-11-22T16:00:00-03:00");

// 0 antes de INICIO, 1 em ALVO, linear no meio.
export function fracao(agora, inicio = INICIO, alvo = ALVO) {
  return Math.min(1, Math.max(0, (agora - inicio) / (alvo - inicio)));
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Permutação 0..n-1, igual em qualquer aparelho para a mesma semente.
export function ordem(n, seed) {
  const rand = mulberry32(seed);
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Troca a ordem das letras; garante resultado diferente quando possível.
export function embaralhar(palavra, seed) {
  const letras = [...palavra];
  if (new Set(letras).size < 2) return palavra;
  const rand = mulberry32(seed);
  let tentativas = 0;
  let out;
  do {
    const a = letras.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    out = a.join("");
  } while (out === palavra && ++tentativas < 8);
  return out;
}

// Quantas palavras já devem estar encaixadas.
export function encaixadas(total, f) {
  return Math.floor(f * total + 1e-9);
}

// Dias, horas, minutos, segundos a partir de milissegundos.
export function partes(ms) {
  const t = Math.max(0, Math.floor(ms / 1000));
  return [Math.floor(t / 86400), Math.floor(t / 3600) % 24, Math.floor(t / 60) % 60, t % 60];
}
