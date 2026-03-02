# Deploy no Netlify

## Opção 1: Deploy via Netlify CLI (Recomendado)

### Instalação do Netlify CLI
```bash
npm install -g netlify-cli
```

### Login no Netlify
```bash
netlify login
```

### Deploy do Projeto
```bash
netlify deploy --prod
```

Quando solicitado:
- **Publish directory**: `dist`

## Opção 2: Deploy via Interface Web do Netlify

1. Acesse [netlify.com](https://netlify.com) e faça login
2. Clique em "Add new site" → "Deploy manually"
3. Arraste a pasta `dist` para a área de upload
4. Aguarde o deploy ser concluído

## Opção 3: Deploy Contínuo via Git

1. Faça commit dos arquivos do projeto
2. Envie para um repositório no GitHub/GitLab/Bitbucket
3. No Netlify, clique em "Add new site" → "Import an existing project"
4. Conecte seu repositório
5. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Clique em "Deploy site"

## Variáveis de Ambiente

O projeto já está configurado com Firebase. Caso precise adicionar outras variáveis:

1. No dashboard do Netlify, vá em "Site settings" → "Environment variables"
2. Adicione as variáveis necessárias

## Após o Deploy

Seu site estará disponível em uma URL fornecida pelo Netlify (ex: `https://seu-site.netlify.app`)

Você pode configurar um domínio personalizado em "Domain settings" no dashboard do Netlify.
