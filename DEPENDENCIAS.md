# Relatorio de dependencias

Data da analise: 2026-06-11

## Sumario executivo

O projeto nao usa gerenciador de pacotes. Nao existe `package.json`, lockfile ou diretorio `node_modules` no repositorio analisado. Portanto, nao ha dependencias npm para atualizar, deduplicar ou auditar via `npm audit`.

As dependencias reais do projeto sao:

- Recursos estaticos locais.
- APIs nativas do navegador.
- Google Fonts via CDN.
- Spotify IFrame API opcional via CDN.

## Inventario de dependencias

### Dependencias locais

| Dependencia | Onde aparece | Uso |
| --- | --- | --- |
| `config/content.json` | `js/main.js`, `js/admin.js` | Conteudo padrao do site e admin. |
| `css/styles.css` | `index.html` | Estilo da pagina publica. |
| `css/admin.css` | `pages/admin.html` | Estilo do painel administrativo. |
| `js/main.js` | `index.html` | Runtime da pagina publica. |
| `js/admin.js` | `pages/admin.html` | Runtime do painel administrativo. |
| `assets/images/foto-1.svg` | `config/content.json` | Foto padrao publica. |
| `assets/images/foto-2.svg` | `config/content.json` | Foto padrao publica. |
| `assets/images/foto-3.svg` | `config/content.json` | Foto padrao publica. |
| `assets/images/foto-extra.svg` | `js/admin.js` | Foto padrao ao adicionar nova foto pelo admin. |

### Dependencias externas

| Dependencia | Origem | Onde aparece | Observacao |
| --- | --- | --- | --- |
| Google Fonts CSS API | `fonts.googleapis.com` | `index.html`, `pages/admin.html` | Carrega `Playfair Display`, `Inter` e, na pagina publica, `Caveat`. |
| Google Fonts assets | `fonts.gstatic.com` | `index.html`, `pages/admin.html` | Entrega arquivos de fonte. |
| Spotify IFrame API | `open.spotify.com/embed/iframe-api/v1` | `js/main.js` | Carregada dinamicamente apenas para URLs Spotify. |

### APIs nativas do navegador

| API | Onde aparece | Uso |
| --- | --- | --- |
| `fetch` | `js/main.js`, `js/admin.js` | Carregar `content.json`. |
| `localStorage` | `js/main.js`, `js/admin.js` | Persistir conteudo editado no navegador. |
| DOM APIs | `js/main.js`, `js/admin.js` | Renderizacao e eventos. |
| `FileReader` | `js/admin.js` | Converter uploads de imagem em Data URL. |
| `structuredClone` | `js/admin.js` | Clonar o objeto de conteudo antes de coletar dados do formulario. |
| `Blob` | `js/admin.js` | Gerar arquivo JSON para download. |
| `URL.createObjectURL` | `js/admin.js` | Criar URL temporaria para baixar JSON. |
| `Audio` | `js/main.js` | Tocar arquivos diretos de audio. |

## Verificacao de dependencias npm

Resultado dos comandos:

```bash
npm ls --depth=0
```

Retorno:

```txt
/home/nz/Sites/WebSite-Romantic
└── (empty)
```

```bash
npm audit --audit-level=low
```

Retorno relevante:

```txt
npm error code ENOLOCK
npm error audit This command requires an existing lockfile.
```

```bash
npm outdated --long
```

Retorno:

```txt
Sem saida relevante, pois nao ha manifesto de pacotes.
```

Conclusao: nao ha base para auditoria npm enquanto o projeto continuar sem `package.json` e lockfile.

Referencia externa consultada: a documentacao do npm informa que `npm audit` usa as dependencias configuradas no projeto e requer `package.json`/lockfile para auditar vulnerabilidades conhecidas.

## Dependencias desatualizadas

### npm

Nao aplicavel. O projeto nao declara dependencias npm.

### CDNs e APIs externas

- Google Fonts e carregado por URL de CSS API, sem versao fixa.
- Spotify IFrame API e carregada por endpoint `v1`.

Nao foi identificada uma versao local desatualizada porque essas dependencias nao sao fixadas no repositorio. O risco real e o oposto: por nao estarem pinadas, mudancas externas podem afetar comportamento, privacidade, disponibilidade ou performance sem alteracao no codigo local.

