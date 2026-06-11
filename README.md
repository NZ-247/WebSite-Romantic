# WebSite Romantic

Site romântico com página pública em HTML, CSS e JavaScript puro, agora servido por um backend leve em Node.js + Express para administrar conteúdo, fotos e música com autenticação por token.

## Estrutura principal

```txt
.
├── assets/
│   ├── favicon-heart.svg
│   └── images/
├── css/
│   ├── admin.css
│   └── styles.css
├── js/
│   ├── admin.js
│   ├── login.js
│   └── main.js
├── pages/
│   ├── admin.html
│   └── login.html
├── server/
│   ├── data/content.json
│   ├── uploads/images/
│   ├── uploads/music/
│   └── index.js
├── .env.example
└── package.json
```

## Instalar dependências

```bash
npm install
```

## Configurar `.env`

Crie o arquivo local a partir do exemplo:

```bash
cp .env.example .env
```

Edite os valores:

```env
PORT=3000
NODE_ENV=development
ADMIN_TOKEN=troque-este-token
SESSION_SECRET=troque-por-um-segredo-longo-e-aleatorio
MAX_IMAGE_SIZE_MB=5
MAX_MUSIC_SIZE_MB=15
```

`ADMIN_TOKEN` é o token digitado na tela de login. Ele fica somente no servidor e não deve ser commitado.

## Executar localmente

```bash
npm run dev
```

Acesse:

- Página pública: `http://localhost:3000/`
- Admin: `http://localhost:3000/pages/admin.html`

Para executar sem modo watch:

```bash
npm start
```

## Acessar o admin

1. Abra `/pages/admin.html`.
2. O servidor redireciona para `/pages/login.html` se não houver sessão.
3. Digite o valor de `ADMIN_TOKEN`.
4. Após validar, o navegador recebe um cookie de sessão `httpOnly`.
5. Use **Sair** no painel para encerrar a sessão.

## Conteúdo e endpoints

- Conteúdo editável: `server/data/content.json`
- Endpoint público: `GET /api/content`
- Endpoint protegido de leitura: `GET /api/admin/content`
- Endpoint protegido de gravação: `PUT /api/admin/content`
- Upload de imagens: `POST /api/admin/uploads/images`
- Upload de música: `POST /api/admin/uploads/music`

## Upload de fotos e música

No painel admin:

1. Faça login.
2. Em **Fotos favoritas**, envie uma imagem ou substitua uma foto existente.
3. Em **Música que amo**, envie um MP3 ou cole um link do Spotify/MP3.
4. Clique em **Salvar alterações** para publicar no conteúdo público.

Imagens aceitas: `jpg`, `jpeg`, `png`, `webp`, `svg`.

Áudio aceito: `mp3`.

Os arquivos enviados ficam em:

- `server/uploads/images`
- `server/uploads/music`

Essas pastas são ignoradas pelo Git, mantendo apenas os `.gitkeep`.

## Docker futuramente

Quando um `Dockerfile` for adicionado, use volumes para preservar conteúdo e uploads:

```bash
docker build -t website-romantic .
docker run --env-file .env -p 3000:3000 \
  -v "$(pwd)/server/data:/app/server/data" \
  -v "$(pwd)/server/uploads:/app/server/uploads" \
  website-romantic
```

Em produção, defina `NODE_ENV=production`, use HTTPS e mantenha `SESSION_SECRET` longo e aleatório.
