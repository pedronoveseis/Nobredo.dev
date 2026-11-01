# Arquitetura

> Versão de 01/11/2026. O texto anterior (backend Ktor, Netlify, cifra, token por link, app Flutter/KMP) foi retirado por não valer mais; continua no histórico do Git (`git log -- docs/arquitetura.md`).

## O que é
Um site estático e privado, feito para uma única pessoa. Centenas de palavras flutuam; entre **01/11/2026 00h** e **21/11/2026 00h** (-03:00) as palavras pessoais se encaixam, aos poucos, numa forma que desenha **VOCE**. Em 21/11 00h o ruído some e o relógio, que contava para trás ("Falta(m)"), passa a contar para a frente ("Juntos há", 30 dias nesse momento).

## Pilha
- HTML + CSS + JavaScript puro (módulos ES), sem build e sem dependências.
- Hospedagem: GitHub Pages, publicado pelo GitHub Actions a cada push na `main`; o workflow roda os testes antes do deploy.
- Testes: `node --test tools/*.test.mjs`.

## Arquivos
| Arquivo | Papel |
|---|---|
| `site/index.html` | Página (canvas + relógio), `noindex` |
| `site/assets/app.js` | Canvas: ruído, forma, relógio, `?data=` |
| `site/assets/core.js` | Lógica pura e testada: datas, curva, ordem, embaralhar, `empacotar` |
| `site/assets/ruido.js` | Banco de palavras de 4 letras (o ruído) |
| `site/assets/pessoais.txt` | Palavras pessoais, uma por linha, com repetições |
| `site/assets/palavra-final.txt` | A palavra final (`voce`); sempre desenhada em maiúsculas |
| `site/assets/theme.css` | Cores e fontes (a identidade visual muda só aqui) |
| `site/assets/app.css` | Layout |
| `site/assets/fonts/agilera.woff2` | Fonte da marca, no relógio e no ruído |
| `tools/importar-ruido.mjs`, `tools/bloqueadas.txt` | Regeneram o `ruido.js` a partir do dicionário, sem as palavras bloqueadas (opcional) |

## Como a animação funciona
1. **Máscara:** a palavra final é desenhada num canvas fora da tela, em maiúsculas, e vira uma máscara de pixels.
2. **Slots:** cada linha da máscara é dividida em trechos, e `empacotar` os preenche com as palavras pessoais, em ciclo. Perto das pontas escolhe palavras mais curtas e depois justifica a sobra, para as bordas das letras ficarem retas. A fonte é a maior em que todas as palavras aparecem ao menos uma vez.
3. **Tempo:** `fracao(agora)` vai de 0 a 1 entre 01/11 e 21/11. A curva `f^1,2` (`EXPOENTE` em `core.js`) dá algo novo todo dia.
4. **Bloco e transformação:** antes de 21/11 00h as palavras da forma ficam num **bloco quase quadrado** (`linhasBloco` em `core.js`, `montarBloco` em `app.js`), sem pista do VOCE; cada uma surge em fade, vinda de onde estava, em ordem aleatória. Em 21/11 00h cada palavra sai do lugar no bloco e vai para o seu slot, **em onda da esquerda para a direita** (`ONDA_MS`, `VOO_MS`), como peças de lego. Quem abrir pela **primeira vez** depois da meia-noite vê o bloco e, 1,5 s depois, a onda (a marca `nobredo-viu-transformacao` no `localStorage` é gravada ao terminar); nas visitas seguintes, ou com o `localStorage` bloqueado, ou com movimento reduzido, o VOCE já está pronto. `?reset=1` apaga a marca para testar. A fonte da forma é 70% da maior possível (`FATOR_FONTE`), com piso de 6,5 px.
5. **Ruído:** palavras de 4 letras em grade com jitter, por toda a tela; some com fade de 4 s em 21/11.
6. **Relógio:** regressivo até 21/11 00h; depois progressivo, contado desde 22/10 00h.

## Decisões
- **Sem cifra, sem chave:** o conteúdo pessoal fica em texto em `site/assets/`. A pessoa não deve abrir o código do site. Repositório e site são públicos, então quem abrir os arquivos lê as palavras e o `VOCE`. O histórico do Git guarda versões antigas.
- **`?data=`:** simula outra data no navegador (`?data=2026-11-20T12:00:00-03:00`); reinicia no refresh. Fica em produção até 21/11, mas não entra no link enviado.
- **Forma só com palavras pessoais, em dourado `#E8B83F`;** o ruído usa tons apagados e a Agilera.
- **Brand book:** fundo `#5D5048`, texto `#EFDEB3`, timer `#E8B83F`.

## Fora do escopo (por enquanto)
Backend, login, token por link, painel admin e app nativo (KMP). Se um dia voltarem, o desenho antigo está no histórico do Git.
