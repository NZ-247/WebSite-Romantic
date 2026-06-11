# Execucao local

Data da analise: 2026-06-11

## 1. Pre-requisitos

Obrigatorios:

- Browser moderno.
- Um servidor HTTP estatico local.

Opcoes de servidor:

- Python 3, recomendado pela simplicidade.
- Node.js apenas se quiser usar um servidor estatico via `npx`.
- Docker opcional para simular ambiente Nginx.

Versoes observadas no ambiente da analise:

```txt
Node.js: v22.22.3
npm: 10.9.8
Python: 3.13.12
```

O projeto nao precisa de banco de dados, backend, Redis, filas, servicos externos obrigatorios ou instalacao de pacotes npm.

## 2. Comandos de instalacao

Nao ha dependencias para instalar.

Se estiver em uma maquina nova:

```bash
git clone https://github.com/NZ-247/WebSite-Romantic.git
cd WebSite-Romantic
```

Nao execute `npm install` como etapa obrigatoria, pois nao existe `package.json`.

## 3. Variaveis de ambiente necessarias

Nenhuma variavel de ambiente e necessaria para executar o projeto.

O arquivo `.env.example` foi gerado apenas para registrar formalmente essa ausencia de configuracao obrigatoria.

## 4. Arquivo `.env.example`

Conteudo recomendado:

```dotenv
# Este projeto nao exige variaveis de ambiente para execucao local.
# Mantenha este arquivo como documentacao para ferramentas de deploy/operacao.
```

## 5. Comandos de desenvolvimento

### Execucao com Python

```bash
cd ~/Sites/WebSite-Romantic
python3 -m http.server 8080
```

Acesse:

- Pagina publica: `http://localhost:8080/index.html`
- Painel admin: `http://localhost:8080/pages/admin.html`

### Execucao com Node.js sem instalar dependencia permanente

```bash
cd ~/Sites/WebSite-Romantic
npx serve . -l 8080
```

Observacao: esta alternativa baixa/executa uma ferramenta via npm no momento de uso. Para preservar o projeto sem dependencias, Python e a opcao mais simples.

### Execucao com Docker sem Dockerfile

```bash
cd ~/Sites/WebSite-Romantic
docker run --rm -p 8080:80 \
  -v "$PWD":/usr/share/nginx/html:ro \
  nginx:1.27-alpine
```

## 6. Comandos de build

Nao ha build compilado. O site e estatico.

Build operacional simples, copiando os arquivos publicaveis:

```bash
cd ~/Sites/WebSite-Romantic
rm -rf dist
mkdir -p dist
cp -R index.html pages css js config assets README.md dist/
```

Executar o build gerado:

```bash
cd ~/Sites/WebSite-Romantic/dist
python3 -m http.server 8080
```

## 7. Comandos de testes

Nao existem testes automatizados configurados.

Comandos manuais recomendados:

### Validar JSON

```bash
python3 -m json.tool config/content.json >/dev/null
```

### Validar sintaxe JavaScript

```bash
node --check js/main.js
node --check js/admin.js
```

### Validar respostas HTTP principais

Em um terminal:

```bash
python3 -m http.server 8080
```

Em outro terminal:

```bash
curl -I http://localhost:8080/index.html
curl -I http://localhost:8080/pages/admin.html
curl -sS http://localhost:8080/config/content.json | python3 -m json.tool >/dev/null
```

Resultados esperados:

- `index.html`: `200 OK`.
- `pages/admin.html`: `200 OK`.
- `config/content.json`: JSON valido.

### Auditoria npm

Nao aplicavel no estado atual:

```bash
npm audit --audit-level=low
```

Resultado observado:

```txt
npm error code ENOLOCK
npm error audit This command requires an existing lockfile.
```

Isso acontece porque o projeto nao possui `package.json` nem lockfile.

## Procedimento exato recomendado

Para desenvolvimento local hoje:

```bash
cd ~/Sites/WebSite-Romantic
python3 -m http.server 8080
```

Depois abra:

```txt
http://localhost:8080/index.html
http://localhost:8080/pages/admin.html
```

Para publicar em producao:

1. Garanta que `config/content.json` contenha o conteudo final.
2. Copie `index.html`, `pages/`, `css/`, `js/`, `config/` e `assets/` para o servidor estatico.
3. Configure o servidor para servir `index.html` e permitir leitura de `.json`, `.css`, `.js`, imagens e fontes externas.
