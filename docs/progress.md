# Progresso e checkpoint

> Checkpoint de **01/11/2026**. O site está no ar no GitHub Pages, publicado a partir da `main`: `https://pedronoveseis.github.io/Nobredo.dev/`.
> Arquivo público (repositório público). A arquitetura atual está em `docs/arquitetura.md`.

## 1. Onde estamos

| Item | Estado |
|---|---|
| Site estático em `site/` (HTML + CSS + JS puro, sem build) | No ar |
| Forma VOCE com palavras pessoais, bordas retas (`empacotar`), curva `f^1,2` | Pronta |
| Janela da animação | 01/11/2026 00h até 21/11/2026 00h (-03:00) |
| Relógio | "Falta(m)" até 21/11 00h; depois "Juntos há", 30 dias em 21/11 |
| Ruído (palavras de 4 letras) | ~940 palavras importadas e filtradas; some em 21/11 00h |
| Brand book | Cores e fonte aplicadas (fundo `#5D5048`, texto `#EFDEB3`, timer e forma `#E8B83F`, Agilera) |
| Conteúdo pessoal | Texto simples em `site/assets/pessoais.txt` e `palavra-final.txt` |
| Testes | 15, rodam no deploy (`node --test tools/*.test.mjs`) |

## 2. Linha do tempo das decisões
1. **Rodadas 1 a 5:** backend Ktor + SQLite + admin. Descartado.
2. **Rodada 6:** site estático no Netlify. Descartado.
3. **Rodada 7:** GitHub Pages e a mecânica de palavras que se encaixam. O código antigo ficou em `_arquivo/` e foi removido em 31/10 (está no histórico).
4. **Rodadas 8 e 9:** ruído de 4 letras, janela 01/11 a 21/11 e conteúdo pessoal **cifrado** com chave no `#` do link.
5. **31/10:** a cifra saiu. Palavras em texto em `site/assets/`, link sem `#` (o autor avalia que ela não vai abrir o código). Saíram também `cripto.js`, `cifrar.mjs` e o preview.
6. **31/10:** forma toda dourada, curva suave (`f^1,2`), palavras só surgem ao encaixar, bordas retas, Agilera no ruído.

## 3. Aprendizados
- Em site estático com repositório público, tudo que está nos arquivos é legível. Aceito aqui como trade-off consciente; o histórico do Git guarda versões antigas.
- A forma só se lê bem com **muitas palavras curtas**; palavras longas ("serendipidade") forçam a fonte a diminuir. A repetição da lista em `pessoais.txt` dá detalhe às letras.
- Engrossar demais a máscara (0,16) deixa o C e o E ilegíveis; 0,09 funciona.
- A Agilera tem ligaduras e fica menos legível em corpo pequeno: fica no ruído e no relógio, não no VOCE.
- Palavras de dicionário exigem triagem; a lista de exclusão está em `tools/bloqueadas.txt`.
- O ambiente `github-pages` guarda uma regra de branches autorizadas, e `actions/configure-pages` exige Settings → Pages → Source: GitHub Actions.
- No zsh interativo `#` não é comentário: não colar comandos com `# ...`.

## 4. Pendências
**Do autor**
- Conferir os arquivos soltos no Mac (`find . -name "pessoais.txt"`): só vale o de `site/assets/`.
- Enviar o logotipo "nobredo" (SVG ou PNG), se quiser na página.
- Revisar `tools/bloqueadas.txt` e `site/assets/ruido.js`.
- Mandar o link `https://pedronoveseis.github.io/Nobredo.dev/` (com `https`, sem `?data=`).

**Técnicas**
1. Forma pequena no celular em retrato: aumentar a área (`ESCALA_FORMA`) e dar um piso de fonte.
2. Painel de debug (`?debug`) com data fixa e slider (adiado).
3. Decidir se `?data=` sai depois de 21/11.
4. Afinar densidade e movimento do ruído.

## 5. Como operar
```sh
python3 -m http.server 8080 --directory site   # ver localmente; ?data=2026-11-20T12:00:00-03:00
node --test tools/*.test.mjs                   # testes
node tools/importar-ruido.mjs pagina.html      # regenera o ruído (opcional)
```
Para mudar o conteúdo: edite `site/assets/pessoais.txt` e `palavra-final.txt`, faça commit e push na `main`; o deploy leva cerca de um minuto.

## 6. Próximos marcos
| Data | O que acontece |
|---|---|
| 01/11 | Animação começa; as primeiras palavras se encaixam por volta das 4h |
| Até 20/11 | Ajustes finais (celular, logotipo) |
| 21/11 00h | Forma completa, ruído some, relógio vira "Juntos há 30 dias" |
| Depois | Decidir o destino do site e retomar o app KMP |
