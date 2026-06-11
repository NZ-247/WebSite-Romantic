# Dependencias e pontos de integracao

## Runtime Node.js

As dependencias ficam em `package.json`:

| Pacote | Uso |
| --- | --- |
| `express` | Servidor HTTP, paginas estaticas controladas e rotas de API. |
| `dotenv` | Carrega variaveis de ambiente do `.env`. |
| `express-session` | Cria sessao segura via cookie `httpOnly` para o admin. |
| `multer` | Processa uploads multipart de imagens e MP3. |
| `sanitize-html` | Sanitiza SVG enviado antes de salvar em uploads. |

## Variaveis de ambiente

| Variavel | Obrigatoria | Descricao |
| --- | --- | --- |
| `PORT` | Nao | Porta do servidor. Padrao: `3000`. |
| `NODE_ENV` | Nao | Use `production` em producao para cookie seguro. |
| `ADMIN_TOKEN` | Sim | Token digitado no login do admin. |
| `SESSION_SECRET` | Recomendado | Segredo usado para assinar a sessao. |
| `MAX_IMAGE_SIZE_MB` | Nao | Tamanho maximo de imagem. Padrao: `5`. |
| `MAX_MUSIC_SIZE_MB` | Nao | Tamanho maximo de MP3. Padrao: `15`. |

## Arquivos principais

| Arquivo | Responsabilidade |
| --- | --- |
| `server/index.js` | Backend Express, autenticacao, APIs, uploads e servico de assets. |
| `server/data/content.json` | Conteudo editavel usado pela pagina publica e pelo admin. |
| `index.html` | Entrada publica do site romantico. |
| `pages/login.html` | Tela de login do admin. |
| `pages/admin.html` | Painel protegido de edicao. |
| `js/main.js` | Renderiza a experiencia publica a partir de `/api/content`. |
| `js/login.js` | Envia o token para `/api/admin/login`. |
| `js/admin.js` | Le/salva conteudo e envia uploads pelas rotas protegidas. |
| `css/styles.css` | Visual publico, animacoes e suporte a `prefers-reduced-motion`. |
| `css/admin.css` | Visual do login e painel admin. |
| `assets/favicon-heart.svg` | Favicon de coracao vermelho. |

## Endpoints

| Metodo | Rota | Protegido | Uso |
| --- | --- | --- | --- |
| `GET` | `/api/content` | Nao | Conteudo publico. |
| `POST` | `/api/admin/login` | Nao | Valida `ADMIN_TOKEN` e cria sessao. |
| `POST` | `/api/admin/logout` | Sim | Encerra a sessao. |
| `GET` | `/api/admin/session` | Nao | Informa se ha sessao ativa. |
| `GET` | `/api/admin/content` | Sim | Le conteudo atual. |
| `PUT` | `/api/admin/content` | Sim | Salva alteracoes em `server/data/content.json`. |
| `POST` | `/api/admin/uploads/images` | Sim | Upload de `jpg`, `jpeg`, `png`, `webp`, `svg`. |
| `POST` | `/api/admin/uploads/music` | Sim | Upload de `mp3`. |

## Persistencia local

Uploads sao salvos em:

- `server/uploads/images`
- `server/uploads/music`

Esses diretorios sao ignorados pelo Git, exceto pelos arquivos `.gitkeep`.

## Seguranca aplicada

- O token nao fica hardcoded no frontend.
- A sessao usa cookie `httpOnly` e `sameSite=lax`.
- `/pages/admin.html` e as rotas admin sao protegidas por middleware.
- Uploads validam extensao, MIME, assinatura basica e tamanho maximo.
- Nomes de arquivos sao gerados com `crypto.randomUUID()`.
- URLs de fotos e musica sao filtradas no backend e no frontend.
- SVG enviado passa por sanitizacao e headers defensivos ao ser servido.
