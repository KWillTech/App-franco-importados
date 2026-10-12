# App Franco Importados — Gestão de Clientes e Contas a Receber

**Data:** 2026-10-12
**Status:** Spec para revisão
**Referência funcional:** vídeo do app "IDEAL TECH" (feito no Lovable)
**Referência visual:** design system "Franco Importados" (https://claude.ai/artifact/17BRerw5zcs1ZXB2vs43BX)

## 1. Entendimento

**O que foi pedido:** um app de celular para gestão de clientes e de contas a receber —
vendas parceladas por boleto, cartão de crédito etc. —, no modelo do app do vídeo, com a
identidade visual e a logo da Franco Importados.

**Para quem:** o dono da loja (um único administrador), usando principalmente o celular.

**Sucesso significa:** ao abrir o app, saber em segundos quem está devendo, o que vence
hoje/esta semana, quanto entrou e quanto ainda falta receber; registrar uma venda parcelada
e dar baixa num pagamento em poucos toques.

**Premissas (não ditas explicitamente):**
- Os valores são em reais e as parcelas são mensais.
- A loja não precisa de controle de estoque neste app.
- Volume pequeno (centenas de clientes, poucos milhares de parcelas): carregar tudo de uma
  vez e calcular no aparelho é aceitável.

## 2. Decisões tomadas

| Tema | Decisão |
|---|---|
| Plataforma | PWA instalável (iPhone/Android), também abre no computador |
| Cobranças | Apenas registro/controle — o app **não** emite boleto nem cobra cartão |
| Usuários | Um único administrador (e-mail e senha do Supabase Auth) |
| Dados iniciais | Começar do zero (sem importação de planilha) |
| Arquitetura | React + Vite + TypeScript + Supabase (Postgres, Auth, RLS) |
| Visual | Design system Franco Importados + logotipo oficial |
| Projeto Supabase | `wkpebbkhhnlgtcpdolmw` (URL e chave `anon` fornecidas; ficam em `.env.local`, fora do git) |

Abordagens descartadas: backend próprio em Next.js (mais manutenção sem ganho para um
usuário) e armazenamento só local no aparelho (perde tudo se o celular for perdido).

## 3. Arquitetura

```
[PWA React]  --supabase-js (HTTPS, JWT do usuário)-->  [Supabase: Auth + PostgREST + Postgres/RLS]
```

- **Front-end:** React 18, Vite 5, TypeScript, Tailwind CSS 3, React Router 6, TanStack
  Query 5, date-fns, lucide-react, `vite-plugin-pwa`.
- **Back-end:** apenas Supabase. Não há servidor próprio. Regras de acesso ficam no banco (RLS).
- **Hospedagem:** Vercel ou Netlify (plano gratuito), com as variáveis `VITE_SUPABASE_URL`
  e `VITE_SUPABASE_ANON_KEY`.

### Unidades e responsabilidades

| Unidade | Arquivo | Responsabilidade | Depende de |
|---|---|---|---|
| Regras de negócio | `src/lib/domain.ts` | Tipos, geração/recalculo de parcelas, distribuição de pagamento, status, resumo do dashboard. Funções puras. | date-fns |
| Acesso a dados | `src/lib/api.ts` | Hooks TanStack Query para ler/gravar clientes, vendas e parcelas | `supabase.ts`, `domain.ts` |
| Cliente Supabase | `src/lib/supabase.ts` | Cria o client a partir das variáveis de ambiente | — |
| Formatação | `src/lib/format.ts` | R$, datas pt-BR, link de WhatsApp, leitura de valores digitados | date-fns |
| Períodos | `src/lib/periodo.ts` | Converte "Este mês", "Mês passado" etc. em intervalo de datas | date-fns |
| Tema | `src/lib/config.ts` | Claro / Escuro / Sistema, via `data-theme` no `<html>` | — |
| Componentes base | `src/components/ui.tsx` | Button, Field, Input, Select, Card, StatusBadge, Modal, Alert… no padrão do DS | tokens |
| Layout | `src/components/Layout.tsx` | Cabeçalho, menu lateral, contador de alertas | `api.ts` |
| Telas | `src/pages/*.tsx` | Uma tela por arquivo (seção 6) | tudo acima |
| Banco | `supabase/migrations/001_schema.sql` | Tabelas, índices, RLS, função `salvar_venda` | — |

## 4. Modelo de dados (Postgres)

Todas as tabelas têm `user_id uuid not null default auth.uid()` (FK `auth.users`), com
índice, e RLS habilitado.

### `clientes`
`id` uuid PK · `nome` text not null (≥1 caractere após trim) · `telefone` text · `cpf` text ·
`endereco` text · `observacao` text · `created_at` timestamptz.

### `vendas`
`id` uuid PK · `cliente_id` uuid FK → clientes **on delete restrict** (indexado) ·
`produto` text not null · `data_venda` date · `forma_pagamento` enum
(`boleto`, `cartao_credito`, `pix`, `dinheiro`) · `capital_proprio` numeric(12,2) ≥ 0 ·
`valor_venda` numeric(12,2) > 0 · `entrada` numeric(12,2) ≥ 0 e ≤ `valor_venda` ·
`num_parcelas` int ≥ 0 · `primeiro_vencimento` date (obrigatório se `num_parcelas` > 0) ·
`observacao` text · `created_at` timestamptz.

### `parcelas`
`id` uuid PK · `venda_id` uuid FK → vendas **on delete cascade** (indexado) · `numero` int ·
`vencimento` date (indexado) · `valor` numeric(12,2) > 0 · `valor_pago` numeric(12,2) ≥ 0 ·
`data_pagamento` date · `unique (venda_id, numero)`.

### Segurança (skill supabase-postgres-best-practices)
- Políticas `for all to authenticated using ((select auth.uid()) = user_id) with check (...)`
  — `auth.uid()` dentro de `select` para ser avaliado uma vez por consulta.
- Índices em todas as FKs e em `user_id`.
- Restrições `check` nos valores acima, para o banco recusar dados inválidos mesmo se o
  front falhar.
- A função `salvar_venda` é `security invoker` (respeita RLS) com `search_path` fixo.

### Valores calculados (no front, em `domain.ts`)
- `lucro = valor_venda − capital_proprio`
- Parcelas: `(valor_venda − entrada) / num_parcelas`, centavos de diferença na última;
  vencimentos mensais a partir de `primeiro_vencimento` (dia 31 → último dia do mês).
- Status da parcela: **Paga** (`valor_pago ≥ valor`) · **Atrasada** (não paga e
  `vencimento < hoje`) · **Aberta**.
- Status da venda: **Atrasada** (alguma parcela atrasada) · **Quitada** (todas pagas ou sem
  parcelas) · **Em dia**.

## 5. Fluxos e regras

- **Nova venda:** escolher cliente (ou cadastrar na hora), preencher valores, ver a prévia
  das parcelas, salvar. Venda e parcelas são gravadas numa única transação
  (`rpc salvar_venda`).
- **Editar venda:** parcelas com algum pagamento são mantidas; as demais são regeneradas com o
  saldo restante. O app recusa (com mensagem) reduzir o nº de parcelas abaixo de uma parcela
  já paga ou um valor de venda menor que o já pago.
- **Pagar:** abre com o valor restante da próxima parcela em aberto e a data de hoje; aceita
  valor diferente. Valor menor = pagamento parcial; valor maior abate as parcelas seguintes,
  em ordem. Se sobrar valor depois de quitar tudo, o app avisa e não grava o excedente.
- **Desfazer baixa:** no detalhe da venda, zera `valor_pago` e `data_pagamento` da parcela
  (com confirmação).
- **Excluir venda:** confirmação; apaga as parcelas junto.
- **Excluir cliente:** bloqueado se houver vendas (mensagem pede para excluir as vendas antes).
- **WhatsApp:** botão que abre `wa.me` com mensagem de cobrança pronta (nome, valor,
  vencimento). Sem telefone, o botão não aparece.

**Limitação conhecida:** como cada parcela guarda só o total pago e a data do último
pagamento, um pagamento parcial feito em meses diferentes conta inteiro no mês do último
pagamento nos relatórios. Aceitável no volume da loja; um histórico de pagamentos fica para
versão futura.

## 6. Telas

Cabeçalho fixo: botão de menu, logotipo centralizado, sino com nº de parcelas atrasadas ou
vencendo hoje (leva à Agenda) e configurações. Menu lateral em `surface-inverse` com logo
branca.

1. **Login** — logotipo, e-mail, senha, mensagem de erro em português.
2. **Painel (Dashboard)** — filtro de período (Hoje, Esta semana, Este mês, Mês passado,
   Este ano, Todo o período). Indicadores: total de vendas, valor vendido, valor recebido
   (entradas + parcelas pagas no período), lucro, parcelas que vencem no período, recebido de
   parcelas, total em aberto e total em atraso (esses dois sempre de todas as vendas).
3. **Clientes** — busca por nome/telefone; selo "Atrasada" em quem deve; botão novo cliente.
4. **Detalhe do cliente** — dados, total devido, vendas do cliente, editar/excluir, WhatsApp.
5. **Vendas** — busca por cliente/produto; filtro por status; cartão com cliente, produto,
   data, forma, capital próprio, venda, lucro, entrada, parcelas ("4x de R$ 280,00"),
   restantes e selo de status. Ações: Detalhes, Editar, Pagar, Excluir.
6. **Nova/Editar venda** — formulário com prévia das parcelas.
7. **Detalhe da venda** — resumo e lista de parcelas com status, pagar/desfazer por parcela.
8. **Pagar** (modal) — valor, data, resumo do que será abatido.
9. **Parcelas** — todas, com filtro Abertas / Atrasadas / Pagas / Todas.
10. **Agenda de cobranças** — grupos: Atrasadas, Vencem hoje, Próximos 7 dias, Restante do
    mês; cada item com WhatsApp e Pagar.
11. **Pesquisa** — busca única em clientes (nome, telefone, CPF) e vendas (produto).
12. **Relatórios** — por mês (últimos 12): vendido, recebido, lucro; ranking de maiores
    saldos devedores; exportar CSV de vendas e de parcelas.
13. **Configurações** — tema (Claro/Escuro/Sistema), e-mail logado, sair.

## 7. Visual (design system Franco Importados)

- **Monocromático:** `ink` sobre `bg`/`surface`; ação principal em `brand` (preto) com
  `on-brand`. Cor só como feedback funcional: `danger` para atraso, `success` para
  pago/quitado e lucro, sempre acompanhada de texto.
- **Tipografia:** Bodoni Moda (`display`) só em títulos de página ≥ 28px; Jost para todo o
  resto. Rótulos de botão, campos e selos em caixa alta com espaçamento `label` (0.14em);
  sobretítulos com `eyebrow` (0.24em). Valores com algarismos tabulares.
- **Formas:** tudo reto (`radius-none`); `radius-sm` só em selos; `radius-pill` só no
  contador de notificações. Separação por fios de 1px (`line`), sem sombras em cartões;
  `shadow-sm` no cabeçalho e `shadow-lg` em menu lateral/modais.
- **Controles:** altura 48px (`control-height`), alvos de toque ≥ 44px, foco visível de 2px.
- **Logotipo:** `franco-logo-preto.png` em fundo claro, `franco-logo-branco.png` no menu e no
  tema escuro; altura mínima 36px. Ícones do PWA gerados a partir do logotipo sobre branco.
- **Tema escuro** pelos tokens `Escuro` do DS.
- **Voz:** português, "você", frases curtas, botões no infinitivo ("Registrar pagamento"),
  sem emoji nem exclamações.
- **Revisão de UI:** antes de concluir, revisar as telas com as skills `ui-ux-pro-max`
  (acessibilidade, toque, contraste) e `web-design-guidelines`.

## 8. Erros e estados

- Toda tela trata carregando (spinner), erro (Alert `danger` com a mensagem) e vazio
  (texto dizendo o que fazer, ex.: "Nenhuma venda ainda. Toque em Nova venda.").
- Erros do Supabase são mostrados em português quando conhecidos (login inválido, cliente
  com vendas); os demais mostram a mensagem original.
- Sessão expirada leva de volta ao login.
- Sem internet: o PWA abre (shell em cache), e as consultas mostram o erro de conexão.
  Não há modo offline de escrita.

## 9. Testes

- **Unitários (Vitest)** em `src/lib/domain.test.ts`: divisão de centavos, geração de
  parcelas (entrada, dia 31, venda à vista), status, distribuição de pagamento (parcial,
  excedente, troco), recálculo na edição, resumo do dashboard; e em `format.test.ts`:
  leitura de valores ("1.234,56", "1234.56"), link de WhatsApp.
- **Verificação manual** no navegador (Playwright/Chromium do ambiente) com o Supabase real:
  login, criar cliente, criar venda, pagar, editar, excluir, tema escuro.
- `npm run build` (inclui `tsc`) sem erros antes de cada commit.

## 10. Configuração inicial (feita pelo dono)

1. No Supabase: SQL Editor → colar `supabase/migrations/001_schema.sql` → Run.
2. Authentication → Users → Add user (e-mail e senha do administrador).
3. Authentication → Sign In / Providers → desativar "Allow new users to sign up".

## 11. Fora do escopo
Emissão de boleto/Pix e baixa automática via gateway; lembretes automáticos por WhatsApp;
múltiplos usuários e acesso do cliente final; importação de planilha; histórico detalhado de
pagamentos parciais; publicação nas lojas de apps.

## 12. Estado atual do código

Antes desta revisão já foram escritos, no branch `claude/dreamy-lamport-cert07`: estrutura
do projeto (Vite, Tailwind com os tokens do DS, PWA, logotipos e ícones), `domain.ts` com
12 testes passando, `format.ts`, `periodo.ts`, `api.ts`, `config.ts`, `ui.tsx`, `Logo.tsx`,
`Layout.tsx`, `Login.tsx`, `Dashboard.tsx` e a migração SQL inicial. O plano de
implementação parte desse código e o ajusta a esta spec (ex.: RLS com `(select auth.uid())`,
índices em `user_id`, `check`s).
