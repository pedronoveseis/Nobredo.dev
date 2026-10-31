# Progresso e checkpoint

> Checkpoint do MVP: **2026-10-31**. O site está no ar no GitHub Pages, publicado a partir da `main`.
> Este arquivo é público (repositório público). Desde 31/10 as palavras pessoais também estão em texto em `site/assets/` (ver "Sem cifra" no fim); onde este documento fala de cifra e chave, vale a seção "Sem cifra".

## 1. Onde estamos

| Item | Estado |
|---|---|
| Site estático (HTML + CSS + JS puro, sem build) em `site/` | Pronto, no ar |
| Animação: palavras que se embaralham e se encaixam numa forma | Pronta (MVP) |
| Janela da animação | 01/11/2026 00h até 21/11/2026 00h (-03:00) |
| Relógio | Regressivo até 21/11 00h; depois progressivo ("Juntos há"), com 30 dias em 21/11 |
| Ruído (palavras de 4 letras) | ~940 palavras importadas e filtradas, ruído some em 21/11 00h |
| Conteúdo pessoal em `site/assets/pessoais.txt` e `palavra-final.txt` (sem cifra desde 31/10) | Funcionando |
| Se os `.txt` não carregam | Só ruído e relógio |
| Deploy | GitHub Actions → Pages, a cada push na `main` |
| Testes | `node --test tools/*.test.mjs` |

## 2. Linha do tempo das decisões

1. **Rodadas 1 a 5 (arquitetura):** backend Ktor + SQLite + admin, conteúdo liberado pelo servidor. Esqueleto implementado e testado.
2. **Rodada 6:** pivô para site estático no Netlify com função de tempo. Publicação por commit.
3. **Rodada 7:** pivô para GitHub Pages e para a mecânica de palavras que se encaixam. Backend e admin saem; ficaram em `_arquivo/` até 31/10, quando a pasta foi removida (continua no histórico do Git).
4. **Rodada 8:** ruído de 4 letras, palavras pessoais cifradas, desenho menor, janela 01/11 a 21/11.
5. **Rodada 9:** sem chave nada aparece (nem forma nem palavra final); palavra final também cifrada; banco de ruído importado do dicionário com lista de exclusão.
6. **Deploy:** `main` criada e definida como padrão; Pages ativo.

## 3. Aprendizados

**Segredo em site estático**
- Em site estático com repositório público, tudo que está nos arquivos é legível. O que protege o conteúdo pessoal é cifrá-lo e deixar a chave **fora** do repo, no fragmento (`#`) do link. O fragmento não vai ao servidor nem ao `Referer`.
- Limite honesto: quem tem o link completo lê o conteúdo; o histórico do Git é público e anterior à cifra.
- "Sem chave" precisa ser um estado explícito do código (nada de modo de demonstração que revele a forma). Um teste varre `site/` procurando a palavra final em texto.
- O parâmetro `?data=` serve para testar, mas também funciona em produção. Quem o usar vê estados futuros do relógio (não o conteúdo cifrado).

**Produto e visual**
- A forma só se lê bem com **muitas palavras curtas**. Com poucas ou longas, a fonte sai pequena e o contorno some, principalmente em celular no modo retrato.
- Decisão de 31/10: a curva cúbica (`f³`) escondia quase tudo até os últimos dias. Agora é `f^1,2` (`EXPOENTE` em `core.js`), com palavras novas todo dia, e a forma inteira (vagando e encaixada) em dourado `#E8B83F`.
- Palavras de dicionário exigem triagem (sentido negativo, nomes próprios, siglas). A lista de exclusão fica em `tools/bloqueadas.txt`.
- Um relógio simulado que reinicia a cada refresh atrapalha os testes. Fica para depois um painel de debug com data fixa.

**Infraestrutura**
- O repositório nasceu sem `main`; a branch padrão era a de trabalho. O workflow dispara em `main`, então foi preciso criar a `main` e trocar a padrão.
- O ambiente `github-pages` guarda uma regra de branches autorizadas. A `main` teve de ser adicionada ali, senão o job falha em 1 segundo, sem log.
- `actions/configure-pages` falha enquanto o Pages não estiver ativado em Settings → Pages → Source: GitHub Actions.
- Rede do container da sessão: domínios novos só valem depois que a regra de rede é aplicada; testar com `curl` antes de insistir.