## Dependencias vulneraveis

### npm

Nao auditavel via `npm audit` por ausencia de lockfile.

### Runtime externo

Nao ha um lockfile ou hash local para validar Google Fonts ou Spotify IFrame API. Pontos de atencao:

- Dependencias externas por CDN aumentam superficie de privacidade e disponibilidade.
- Nao ha Content Security Policy documentada para restringir `script-src`, `style-src`, `font-src`, `img-src`, `media-src` e `frame-src`.
- A Spotify IFrame API e carregada dinamicamente sem Subresource Integrity. Em scripts dinamicos de terceiros, SRI normalmente exige gestao cuidadosa de versao/arquivo, o que nao esta presente.

## Dependencias nao utilizadas

### Pacotes

Nao ha pacotes instalados.

### Assets locais sem referencia atual

Os arquivos abaixo nao sao referenciados por HTML, JS, CSS ou `config/content.json`:

- `assets/images/img-ia.jpeg`
- `assets/images/img-kiss.jpeg`
- `assets/images/img-leydy.jpeg`
- `assets/images/img-love.jpeg`

Tamanho aproximado total desses JPEGs: 568 KB.

### Configuracoes editaveis parcialmente nao usadas

Os campos abaixo existem em `config/content.json` e/ou no admin, mas nao sao aplicados integralmente no runtime publico:

- `theme.primaryColor`
- `theme.secondaryColor`
- `theme.accentColor`
- `theme.animationStyle`
- `navigation.autoRotate`
- `navigation.intervalMs`
- `navigation.pauseOnHover`
- `sections`
- `site.footerMessage`
- `song.title`
- `song.artist`

Isso nao e uma dependencia de pacote, mas e dependencia de dados nao consumida pela UI publica.

## Dependencias duplicadas

Nao ha dependencias npm duplicadas.

Duplicacoes internas relevantes:

- `escapeHtml()` existe em `js/main.js` e `js/admin.js`.
- Logica de carregar JSON, ler `localStorage` e normalizar conteudo existe nos dois scripts.
- Requisicoes de Google Fonts aparecem em `index.html` e `pages/admin.html`, com familias parcialmente diferentes.

Essas duplicacoes sao pequenas, mas podem causar divergencia se o modelo de conteudo evoluir.

## Alternativas mais modernas ou robustas

Sugestoes sem alteracao automatica:

- Criar uma etapa opcional de build com Vite, Parcel ou outro bundler somente se o projeto crescer, para validar imports, minificar assets e gerar hashes de cache.
- Self-host de fontes para reduzir dependencia de terceiros, melhorar privacidade e permitir cache/pinning mais previsivel.
- Consolidar funcoes compartilhadas (`escapeHtml`, `normalizeContent`, leitura do conteudo) em um modulo comum se o projeto passar a ter build/bundler ou imports relativos compartilhados.
- Trocar renderizacao por `innerHTML` para construcao via DOM APIs ou template sanitizado quando houver campos editaveis que entram em atributos.
- Adicionar CSP no servidor de producao.
- Se o painel virar administracao real, substituir `localStorage` por backend autenticado e autorizacao server-side.

## Matriz de risco de dependencias

| Item | Severidade | Motivo |
| --- | --- | --- |
| Ausencia de lockfile para auditoria | Baixo | Nao ha pacotes npm, mas tambem nao ha trilha formal de auditoria. |
| CDNs externos sem pinning | Medio | Mudancas externas podem afetar disponibilidade, privacidade e comportamento. |
| Spotify script dinamico | Medio | Terceiro executa codigo no contexto da pagina via script remoto. |
| Google Fonts externo | Baixo | Risco principal e privacidade/performance, nao execucao de JS. |
| Assets JPEG nao usados | Baixo | Aumentam peso do deploy se publicados. |
| Configuracoes nao consumidas | Medio | Admin promete controles que nao refletem na pagina publica. |

## Conclusao

O projeto nao tem dependencia de pacote vulneravel ou desatualizada detectavel localmente, porque nao usa pacote algum. A maior atencao deve ir para:

- Dependencias externas por CDN.
- Falta de CSP.
- Dados editaveis inseridos em HTML.
- Assets e configuracoes que existem, mas nao participam do fluxo publico.
