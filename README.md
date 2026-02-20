# 💖 WebSite Romantic — Projeto completo para deploy

Site romântico, responsivo e editável sem alterar código-fonte.

## Estrutura de pastas

```txt
.
├── assets/
│   └── images/                # Imagens do site (exemplos em SVG)
├── config/
│   └── content.json           # Conteúdo padrão editável
├── css/
│   ├── styles.css             # Estilo da página pública
│   └── admin.css              # Estilo da página de edição
├── js/
│   ├── main.js                # Renderização da página pública
│   └── admin.js               # Painel de edição
├── pages/
│   └── admin.html             # Interface de administração
└── index.html                 # Página principal pública
```

## Como executar localmente

Como o projeto usa `fetch` para carregar `config/content.json`, abra via servidor HTTP:

```bash
python3 -m http.server 8080
```

Acesse:
- Página pública: `http://localhost:8080/index.html`
- Página admin: `http://localhost:8080/pages/admin.html`

## Como editar conteúdo sem código

1. Entre em `pages/admin.html`.
2. Altere títulos, textos, fotos, cores, estilo de animação e ordem das seções.
3. Clique em **Salvar alterações** para refletir na página pública automaticamente (via `localStorage`).
4. Para levar para produção, clique em **Baixar JSON** e substitua `config/content.json` pelo arquivo exportado.

## Personalização principal

- **Seções**: editadas no painel admin.
- **Fotos**: aceitam caminhos locais (`assets/images/minha-foto.jpg`) ou URL.
- **Tema**: usa CSS custom properties e é controlado no painel.
- **Animações**: `fade`, `slide`, `parallax`.

## Deploy em Nginx

Exemplo de bloco de servidor:

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    root /var/www/website-romantic;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Cache opcional de assets
    location ~* \.(css|js|png|jpg|jpeg|gif|svg|webp)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }
}
```

Depois:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Observações

- O painel admin é **simples** e pensado para edição pessoal.
- Para uso multiusuário com autenticação real, recomenda-se backend (Node, PHP, etc.).

## Como salvar esses arquivos no GitHub

No terminal, dentro da pasta do projeto, execute:

```bash
git init
git add .
git commit -m "Site romântico completo"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

Se o repositório já existir localmente (como neste projeto), normalmente basta:

```bash
git add .
git commit -m "Atualiza conteúdo do site romântico"
git push
```

> Dica: no GitHub, gere um **Personal Access Token** para autenticação via HTTPS caso a senha da conta não funcione no `git push`.
