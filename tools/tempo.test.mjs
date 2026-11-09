import test from "node:test";
import assert from "node:assert/strict";
import { normalizarTempo, nuvensParaCobertura, fatorVento, ehDia, cacheValido, lerSimulado, neutro, intensidadeChuva, nuvensComChuva, MIN_NUVENS, URL_TEMPO } from "../site/assets/tempo.js";

const ok = { current: { cloud_cover: 61, wind_speed_10m: 13.1, is_day: 0 } };

test("normalizarTempo: resposta real da Open-Meteo", () => {
  assert.deepEqual(normalizarTempo(ok), { cobertura: 0.61, vento: 13.1, dia: false, chuva: 0 });
  const comChuva = normalizarTempo({ current: { ...ok.current, precipitation: 0.1 } });
  assert.ok(comChuva.chuva > 0.1 && comChuva.chuva < 0.2);
  assert.equal(normalizarTempo({ current: { ...ok.current, precipitation: "abc" } }).chuva, 0);
  assert.equal(normalizarTempo({ current: { ...ok.current, precipitation: -2 } }).chuva, 0);
  assert.equal(normalizarTempo({ current: { ...ok.current, is_day: 1 } }).dia, true);
});

test("normalizarTempo: inválido vira null", () => {
  for (const j of [null, {}, { current: {} }, { current: { cloud_cover: "61", wind_speed_10m: 1 } }, { current: { cloud_cover: NaN, wind_speed_10m: 1 } },
    { current: { cloud_cover: 120, wind_speed_10m: 1 } }, { current: { cloud_cover: -1, wind_speed_10m: 1 } }, { current: { cloud_cover: 50, wind_speed_10m: -3 } }, { current: { cloud_cover: 50 } }]) {
    assert.equal(normalizarTempo(j), null, JSON.stringify(j));
  }
  assert.equal(normalizarTempo({ current: { cloud_cover: 50, wind_speed_10m: 900, is_day: 1 } }).vento, 150);
});

test("normalizarTempo: sem is_day usa o horário de São Paulo", () => {
  const meioDia = Date.parse("2026-11-10T12:00:00-03:00"), madrugada = Date.parse("2026-11-10T02:00:00-03:00");
  assert.equal(normalizarTempo({ current: { cloud_cover: 10, wind_speed_10m: 1 } }, meioDia).dia, true);
  assert.equal(normalizarTempo({ current: { cloud_cover: 10, wind_speed_10m: 1 } }, madrugada).dia, false);
});

test("nuvensParaCobertura: céu limpo = mínimo (5), encoberto = máximo, monotônica", () => {
  assert.equal(nuvensParaCobertura(0, 10), MIN_NUVENS);
  assert.equal(nuvensParaCobertura(1, 10), 10);
  assert.equal(nuvensParaCobertura(1, 8), 8);
  assert.equal(MIN_NUVENS, 5);
  assert.equal(nuvensParaCobertura(-3, 10), MIN_NUVENS);
  assert.equal(nuvensParaCobertura(9, 10), 10);
  assert.equal(nuvensParaCobertura(0.5, 2), MIN_NUVENS); // tela pequena demais: nunca abaixo do mínimo
  let ant = 0;
  for (let c = 0; c <= 1; c += 0.05) { const n = nuvensParaCobertura(c, 10); assert.ok(n >= ant); ant = n; }
});

test("fatorVento: calmaria 0,5×, ventania 2,5×", () => {
  assert.equal(fatorVento(0), 0.5);
  assert.equal(fatorVento(1000), 2.5);
  assert.ok(Math.abs(fatorVento(13.1) - 1.155) < 1e-9);
  assert.equal(fatorVento(NaN), 1.1);
});

test("ehDia: 6h–18h em São Paulo, mesmo com o relógio do aparelho em outro fuso", () => {
  assert.equal(ehDia(Date.parse("2026-11-10T05:59:00-03:00")), false);
  assert.equal(ehDia(Date.parse("2026-11-10T06:00:00-03:00")), true);
  assert.equal(ehDia(Date.parse("2026-11-10T17:59:00-03:00")), true);
  assert.equal(ehDia(Date.parse("2026-11-10T18:00:00-03:00")), false);
  assert.equal(ehDia(Date.parse("2026-11-10T12:00:00-03:00")), ehDia(Date.parse("2026-11-10T15:00:00Z")));
});

test("cacheValido: dentro do TTL, vazio, futuro e vencido", () => {
  const d = { cobertura: 0.1, vento: 1, dia: true };
  assert.equal(cacheValido({ t: 1000, dados: d }, 1000 + 60_000), true);
  assert.equal(cacheValido({ t: 1000, dados: d }, 1000 + 31 * 60_000), false);
  assert.equal(cacheValido({ t: 5000, dados: d }, 1000), false);
  for (const e of [null, undefined, {}, { t: 1 }, { dados: d }]) assert.equal(cacheValido(e, 2000), false);
});

test("lerSimulado: só quando algum parâmetro vem na URL", () => {
  assert.equal(lerSimulado(""), null);
  assert.equal(lerSimulado("?data=2026-11-10"), null);
  assert.deepEqual(lerSimulado("?cobertura=0.9&vento=30&noite=1"), { cobertura: 0.9, vento: 30, dia: false, chuva: 0 });
  assert.deepEqual(lerSimulado("?cobertura=7"), { cobertura: 1, vento: 12, dia: true, chuva: 0 });
  assert.equal(lerSimulado("?chuva=0.4").chuva, 0.4);
  assert.equal(lerSimulado("?chuva=9").chuva, 1);
  assert.equal(lerSimulado("?vento=abc").vento, 12);
});

test("neutro e URL: Rio, sem chave, só o necessário", () => {
  assert.equal(neutro(Date.parse("2026-11-10T12:00:00-03:00")).cobertura, 0.5);
  assert.ok(URL_TEMPO.startsWith("https://api.open-meteo.com/"));
  assert.ok(URL_TEMPO.includes("latitude=-22.9068") && URL_TEMPO.includes("longitude=-43.1729"));
  assert.ok(!/key/i.test(URL_TEMPO));
  assert.ok(URL_TEMPO.includes("precipitation"));
  assert.equal(neutro(0).chuva, 0);
});

test("intensidadeChuva: 0 sem chuva, sobe com os mm, limita em 1", () => {
  assert.equal(intensidadeChuva(0), 0);
  assert.equal(intensidadeChuva(-1), 0);
  assert.equal(intensidadeChuva(NaN), 0);
  assert.equal(intensidadeChuva(undefined), 0);
  assert.equal(intensidadeChuva(5), 1);
  assert.equal(intensidadeChuva(50), 1);
  let ant = 0;
  for (let mm = 0.05; mm <= 6; mm += 0.05) { const i = intensidadeChuva(mm); assert.ok(i >= ant); ant = i; }
});

test("nuvensComChuva: nenhuma sem chuva, ao menos uma com qualquer chuva, todas na tempestade", () => {
  assert.equal(nuvensComChuva(0, 13), 0);
  assert.equal(nuvensComChuva(0.14, 13), 2);
  assert.equal(nuvensComChuva(0.5, 13), 7);
  assert.equal(nuvensComChuva(1, 13), 13);
  assert.equal(nuvensComChuva(0.01, 13), 1);
  assert.equal(nuvensComChuva(1, 0), 0);
});
