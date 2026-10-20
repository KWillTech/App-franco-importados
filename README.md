# Franco Importados — Gestão de clientes e contas a receber

App de celular (PWA) para controlar clientes, vendas parceladas (boleto, cartão, Pix, dinheiro) e o que falta receber.
Visual do design system Franco Importados.

## Primeira configuração (uma vez)

1. No [Supabase](https://supabase.com/dashboard), abra o projeto, vá em **SQL Editor → New query**, cole o conteúdo de
   `supabase/migrations/001_schema.sql` e clique em **Run**; depois faça o mesmo com o `002_*.sql`. Cada arquivo roda **uma única vez**; mudanças futuras no banco vão em novos arquivos numerados
   (`002_*.sql`, `003_*.sql`…), nunca editando o `001`.
2. Em **Authentication → Users → Add user**, crie o usuário administrador (e-mail e senha).
3. Em **Authentication → Sign In / Providers**, desative **Allow new users to sign up**.
4. Copie `.env.example` para `.env.local` e preencha `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
   (Supabase → Project Settings → API).

## Equipe: novos usuários

Todos os usuários do app veem e editam os mesmos clientes, vendas e parcelas.

1. Uma única vez: no **SQL Editor**, rode `supabase/migrations/002_equipe_e_troca_de_senha.sql`
   (antes de criar o primeiro usuário novo).
2. Em **Authentication → Users → Add user → Create new user**, informe o e-mail e uma senha provisória e
   marque **Auto Confirm User**.
3. Passe o e-mail e a senha provisória para a pessoa. No primeiro login o app pede uma senha nova e só libera as
   telas depois da troca.

Para obrigar alguém a trocar a senha de novo, rode no SQL Editor (trocando o e-mail):

```sql
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"trocar_senha": true}'
where email = 'pessoa@exemplo.com';
```

Excluir um usuário não apaga o que ele cadastrou.

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
