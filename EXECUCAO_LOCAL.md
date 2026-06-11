# Execucao local

O projeto agora roda com Node.js + Express. Nao use mais `python3 -m http.server`, porque o conteudo publico vem de `/api/content` e o admin depende de sessao no backend.

## 1. Instalar dependencias

```bash
npm install
```

## 2. Criar `.env`

```bash
cp .env.example .env
```

Preencha ao menos:

```env
PORT=3000
ADMIN_TOKEN=um-token-local
SESSION_SECRET=um-segredo-longo-e-aleatorio
```

## 3. Rodar em modo desenvolvimento

```bash
npm run dev
```

Acesse:

- Publico: `http://localhost:3000/`
- Admin: `http://localhost:3000/pages/admin.html`
- Login: `http://localhost:3000/pages/login.html`

## 4. Fluxo do admin

1. Abra `/pages/admin.html`.
2. Se nao houver sessao, o servidor redireciona para `/pages/login.html`.
3. Digite o valor de `ADMIN_TOKEN`.
4. Edite o conteudo, envie fotos/MP3 e clique em **Salvar alteracoes**.

## 5. Validacoes rapidas

Com o servidor em execucao:

```bash
curl -I http://localhost:3000/
curl -sS http://localhost:3000/api/content
```

A API admin sem login deve retornar `401`:

```bash
curl -i http://localhost:3000/api/admin/content
```

## 6. Onde os dados ficam

- Conteudo editavel: `server/data/content.json`
- Imagens enviadas: `server/uploads/images`
- MP3 enviado: `server/uploads/music`

Os uploads e `.env` sao ignorados pelo Git.
