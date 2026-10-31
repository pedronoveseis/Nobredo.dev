import test from "node:test";
import assert from "node:assert/strict";
import { cifrar, decifrar, novaChave } from "../site/assets/cripto.js";

test("cifra e decifra com a mesma chave", async () => {
  const chave = novaChave();
  const palavras = ["girassol", "coração", "açaí"];
  const conteudo = { palavra: "ela", palavras };
  const pacote = await cifrar(conteudo, chave);
  assert.ok(!JSON.stringify(pacote).includes("girassol"));
  assert.deepEqual(await decifrar(pacote, chave), conteudo);
});

test("chave errada ou pacote adulterado devolve null", async () => {
  const pacote = await cifrar({ palavra: "x", palavras: ["y"] }, novaChave());
  assert.equal(await decifrar(pacote, novaChave()), null);
  assert.equal(await decifrar({ ...pacote, dados: "AAAA" }, novaChave()), null);
  assert.equal(await decifrar(null, novaChave()), null);
});

test("chave tem 43 caracteres base64url (256 bits)", () => {
  assert.match(novaChave(), /^[A-Za-z0-9_-]{43}$/);
});
