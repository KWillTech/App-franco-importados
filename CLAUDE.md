# App Franco Importados

PWA (React + Vite + TypeScript + Tailwind) com Supabase para gestão de clientes e contas a receber.

- Spec: `docs/superpowers/specs/2026-10-12-gestao-clientes-contas-a-receber-design.md`
- Plano: `docs/superpowers/plans/2026-10-12-gestao-clientes-contas-a-receber.md`

## Processo
- Use as skills de `.claude/skills/`: `brainstorming` antes de qualquer mudança de comportamento, `writing-plans`
  para planejar, `supabase-postgres-best-practices` para qualquer SQL, `ui-ux-pro-max` e `web-design-guidelines`
  para revisar telas.

## Convenções
- Regras de negócio só em `src/lib/domain.ts` (funções puras, testadas em `domain.test.ts`). Telas não calculam.
- Visual: padrão premium do painel do site Franco Importados (tokens em `src/index.css` e `tailwind.config.js`):
  azul-marinho + dourado, fonte Montserrat, cartões arredondados com sombra suave, botões e filtros em pílula,
  cartões numerados (`Secao`), indicadores com ícone (`Indicador`), listas em cartão (classe `lista`).
  Vermelho/verde só como feedback (`danger`/`success`) e sempre com texto. Use os componentes de
  `src/components/ui.tsx`; para links com cara de botão, `buttonClass()`. Confirmações com `useConfirmacao()`
  (nunca `confirm()` do navegador); diálogos sempre pelo `Modal` (prende o foco e devolve ao fechar).
- Textos em pt-BR, tratando por "você"; botões no infinitivo; valores com `brl()`, datas com `dataBR()`.
- SQL novo vai em `supabase/migrations/NNN_nome.sql`, com teste em `supabase/schema.test.ts` (PGlite).
- Antes de commitar: `npm run build && npm test`; em mudança de tela, também `npm run smoke` (veja o README).
