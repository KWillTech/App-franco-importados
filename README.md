# Franco Importados — Gestão de clientes e contas a receber

App de celular (PWA) para controlar clientes, vendas parceladas (boleto, cartão, Pix, dinheiro) e o que falta receber.
Visual do design system Franco Importados.

## Primeira configuração (uma vez)

1. No [Supabase](https://supabase.com/dashboard), abra o projeto, vá em **SQL Editor → New query**, cole o conteúdo de
   `supabase/migrations/001_schema.sql` e clique em **Run**.
2. Em **Authentication → Users → Add user**, crie o usuário administrador (e-mail e senha).
3. Em **Authentication → Sign In / Providers**, desative **Allow new users to sign up**.
4. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
   (Supabase → Project Settings → API).

## Comandos

| Comando | O que faz |
|---|---|
| `npm install` | Instala as dependências |
| `npm run dev` | Abre o app em modo desenvolvimento (http://localhost:5173) |
| `npm test` | Roda os testes (regras de negócio e SQL) |
| `npm run build` | Gera a versão de produção em `dist/` |
| `npm run smoke` | Verificação visual de todas as telas, claro e escuro, em 390px (veja abaixo) |

### Verificação visual (`npm run smoke`)

Roda o app de produção contra um Supabase falso (o Playwright intercepta as chamadas; não precisa de rede):

```bash
npm run build
npx vite preview --port 4173 --strictPort &
npm run smoke        # capturas em e2e/screenshots/
```

Na primeira vez numa máquina nova, instale o navegador com `npx playwright install chromium`.

## Publicar

Vercel ou Netlify: importe o repositório, comando de build `npm run build`, pasta `dist`, e cadastre as variáveis
`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## Instalar no celular

Abra o endereço publicado no navegador do celular. iPhone: **Compartilhar → Adicionar à Tela de Início**.
Android (Chrome): menu **⋮ → Instalar app**.
