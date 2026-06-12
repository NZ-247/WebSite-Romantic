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

## Navegação da página pública

No PC:

- Use o botão **Abrir coração** para abrir o envelope e mostrar a carta.
- Na carta, use **Abrir nosso diário** para abrir a primeira página de memórias.
- No diário, use **Anterior**, **Próxima** ou **Voltar para carta**.
- O botão flutuante **Voltar** aparece na carta e no diário. No diário ele volta para a carta; na carta ele volta para o envelope.

No celular:

- Toque em **Abrir coração**, depois em **Abrir nosso diário**.
- No diário, toque em **Anterior** ou **Próxima** para mudar de página.
- Também é possível deslizar horizontalmente sobre a folha: arraste para a esquerda para avançar e para a direita para voltar.
- Use **Voltar para carta** ou o botão flutuante **Voltar** para retornar uma etapa.

## Atalhos de teclado

- `Enter` ou `Espaço`: abre o envelope, avança da carta para o diário e, no diário, passa para a próxima página.
- `Escape`: volta uma etapa.
- `ArrowRight`: mostra a próxima página do diário.
- `ArrowLeft`: mostra a página anterior do diário.

## Memórias do diário

No painel admin:

1. Faça login em `/pages/admin.html`.
2. Vá até **Diário de memórias**.
3. Preencha ou edite legenda, bilhete, anotação, data e layout da memória desejada.
4. Se quiser reposicionar a página manualmente, use o **Editor visual da folha** dentro da própria memória.
5. Clique em **Salvar alterações**.

### Editor visual da folha

Cada memória tem uma folha editável no admin. Clique em um item para selecioná-lo e arraste com o mouse para reposicionar. Foto principal e post-it também têm uma alça no canto inferior direito para redimensionar.

- **Centralizar item selecionado** move o widget ativo para o centro da folha.
- **Restaurar layout padrão** remove o layout visual personalizado daquela memória; a página pública volta a usar o layout antigo baseado em `layout`.
- As posições são salvas em porcentagens relativas à folha: `x`, `y`, `width` e `height`.
- No teclado, com um widget focado, use as setas para mover em passos de 1%; com `Shift`, o passo é de 5%.

Widgets suportados nesta versão: foto principal, post-it/poesia, texto maior, coração, estrela, flor, fita adesiva e alfinete.

Cada memória aceita o formato abaixo. `caption` continua compatível com versões antigas: se `poem` não existir, o diário usa `caption` como bilhete; se `story`, `date` ou `layout` não existirem, a página continua funcionando.

```json
{
  "id": "memory-1",
  "url": "/uploads/images/foto.jpg",
  "caption": "Legenda curta",
  "poem": "Texto curto para o post-it",
  "story": "Texto maior contando o momento da foto",
  "date": "22 de Maio de 2024",
  "layout": "left-photo",
  "widgets": [
    {
      "id": "photo-main",
      "type": "photo",
      "x": 8,
      "y": 18,
      "width": 38,
      "height": 34,
      "rotation": -3
    },
    {
      "id": "poem-note",
      "type": "postit",
      "x": 54,
      "y": 20,
      "width": 34,
      "height": 25,
      "rotation": 2
    }
  ]
}
```

`widgets` é opcional. Se ele não existir, a página pública mantém o layout padrão atual. O texto é sanitizado pelo backend e escapado na renderização pública.

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
