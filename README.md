# A Queda de uma Ordem

Site do RPG autoral *A Queda de uma Ordem*: página inicial pública com a história do mundo, login e fichas dos personagens.

## Rodar localmente

```bash
npm install
npm run dev
```

Para o login e as fichas, crie um `.env.local` com:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Sem essas variáveis, a página inicial abre normalmente; só o login fica indisponível.

## Publicação

Cada push na `main` publica o site no GitHub Pages pelo workflow em `.github/workflows/publicar.yml`. As variáveis do Supabase ficam em **Settings → Secrets and variables → Actions → Variables**.
