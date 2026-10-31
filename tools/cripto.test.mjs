import test from "node:test";
import assert from "node:assert/strict";
import { cifrar, decifrar, novaChave } from "../site/assets/cripto.js";

test("cifra e decifra com a mesma chave", async () => {
  const chave = novaChave();
  const palavras = ["girassol", "você", "açaí"];
  const pacote = await cifrar(palavras, chave);
  assert.ok(!JSON.stringify(pacote).includes("girassol"));
  assert.deepEqual(await decifrar(pacote, chave), palavras);
});

test("chave errada ou pacote adulterado devolve null", async () => {
  const pacote = await cifrar(["x"], novaChave());
  assert.equal(await decifrar(pacote, novaChave()), null);
  assert.equal(await decifrar({ ...pacote, dados: "AAAA" }, novaChave()), null);
  assert.equal(await decifrar(null, novaChave()), null);
});

test("chave tem 43 caracteres base64url (256 bits)", () => {
  assert.match(novaChave(), /^[A-Za-z0-9_-]{43}$/);
});