**Processo**
- A arquitetura mudou três vezes (Ktor → Netlify → Pages). O código antigo ficou em `_arquivo/` enquanto foi útil e depois foi apagado; o histórico do Git preserva o caminho para o futuro app KMP.
- No zsh interativo `#` não é comentário: não colar comandos com `# ...`. Sempre rodar da raiz do projeto ou usar `--directory`.

## 4. Pendências

**Do autor**
- Enviar as ~100 palavras pessoais e confirmar a palavra final. Rodar `node tools/cifrar.mjs` e publicar o `pessoais.enc.json` novo; a chave nova gera um link novo.
- Brand book: cores e fonte aplicados em 31/10 (`theme.css`: fundo #5D5048, texto #EFDEB3, timer #E8B83F; fonte Agilera em `site/assets/fonts/agilera.woff2`, subset latino, só no relógio). Falta o logotipo "nobredo" na página, se for desejado.
- Revisar `tools/bloqueadas.txt` e `site/assets/ruido.js`.
- Decidir sobre a branch antiga `claude/arquitetura-pedido-namoro` (apagar) e sobre o histórico do Git.

**Técnicas (próximas rodadas)**
1. Legibilidade da forma no celular (modo retrato): ajustar tamanho de fonte, espaçamento e quantidade de palavras com o conteúdo real.
2. Painel de debug (`?debug`) com data fixa e slider.
3. ~~Rodar os testes no workflow antes de publicar.~~ Feito: o workflow roda `node --test` antes do deploy.
4. Afinar densidade e movimento do ruído quando não há chave. Em andamento: ruído em tela cheia, em grade com jitter, fonte 8 a 11 px; relógio em `100dvh` com altura medida; falta ver no celular e com o conteúdo real.
5. Decidir se `?data=` continua ativo em produção.
6. ~~Revisar `docs/arquitetura.md`~~ Feito: aviso de histórico no topo apontando para este arquivo.

## 5. Como operar

```sh
# rodar local
python3 -m http.server 8080 --directory site

# testes
node --test tools/*.test.mjs

# ver o site localmente (dentro de site/)
python3 -m http.server

# ruído
node tools/importar-ruido.mjs pagina.html
```

Link dela: `https://<usuario>.github.io/<repo>/` (sem `#`). Para simular outra data: `?data=2026-11-10T12:00:00-03:00`.

## 6. Próximos marcos

| Data | O que acontece |
|---|---|
| 01/11 | Animação começa (a nuvem solta; poucos encaixes) |
| Até 20/11 | Conteúdo real publicado em `site/assets/*.txt`; ajustes visuais com o brand book |
| 21/11 00h | Forma completa, ruído some, relógio vira "Juntos há 30 dias" |
| Depois | Decidir o destino do site (manter, arquivar) e retomar o app KMP |

## Sem cifra (31/10)
- Decisão: tirar a cifra e a chave. O usuário avalia que a pessoa não vai abrir o código do site, e a chave de 43 caracteres atrapalhava o uso. O link enviado é o endereço limpo, sem `#`.
- Dados em texto simples: `site/assets/pessoais.txt` (uma palavra por linha, com repetições para dar detalhe) e `site/assets/palavra-final.txt` (`voce`, desenhada sempre em maiúsculas). Para mudar, edite os arquivos e dê push.
- Ver localmente: dentro de `site/`, `python3 -m http.server` e abrir `http://localhost:8000/?data=2026-11-20T12:00:00-03:00`.
- Trade-off aceito: repositório e site públicos, então as palavras e o `VOCE` ficam legíveis para quem abrir o código ou o arquivo. O `?data=` continua e pode sair depois de 21/11; não deve constar nos links enviados a ela. O histórico do Git guarda versões antigas.
- Removidos: `cripto.js`, `pessoais.enc.json`, `tools/cifrar.mjs`, `tools/preview.mjs` e os testes de cifra e vazamento (trocados por `tools/pessoais.test.mjs`).
