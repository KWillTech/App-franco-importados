# Gestão de Clientes e Contas a Receber — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o PWA da Franco Importados para controlar clientes, vendas parceladas e contas a receber, com o visual do design system da marca.

**Architecture:** SPA React (Vite) instalável como PWA, falando direto com o Supabase (Auth + PostgREST) pelo `supabase-js`; regras de acesso no banco via RLS. Toda regra de negócio fica em funções puras em `src/lib/domain.ts` (testadas com Vitest); as telas só leem os dados com TanStack Query, chamam essas funções e renderizam com os componentes de `src/components/ui.tsx`.

**Tech Stack:** React 18, TypeScript 5 (strict), Vite 5, vite-plugin-pwa, Tailwind CSS 3, React Router 6, TanStack Query 5, date-fns 4, lucide-react, @supabase/supabase-js 2, Vitest 2, PGlite 0.5.8 (testes do SQL), Playwright 1.56.1 (verificação visual).

**Spec:** `docs/superpowers/specs/2026-10-12-gestao-clientes-contas-a-receber-design.md`

## Global Constraints

- Textos em português do Brasil, tratando por "você"; botões no infinitivo; sem emoji e sem exclamações em série.
- Cores só pelos tokens do design system via classes Tailwind (`bg-bg`, `bg-surface`, `bg-surface-raised`, `text-ink`, `text-ink-muted`, `text-ink-subtle`, `border-line`, `border-line-strong`, `bg-brand`, `text-on-brand`, `text-danger`, `bg-danger-bg`, `text-success`, `bg-success-bg`…); nunca hex cru em componentes.
- Tudo reto (`radius-none`); `rounded-sm` só em selos; `rounded-pill` só no contador de notificações e em chips de filtro. Separação por fios de 1px (`border-line`), sem sombra em cartões.
- `font-display` (Bodoni Moda) só em títulos de página (32px); todo o resto em Jost (`font-sans`). Rótulos de botão/campo/selo em caixa alta com `tracking-label` (0.14em); sobretítulos com a classe `eyebrow`.
- Cor fora do preto e branco só como feedback: `danger` para atraso/erro, `success` para pago/quitado/lucro — sempre junto de texto.
- Alvos de toque ≥ 44px; controles com 48px (`h-control`); foco visível (2px).
- Ícones `lucide-react` com `strokeWidth={1.5}`.
- Valores sempre com `brl()`, datas com `dataBR()`; algarismos tabulares (`tabular`) em números.
- A chave `anon` do Supabase só em `.env.local` (no `.gitignore`); nunca em arquivo versionado.
- `npm run build` (inclui `tsc` com `noUnusedLocals`/`noUnusedParameters`) e `npm test` passam antes de cada commit.
- Toda mensagem de commit termina com:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01WxubErkXzssFWK5K644KyL
  ```

## Review Focus

1. Valores digitados em formatos variados ("1.400", "1.400,50", "R$ 2.409,00", "280", vazio, texto) — devem virar o número que a pessoa quis dizer; "1.400" é mil e quatrocentos, não 1,4. → testes em Task 2 (`parseValor`).
2. Pagamento com valor zero, negativo ou maior que o saldo — não pode gravar nada; o modal explica o motivo. → testes em Task 3 (`distribuirPagamento`), validação no `PagarModal` (Task 6).
3. Venda incoerente (entrada maior que o valor, parcelas sem 1º vencimento, à vista com entrada menor que o total, nº de parcelas fracionado ou > 120) — recusada com mensagem clara antes de chegar ao banco, e o banco também recusa. → testes em Task 3 (`validarVenda`) e Task 1 (checks no SQL).
4. Busca com acento e maiúsculas ("claudia" acha "Cláudia"; "98287" acha "(19) 98287-2749") — a pessoa digita sem acento no celular. → testes em Task 2 (`combina`).
5. Nomes e produtos com `;`, aspas ou quebra de linha no CSV exportado — o arquivo deve abrir certo no Excel brasileiro. → testes em Task 2 (`toCsv`).

---

## Estado de partida

Já existem no branch `claude/dreamy-lamport-cert07` (não recriar, só modificar quando a task mandar):

- `package.json`, `tsconfig.json`, `vite.config.ts`, `tailwind.config.js` (tokens do DS), `postcss.config.js`, `index.html`, `.gitignore`, `.env.example`, `.env.local` (não versionado)
- `public/brand/franco-logo-preto.png`, `public/brand/franco-logo-branco.png`, `public/icon-192.png`, `public/icon-512.png`, `public/apple-touch-icon.png`
- `src/index.css` (tokens claro/escuro), `src/lib/domain.ts` + `domain.test.ts` (12 testes), `src/lib/format.ts`, `src/lib/periodo.ts`, `src/lib/api.ts`, `src/lib/supabase.ts`, `src/lib/config.ts`, `src/auth.tsx`, `src/components/ui.tsx`, `src/components/Logo.tsx`, `src/components/Layout.tsx`, `src/pages/Login.tsx`, `src/pages/Dashboard.tsx`
- `supabase/migrations/001_schema.sql` (versão inicial, será reescrita na Task 1)

Hoje `npm run build` falha porque `src/main.tsx` e `src/App.tsx` ainda não existem (Task 4).

## Mapa de arquivos

| Arquivo | Responsabilidade | Task |
|---|---|---|
| `supabase/migrations/001_schema.sql` | Tabelas, checks, índices, RLS, `salvar_venda` | 1 |
| `supabase/schema.test.ts` | Testa o SQL num Postgres em memória (PGlite) com stub do Supabase | 1 |
| `src/lib/format.ts` (+ `format.test.ts`) | R$, datas, mês, WhatsApp, mensagem de cobrança, leitura de valores, busca sem acento | 2 |
| `src/lib/csv.ts` (+ `csv.test.ts`) | Gera e baixa CSV no padrão Excel pt-BR | 2 |
| `src/lib/domain.ts` (+ testes) | Validação de venda, agenda, relatórios, devedores, rótulos de status | 3 |
| `src/main.tsx`, `src/App.tsx` | Entrada, providers e rotas | 4 (rotas crescem nas tasks 5–10) |
| `src/components/ui.tsx` | `buttonClass`, `Button`, `Chips` e demais componentes base | 4 |
| `src/pages/Configuracoes.tsx` | Tema e conta | 4 |
| `src/components/ClienteForm.tsx`, `src/pages/Clientes.tsx` | Cadastro e lista de clientes | 5 |
| `src/components/VendaCard.tsx`, `src/components/PagarModal.tsx`, `src/pages/Vendas.tsx` | Lista de vendas e registro de pagamento | 6 |
| `src/pages/VendaForm.tsx` | Nova/editar venda com prévia das parcelas | 7 |
| `src/pages/VendaDetalhe.tsx`, `src/pages/ClienteDetalhe.tsx` | Detalhes, desfazer baixa, excluir | 8 |
| `src/components/ParcelaItem.tsx`, `src/pages/Parcelas.tsx`, `src/pages/Agenda.tsx` | Parcelas e agenda de cobranças | 9 |
| `src/pages/Pesquisa.tsx`, `src/pages/Relatorios.tsx` | Busca global, relatórios e CSV | 10 |
| `e2e/smoke.mjs`, `README.md`, `CLAUDE.md`, `vercel.json`, `public/_redirects` | Verificação visual, documentação e deploy | 11 |

---

### Task 1: Banco de dados — migração revisada e testada

**Files:**
- Modify (reescrever inteiro): `supabase/migrations/001_schema.sql`
- Create: `supabase/schema.test.ts`
- Modify: `vite.config.ts` (timeout de teste), `package.json` (devDependency)

**Interfaces:**
- Consumes: nada.
- Produces: tabelas `public.clientes`, `public.vendas`, `public.parcelas` com as colunas da spec §4; enum `public.forma_pagamento`; função `public.salvar_venda(p_venda jsonb, p_parcelas jsonb) returns uuid` — `p_venda` com as colunas de `vendas` (+ `id` opcional para editar), `p_parcelas` = `[{numero, vencimento, valor}]` só com as parcelas a (re)criar. Na edição apaga as parcelas sem pagamento e insere as enviadas; erro de unicidade se o front enviar o número de uma parcela já paga.

- [ ] **Step 1: Instalar o PGlite e aumentar o timeout dos testes**

```bash
npm i -D @electric-sql/pglite@0.5.8
```

Em `vite.config.ts`, trocar:

```ts
  test: { environment: 'node' },
```

por:

```ts
  test: { environment: 'node', testTimeout: 30000 },
```

- [ ] **Step 2: Escrever os testes do SQL**

Criar `supabase/schema.test.ts`:

```ts
import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'

const SQL = readFileSync(new URL('./migrations/001_schema.sql', import.meta.url), 'utf8')
const U1 = '00000000-0000-0000-0000-000000000001'
const U2 = '00000000-0000-0000-0000-000000000002'

// Simula o que o Supabase já oferece: schema auth, auth.uid() lendo o JWT e os papéis anon/authenticated.
const SUPABASE_STUB = `
create schema auth;
create table auth.users (id uuid primary key);
create function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create role anon;
create role authenticated;
grant usage on schema auth, public to anon, authenticated;
insert into auth.users values ('${U1}'), ('${U2}');
`

let db: PGlite

async function como(usuario: string) {
  await db.exec(`reset role; set role authenticated; set request.jwt.claim.sub = '${usuario}';`)
}

async function novoCliente(nome = 'Ana') {
  const r = await db.query<{ id: string }>('insert into clientes (nome) values ($1) returning id', [nome])
  return r.rows[0].id
}

async function salvarVenda(venda: object, parcelas: object[]) {
  const r = await db.query<{ salvar_venda: string }>('select salvar_venda($1::jsonb, $2::jsonb)', [
    JSON.stringify(venda),
    JSON.stringify(parcelas),
  ])
  return r.rows[0].salvar_venda
}

const vendaBase = (cliente_id: string) => ({
  cliente_id,
  produto: 'iPhone 16',
  data_venda: '2026-10-01',
  forma_pagamento: 'boleto',
  capital_proprio: 600,
  valor_venda: 1000,
  entrada: 400,
  num_parcelas: 3,
  primeiro_vencimento: '2026-11-01',
  observacao: null,
})

const tresParcelas = [1, 2, 3].map((n) => ({ numero: n, vencimento: `2027-0${n}-01`, valor: 200 }))

beforeEach(async () => {
  db = new PGlite()
  await db.exec(SUPABASE_STUB)
  await db.exec(SQL)
  await db.exec('grant all on all tables in schema public to authenticated;')
})

describe('schema', () => {
  it('cria a venda e as parcelas numa única chamada, com o dono preenchido', async () => {
    await como(U1)
    const id = await salvarVenda(vendaBase(await novoCliente()), tresParcelas)
    const venda = await db.query<{ user_id: string }>('select user_id from vendas where id = $1', [id])
    const parcelas = await db.query('select * from parcelas where venda_id = $1', [id])
    expect(venda.rows[0].user_id).toBe(U1)
    expect(parcelas.rows).toHaveLength(3)
  })

  it('cada usuário só enxerga e altera os próprios dados', async () => {
    await como(U1)
    const id = await novoCliente()
    await como(U2)
    expect((await db.query('select * from clientes')).rows).toHaveLength(0)
    const r = await db.query("update clientes set nome = 'x' where id = $1", [id])
    expect(r.affectedRows).toBe(0)
    await expect(db.query('insert into clientes (nome, user_id) values ($1, $2)', ['Bia', U1])).rejects.toThrow()
  })

  it('recusa dados inválidos', async () => {
    await como(U1)
    const c = await novoCliente()
    await expect(salvarVenda({ ...vendaBase(c), entrada: 1500 }, [])).rejects.toThrow()
    await expect(salvarVenda({ ...vendaBase(c), primeiro_vencimento: null }, tresParcelas)).rejects.toThrow()
    await expect(salvarVenda({ ...vendaBase(c), num_parcelas: 121 }, [])).rejects.toThrow()
    await expect(novoCliente('   ')).rejects.toThrow()
  })

  it('na edição mantém as parcelas pagas e recria as demais', async () => {
    await como(U1)
    const c = await novoCliente()
    const id = await salvarVenda(vendaBase(c), tresParcelas)
    await db.query('update parcelas set valor_pago = 200, data_pagamento = $2 where venda_id = $1 and numero = 1', [id, '2026-11-01'])
    const novas = [2, 3, 4].map((n) => ({ numero: n, vencimento: `2027-0${n}-01`, valor: 133.33 }))
    await salvarVenda({ ...vendaBase(c), id, num_parcelas: 4 }, novas)
    const r = await db.query<{ numero: number; valor_pago: string }>(
      'select numero, valor_pago from parcelas where venda_id = $1 order by numero',
      [id],
    )
    expect(r.rows.map((p) => [p.numero, Number(p.valor_pago)])).toEqual([
      [1, 200],
      [2, 0],
      [3, 0],
      [4, 0],
    ])
  })

  it('não sobrescreve uma parcela paga se o front reenviar o mesmo número', async () => {
    await como(U1)
    const c = await novoCliente()
    const id = await salvarVenda(vendaBase(c), tresParcelas)
    await db.query('update parcelas set valor_pago = 200 where venda_id = $1 and numero = 1', [id])
    await expect(salvarVenda({ ...vendaBase(c), id }, tresParcelas)).rejects.toThrow()
  })

  it('não exclui cliente com vendas, e excluir a venda apaga as parcelas', async () => {
    await como(U1)
    const c = await novoCliente()
    const id = await salvarVenda(vendaBase(c), tresParcelas)
    await expect(db.query('delete from clientes where id = $1', [c])).rejects.toMatchObject({ code: '23503' })
    await db.query('delete from vendas where id = $1', [id])
    expect((await db.query('select * from parcelas')).rows).toHaveLength(0)
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run supabase/schema.test.ts`
Expected: FAIL — o SQL atual não tem os `check`s nem `on conflict` seguro (testes "recusa dados inválidos" e "não sobrescreve uma parcela paga" falham; os demais podem falhar pelo `revoke ... from anon` ainda inexistente — qualquer falha serve).

- [ ] **Step 4: Reescrever a migração**

Substituir todo o conteúdo de `supabase/migrations/001_schema.sql` por:

```sql
-- Franco Importados: clientes, vendas e parcelas.
-- Rode uma vez no Supabase: Dashboard > SQL Editor > New query > colar > Run.

create type public.forma_pagamento as enum ('boleto', 'cartao_credito', 'pix', 'dinheiro');

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (length(trim(nome)) > 0),
  telefone text,
  cpf text,
  endereco text,
  observacao text,
  created_at timestamptz not null default now()
);

create table public.vendas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete restrict,
  produto text not null check (length(trim(produto)) > 0),
  data_venda date not null default current_date,
  forma_pagamento public.forma_pagamento not null default 'boleto',
  capital_proprio numeric(12,2) not null default 0 check (capital_proprio >= 0),
  valor_venda numeric(12,2) not null check (valor_venda > 0),
  entrada numeric(12,2) not null default 0 check (entrada >= 0),
  num_parcelas int not null default 0 check (num_parcelas between 0 and 120),
  primeiro_vencimento date,
  observacao text,
  created_at timestamptz not null default now(),
  constraint entrada_ate_valor check (entrada <= valor_venda),
  constraint vencimento_se_parcelado check (num_parcelas = 0 or primeiro_vencimento is not null)
);

create table public.parcelas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  venda_id uuid not null references public.vendas (id) on delete cascade,
  numero int not null check (numero > 0),
  vencimento date not null,
  valor numeric(12,2) not null check (valor > 0),
  valor_pago numeric(12,2) not null default 0 check (valor_pago >= 0),
  data_pagamento date,
  -- também serve de índice para a FK venda_id (coluna líder)
  unique (venda_id, numero)
);

-- Índices nas FKs e nas colunas usadas pelas políticas RLS.
create index clientes_user_id_idx on public.clientes (user_id);
create index vendas_user_id_idx on public.vendas (user_id);
create index vendas_cliente_id_idx on public.vendas (cliente_id);
create index parcelas_user_id_idx on public.parcelas (user_id);
create index parcelas_vencimento_idx on public.parcelas (vencimento);

alter table public.clientes enable row level security;
alter table public.vendas enable row level security;
alter table public.parcelas enable row level security;

-- (select auth.uid()) é avaliado uma vez por consulta, não por linha.
create policy clientes_dono on public.clientes for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy vendas_dono on public.vendas for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy parcelas_dono on public.parcelas for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Cria ou edita a venda e grava as parcelas numa única transação.
-- p_parcelas: só as parcelas a (re)criar: [{"numero":1,"vencimento":"2026-11-10","valor":280.00}, ...].
-- Na edição, parcelas com pagamento são preservadas; reenviar o número de uma delas dá erro de unicidade.
create or replace function public.salvar_venda(p_venda jsonb, p_parcelas jsonb)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_id uuid := nullif(p_venda->>'id', '')::uuid;
begin
  if v_id is null then
    insert into public.vendas (cliente_id, produto, data_venda, forma_pagamento, capital_proprio,
                               valor_venda, entrada, num_parcelas, primeiro_vencimento, observacao)
    values ((p_venda->>'cliente_id')::uuid,
            p_venda->>'produto',
            (p_venda->>'data_venda')::date,
            (p_venda->>'forma_pagamento')::public.forma_pagamento,
            (p_venda->>'capital_proprio')::numeric,
            (p_venda->>'valor_venda')::numeric,
            (p_venda->>'entrada')::numeric,
            (p_venda->>'num_parcelas')::int,
            nullif(p_venda->>'primeiro_vencimento', '')::date,
            p_venda->>'observacao')
    returning id into v_id;
  else
    update public.vendas set
      cliente_id = (p_venda->>'cliente_id')::uuid,
      produto = p_venda->>'produto',
      data_venda = (p_venda->>'data_venda')::date,
      forma_pagamento = (p_venda->>'forma_pagamento')::public.forma_pagamento,
      capital_proprio = (p_venda->>'capital_proprio')::numeric,
      valor_venda = (p_venda->>'valor_venda')::numeric,
      entrada = (p_venda->>'entrada')::numeric,
      num_parcelas = (p_venda->>'num_parcelas')::int,
      primeiro_vencimento = nullif(p_venda->>'primeiro_vencimento', '')::date,
      observacao = p_venda->>'observacao'
    where id = v_id;
    if not found then
      raise exception 'Venda não encontrada';
    end if;
    delete from public.parcelas where venda_id = v_id and valor_pago = 0;
  end if;

  insert into public.parcelas (venda_id, numero, vencimento, valor)
  select v_id, (p->>'numero')::int, (p->>'vencimento')::date, (p->>'valor')::numeric
  from jsonb_array_elements(p_parcelas) as p;

  return v_id;
end;
$$;

revoke execute on function public.salvar_venda(jsonb, jsonb) from public, anon;
grant execute on function public.salvar_venda(jsonb, jsonb) to authenticated;
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run supabase/schema.test.ts`
Expected: PASS (6 testes).

- [ ] **Step 6: Commit**

```bash
git add supabase/ vite.config.ts package.json package-lock.json
git commit -m "feat(db): migração com checks, índices e RLS otimizada, testada com PGlite"
```

---

### Task 2: Formatação, busca e CSV

**Files:**
- Modify (reescrever inteiro): `src/lib/format.ts`
- Create: `src/lib/format.test.ts`, `src/lib/csv.ts`, `src/lib/csv.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces (`format.ts`): `brl(v: number | string | null | undefined): string`, `dataBR(d: string | null | undefined): string` (o antigo `data` foi renomeado para não colidir com `data` do TanStack Query), `dataExtenso(d: string): string`, `mesAno(m: string /* yyyy-MM */): string`, `soDigitos(s: string | null | undefined): string`, `whatsapp(telefone: string | null | undefined, mensagem?: string): string | null`, `mensagemCobranca(nome: string, valor: number, vencimento?: string | null): string`, `parseValor(s: string): number` (nunca negativo), `valorInput(n: number | null | undefined): string`, `normalizar(s: string | null | undefined): string`, `combina(busca: string, ...campos: (string | null | undefined)[]): boolean`.
- Produces (`csv.ts`): `type Celula = string | number | null | undefined`, `toCsv(linhas: Celula[][]): string`, `baixarCsv(nome: string, linhas: Celula[][]): void`.

- [ ] **Step 1: Escrever os testes**

Criar `src/lib/format.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { brl, combina, mensagemCobranca, mesAno, parseValor, whatsapp } from './format'

describe('parseValor', () => {
  it.each([
    ['1.400', 1400],
    ['1.400,50', 1400.5],
    ['12.345.678', 12345678],
    ['280', 280],
    ['280,5', 280.5],
    ['1234.56', 1234.56],
    ['1.5', 1.5],
    ['R$ 2.409,00', 2409],
    ['  300 ', 300],
    ['', 0],
    ['abc', 0],
    ['-50', 0],
  ])('"%s" vira %s', (entrada, esperado) => {
    expect(parseValor(entrada)).toBe(esperado)
  })
})

describe('whatsapp', () => {
  it('acrescenta o DDI 55 a números com DDD', () => {
    expect(whatsapp('(19) 98287-2749')).toBe('https://wa.me/5519982872749')
  })
  it('mantém números que já têm DDI', () => {
    expect(whatsapp('+55 19 98287-2749')).toBe('https://wa.me/5519982872749')
  })
  it('sem telefone não gera link', () => {
    expect(whatsapp(null)).toBeNull()
    expect(whatsapp('')).toBeNull()
  })
  it('codifica a mensagem', () => {
    expect(whatsapp('19982872749', 'Olá, tudo bem?')).toBe('https://wa.me/5519982872749?text=Ol%C3%A1%2C%20tudo%20bem%3F')
  })
})

describe('mensagemCobranca', () => {
  it('usa o primeiro nome, o valor e o vencimento', () => {
    const msg = mensagemCobranca('Ana Paula Souza', 280, '2026-11-01')
    expect(msg).toContain('Olá, Ana,')
    expect(msg).toContain(brl(280))
    expect(msg).toContain('01/11/2026')
    expect(msg).not.toContain('!')
  })
})

describe('mesAno', () => {
  it('formata em português', () => {
    expect(mesAno('2026-10')).toBe('out de 2026')
  })
})

describe('combina', () => {
  it('ignora acentos e maiúsculas', () => {
    expect(combina('claudia', 'Cláudia Campo Bello')).toBe(true)
    expect(combina('CAMPO cláudia', 'Cláudia Campo Bello')).toBe(true)
  })
  it('procura em vários campos', () => {
    expect(combina('iphone', 'Ana', 'iPhone 16 branco')).toBe(true)
    expect(combina('98287', 'Ana', '(19) 98287-2749')).toBe(true)
  })
  it('acha telefone digitado só com números', () => {
    expect(combina('19982872749', 'Ana', '(19) 98287-2749')).toBe(true)
  })
  it('busca vazia combina com tudo; termo ausente não combina', () => {
    expect(combina('  ', 'Ana')).toBe(true)
    expect(combina('pedro', 'Ana', null)).toBe(false)
  })
})
```

Criar `src/lib/csv.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('usa ponto e vírgula, vírgula decimal e escapa campos especiais', () => {
    const csv = toCsv([
      ['Nome', 'Valor'],
      ['Ana; "Bia"', 1400.5],
      ['Linha\nnova', 4],
      [null, 280],
      [undefined, 0.1],
    ])
    expect(csv).toBe('Nome;Valor\r\n"Ana; ""Bia""";1400,50\r\n"Linha\nnova";4\r\n;280\r\n;0,10')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/format.test.ts src/lib/csv.test.ts`
Expected: FAIL — `mensagemCobranca`, `mesAno`, `combina` não existem; `./csv` não existe; `parseValor('1.400')` devolve 1.4.

- [ ] **Step 3: Implementar**

Substituir `src/lib/format.ts` por:

```ts
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const brl = (v: number | string | null | undefined) => moeda.format(Number(v ?? 0))

export const dataBR = (d: string | null | undefined) => (d ? format(parseISO(d), 'dd/MM/yyyy') : '—')

export const dataExtenso = (d: string) => format(parseISO(d), "EEEE, dd 'de' MMMM", { locale: ptBR })

/** "2026-10" → "out de 2026". */
export const mesAno = (m: string) => format(parseISO(`${m}-01`), "MMM 'de' yyyy", { locale: ptBR })

export const soDigitos = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '')

/** Link do WhatsApp; assume DDI 55 quando o número tem até 11 dígitos. */
export function whatsapp(telefone: string | null | undefined, mensagem?: string) {
  let n = soDigitos(telefone)
  if (!n) return null
  if (n.length <= 11) n = '55' + n
  return `https://wa.me/${n}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''}`
}

export function mensagemCobranca(nome: string, valor: number, vencimento?: string | null) {
  const primeiro = nome.trim().split(/\s+/)[0]
  const quando = vencimento ? ` com vencimento em ${dataBR(vencimento)}` : ''
  return `Olá, ${primeiro}, tudo bem? Passando para lembrar da parcela de ${brl(valor)}${quando}. Qualquer dúvida, estou à disposição. Franco Importados`
}

/**
 * Converte o que a pessoa digitou em número: "1.234,56", "1.400" (mil e quatrocentos),
 * "1234.56", "R$ 280". Vazio, texto ou negativo viram 0.
 */
export function parseValor(s: string): number {
  let t = s.replace(/[^\d.,-]/g, '')
  if (!t || t.startsWith('-')) return 0
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '')
  const n = Number(t)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

export const valorInput = (n: number | null | undefined) =>
  n ? Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''

/** Minúsculas e sem acentos, para comparar buscas. */
export const normalizar = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Todos os termos da busca aparecem em algum dos campos (ou os dígitos batem com um telefone/CPF). */
export function combina(busca: string, ...campos: (string | null | undefined)[]) {
  const termos = normalizar(busca).split(/\s+/).filter(Boolean)
  if (termos.length === 0) return true
  const alvo = campos.map(normalizar).join(' ')
  if (termos.every((t) => alvo.includes(t))) return true
  const digitos = soDigitos(busca)
  return digitos.length >= 3 && campos.some((c) => soDigitos(c).includes(digitos))
}
```

Criar `src/lib/csv.ts`:

```ts
export type Celula = string | number | null | undefined

function celula(v: Celula): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',')
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

/** CSV no padrão do Excel em português: separador ";" e vírgula decimal. */
export function toCsv(linhas: Celula[][]): string {
  return linhas.map((l) => l.map(celula).join(';')).join('\r\n')
}

export function baixarCsv(nome: string, linhas: Celula[][]) {
  // O BOM faz o Excel reconhecer UTF-8 (acentos).
  const blob = new Blob(['﻿' + toCsv(linhas)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib`
Expected: PASS (testes de format, csv e os 12 de domain).

- [ ] **Step 5: Commit**

```bash
git add src/lib/format.ts src/lib/format.test.ts src/lib/csv.ts src/lib/csv.test.ts
git commit -m "feat: leitura de valores em pt-BR, busca sem acento, cobrança por WhatsApp e CSV"
```

---

### Task 3: Regras de negócio para as telas

**Files:**
- Modify: `src/lib/domain.ts` (import do topo, `distribuirPagamento`, novas funções no fim)
- Modify: `src/lib/domain.test.ts` (import do topo, novos testes no fim)

**Interfaces:**
- Consumes: tipos já existentes em `domain.ts` (`Cliente`, `Parcela`, `VendaCompleta`, `StatusVenda`, `StatusParcela`), `restante`, `statusParcela`, `round2`, `lucro`, `hoje`.
- Produces:
  - `ROTULO_STATUS: Record<StatusVenda | StatusParcela, string>`
  - `interface DadosVenda { clienteId: string; produto: string; valorVenda: number; entrada: number; capitalProprio: number; numParcelas: number; primeiroVencimento: string }`
  - `validarVenda(v: DadosVenda): string | null` — mensagem do primeiro problema ou `null`
  - `distribuirPagamento(...)` agora devolve `{ updates: [], troco: 0 }` para valor ≤ 0
  - `interface ItemAgenda { venda: VendaCompleta; parcela: Parcela }`
  - `interface Agenda { atrasadas: ItemAgenda[]; hoje: ItemAgenda[]; semana: ItemAgenda[]; mes: ItemAgenda[] }`
  - `agruparAgenda(vendas: VendaCompleta[], ref?: string): Agenda`
  - `interface LinhaMensal { mes: string; vendido: number; recebido: number; lucro: number }`
  - `resumoMensal(vendas: VendaCompleta[], meses?: number, ref?: string): LinhaMensal[]` (mês atual primeiro)
  - `interface Devedor { cliente: Cliente; saldo: number; atrasado: number }`
  - `maioresDevedores(vendas: VendaCompleta[], limite?: number, ref?: string): Devedor[]`
  - `saldoPorCliente(vendas: VendaCompleta[], ref?: string): Map<string, number>`
  - `clientesComAtraso(vendas: VendaCompleta[], ref?: string): Set<string>`

- [ ] **Step 1: Escrever os testes**

Em `src/lib/domain.test.ts`, trocar o bloco de import do topo por:

```ts
import { describe, expect, it } from 'vitest'
import {
  agruparAgenda,
  clientesComAtraso,
  dividir,
  distribuirPagamento,
  gerarParcelas,
  maioresDevedores,
  recalcularParcelas,
  resumo,
  resumoMensal,
  saldoPorCliente,
  statusParcela,
  statusVenda,
  validarVenda,
  type Cliente,
  type Parcela,
  type VendaCompleta,
} from './domain'
```

E acrescentar no fim do arquivo:

```ts
const cli = (id: string, nome: string): Cliente => ({
  id,
  nome,
  telefone: null,
  cpf: null,
  endereco: null,
  observacao: null,
  created_at: '',
})

const venda = (o: Partial<VendaCompleta> & { parcelas: Parcela[] }): VendaCompleta => ({
  id: 'v1',
  cliente_id: 'c1',
  cliente: cli('c1', 'Ana'),
  produto: 'iPhone',
  data_venda: '2026-10-01',
  forma_pagamento: 'boleto',
  capital_proprio: 600,
  valor_venda: 1000,
  entrada: 400,
  num_parcelas: o.parcelas.length,
  primeiro_vencimento: '2026-10-01',
  observacao: null,
  created_at: '',
  ...o,
})

describe('validarVenda', () => {
  const ok = {
    clienteId: 'c1',
    produto: 'iPhone',
    valorVenda: 1000,
    entrada: 200,
    capitalProprio: 600,
    numParcelas: 4,
    primeiroVencimento: '2026-11-01',
  }

  it('aceita uma venda válida', () => {
    expect(validarVenda(ok)).toBeNull()
    expect(validarVenda({ ...ok, entrada: 1000, numParcelas: 0, primeiroVencimento: '' })).toBeNull()
  })

  it.each([
    [{ clienteId: '' }, 'Escolha o cliente.'],
    [{ produto: '   ' }, 'Informe o produto.'],
    [{ valorVenda: 0 }, 'Informe o valor da venda.'],
    [{ entrada: 1200 }, 'A entrada não pode ser maior que o valor da venda.'],
    [{ numParcelas: 2.5 }, 'O número de parcelas deve ser um número inteiro de 0 a 120.'],
    [{ numParcelas: 121 }, 'O número de parcelas deve ser um número inteiro de 0 a 120.'],
    [{ numParcelas: 0 }, 'Venda à vista: a entrada deve ser igual ao valor da venda.'],
    [{ entrada: 1000 }, 'A entrada já cobre o valor da venda: use 0 parcelas.'],
    [{ primeiroVencimento: '' }, 'Informe o 1º vencimento.'],
  ])('recusa %o', (troca, mensagem) => {
    expect(validarVenda({ ...ok, ...troca })).toBe(mensagem)
  })
})

describe('distribuirPagamento com valor inválido', () => {
  it('não grava nada para zero ou negativo', () => {
    const ps = [parcela({ numero: 1 })]
    expect(distribuirPagamento(ps, 0, '2026-10-05')).toEqual({ updates: [], troco: 0 })
    expect(distribuirPagamento(ps, -10, '2026-10-05')).toEqual({ updates: [], troco: 0 })
  })
})

describe('agruparAgenda', () => {
  it('separa atrasadas, hoje, próximos 7 dias e restante do mês', () => {
    const v = venda({
      parcelas: [
        parcela({ id: 'a', numero: 1, vencimento: '2026-10-01' }),
        parcela({ id: 'b', numero: 2, vencimento: '2026-10-12' }),
        parcela({ id: 'c', numero: 3, vencimento: '2026-10-19' }),
        parcela({ id: 'd', numero: 4, vencimento: '2026-10-25' }),
        parcela({ id: 'e', numero: 5, vencimento: '2026-11-05' }),
        parcela({ id: 'f', numero: 6, vencimento: '2026-10-02', valor_pago: 100 }),
      ],
    })
    const g = agruparAgenda([v], '2026-10-12')
    const ids = (xs: { parcela: Parcela }[]) => xs.map((x) => x.parcela.id)
    expect(ids(g.atrasadas)).toEqual(['a'])
    expect(ids(g.hoje)).toEqual(['b'])
    expect(ids(g.semana)).toEqual(['c'])
    expect(ids(g.mes)).toEqual(['d'])
  })
})

describe('resumoMensal', () => {
  it('soma vendido, lucro e recebido (entradas + parcelas) por mês', () => {
    const outubro = venda({
      parcelas: [parcela({ numero: 1, valor: 200, valor_pago: 200, data_pagamento: '2026-10-02' })],
    })
    const setembro = venda({
      id: 'v2',
      data_venda: '2026-09-10',
      valor_venda: 500,
      capital_proprio: 300,
      entrada: 100,
      parcelas: [parcela({ numero: 1, valor: 400, valor_pago: 100, data_pagamento: '2026-10-05' })],
    })
    expect(resumoMensal([outubro, setembro], 2, '2026-10-20')).toEqual([
      { mes: '2026-10', vendido: 1000, recebido: 700, lucro: 400 },
      { mes: '2026-09', vendido: 500, recebido: 100, lucro: 200 },
    ])
  })
})

describe('devedores', () => {
  const vendas = [
    venda({
      parcelas: [
        parcela({ numero: 1, valor: 200, vencimento: '2026-10-01' }),
        parcela({ numero: 2, valor: 200, vencimento: '2026-11-01' }),
      ],
    }),
    venda({ id: 'v2', cliente_id: 'c2', cliente: cli('c2', 'Bia'), parcelas: [parcela({ valor: 300, vencimento: '2026-11-01' })] }),
    venda({ id: 'v3', cliente_id: 'c3', cliente: cli('c3', 'Caio'), parcelas: [parcela({ valor: 300, valor_pago: 300 })] }),
  ]

  it('ordena por saldo e separa o que está atrasado', () => {
    expect(maioresDevedores(vendas, 10, '2026-10-12').map((d) => [d.cliente.id, d.saldo, d.atrasado])).toEqual([
      ['c1', 400, 200],
      ['c2', 300, 0],
    ])
  })

  it('expõe saldo por cliente e quem está em atraso', () => {
    expect(saldoPorCliente(vendas, '2026-10-12').get('c2')).toBe(300)
    expect([...clientesComAtraso(vendas, '2026-10-12')]).toEqual(['c1'])
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run src/lib/domain.test.ts`
Expected: FAIL — `validarVenda`, `agruparAgenda`, `resumoMensal`, `maioresDevedores`, `saldoPorCliente`, `clientesComAtraso` não existem.

- [ ] **Step 3: Implementar**

Em `src/lib/domain.ts`, trocar a primeira linha:

```ts
import { addMonths, format, parseISO } from 'date-fns'
```

por:

```ts
import { addDays, addMonths, endOfMonth, format, parseISO, subMonths } from 'date-fns'
```

Logo depois do tipo `StatusVenda`, acrescentar:

```ts
export const ROTULO_STATUS: Record<StatusVenda | StatusParcela, string> = {
  em_dia: 'Em dia',
  aberta: 'Aberta',
  atrasada: 'Atrasada',
  quitada: 'Quitada',
  paga: 'Paga',
}
```

Em `distribuirPagamento`, trocar:

```ts
export function distribuirPagamento(parcelas: Parcela[], valor: number, data: string) {
  let sobra = cents(valor)
```

por:

```ts
export function distribuirPagamento(parcelas: Parcela[], valor: number, data: string) {
  let sobra = cents(valor)
  if (sobra <= 0) return { updates: [] as AtualizacaoParcela[], troco: 0 }
```

Acrescentar no fim do arquivo:

```ts
export interface DadosVenda {
  clienteId: string
  produto: string
  valorVenda: number
  entrada: number
  capitalProprio: number
  numParcelas: number
  primeiroVencimento: string
}

/** Primeiro problema encontrado na venda, ou null se estiver tudo certo. */
export function validarVenda(v: DadosVenda): string | null {
  if (!v.clienteId) return 'Escolha o cliente.'
  if (!v.produto.trim()) return 'Informe o produto.'
  if (!(v.valorVenda > 0)) return 'Informe o valor da venda.'
  if (v.entrada > v.valorVenda) return 'A entrada não pode ser maior que o valor da venda.'
  if (!Number.isInteger(v.numParcelas) || v.numParcelas < 0 || v.numParcelas > 120) {
    return 'O número de parcelas deve ser um número inteiro de 0 a 120.'
  }
  if (v.numParcelas === 0 && round2(v.entrada) !== round2(v.valorVenda)) {
    return 'Venda à vista: a entrada deve ser igual ao valor da venda.'
  }
  if (v.numParcelas > 0 && round2(v.entrada) === round2(v.valorVenda)) {
    return 'A entrada já cobre o valor da venda: use 0 parcelas.'
  }
  if (v.numParcelas > 0 && !v.primeiroVencimento) return 'Informe o 1º vencimento.'
  return null
}

export interface ItemAgenda {
  venda: VendaCompleta
  parcela: Parcela
}

export interface Agenda {
  atrasadas: ItemAgenda[]
  hoje: ItemAgenda[]
  semana: ItemAgenda[]
  mes: ItemAgenda[]
}

/** Parcelas em aberto agrupadas: atrasadas, vencem hoje, próximos 7 dias, restante do mês. */
export function agruparAgenda(vendas: VendaCompleta[], ref = hoje()): Agenda {
  const em7 = format(addDays(parseISO(ref), 7), 'yyyy-MM-dd')
  const fimMes = format(endOfMonth(parseISO(ref)), 'yyyy-MM-dd')
  const g: Agenda = { atrasadas: [], hoje: [], semana: [], mes: [] }
  const itens = vendas
    .flatMap((venda) => venda.parcelas.filter((p) => restante(p) > 0).map((parcela) => ({ venda, parcela })))
    .sort((a, b) => a.parcela.vencimento.localeCompare(b.parcela.vencimento))
  for (const item of itens) {
    const d = item.parcela.vencimento
    if (d < ref) g.atrasadas.push(item)
    else if (d === ref) g.hoje.push(item)
    else if (d <= em7) g.semana.push(item)
    else if (d <= fimMes) g.mes.push(item)
  }
  return g
}

export interface LinhaMensal {
  mes: string // yyyy-MM
  vendido: number
  recebido: number
  lucro: number
}

/** Últimos `meses` meses, do atual para trás. Recebido = entradas das vendas do mês + parcelas pagas no mês. */
export function resumoMensal(vendas: VendaCompleta[], meses = 12, ref = hoje()): LinhaMensal[] {
  const base = parseISO(ref)
  const linhas = new Map<string, LinhaMensal>()
  for (let i = 0; i < meses; i++) {
    const mes = format(subMonths(base, i), 'yyyy-MM')
    linhas.set(mes, { mes, vendido: 0, recebido: 0, lucro: 0 })
  }
  for (const v of vendas) {
    const l = linhas.get(v.data_venda.slice(0, 7))
    if (l) {
      l.vendido += Number(v.valor_venda)
      l.lucro += lucro(v)
      l.recebido += Number(v.entrada)
    }
    for (const p of v.parcelas) {
      const lp = p.data_pagamento ? linhas.get(p.data_pagamento.slice(0, 7)) : undefined
      if (lp) lp.recebido += Number(p.valor_pago)
    }
  }
  return [...linhas.values()].map((l) => ({
    ...l,
    vendido: round2(l.vendido),
    recebido: round2(l.recebido),
    lucro: round2(l.lucro),
  }))
}

export interface Devedor {
  cliente: Cliente
  saldo: number
  atrasado: number
}

/** Clientes com saldo em aberto, do maior para o menor. */
export function maioresDevedores(vendas: VendaCompleta[], limite = 10, ref = hoje()): Devedor[] {
  const mapa = new Map<string, Devedor>()
  for (const v of vendas) {
    for (const p of v.parcelas) {
      const r = restante(p)
      if (r === 0) continue
      const d = mapa.get(v.cliente_id) ?? { cliente: v.cliente, saldo: 0, atrasado: 0 }
      d.saldo += r
      if (statusParcela(p, ref) === 'atrasada') d.atrasado += r
      mapa.set(v.cliente_id, d)
    }
  }
  return [...mapa.values()]
    .map((d) => ({ ...d, saldo: round2(d.saldo), atrasado: round2(d.atrasado) }))
    .sort((a, b) => b.saldo - a.saldo)
    .slice(0, limite)
}

export const saldoPorCliente = (vendas: VendaCompleta[], ref = hoje()) =>
  new Map(maioresDevedores(vendas, Infinity, ref).map((d) => [d.cliente.id, d.saldo]))

export const clientesComAtraso = (vendas: VendaCompleta[], ref = hoje()) =>
  new Set(maioresDevedores(vendas, Infinity, ref).filter((d) => d.atrasado > 0).map((d) => d.cliente.id))
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run src/lib/domain.test.ts`
Expected: PASS (12 antigos + novos).

- [ ] **Step 5: Commit**

```bash
git add src/lib/domain.ts src/lib/domain.test.ts
git commit -m "feat: validação de venda, agenda de cobranças, relatório mensal e devedores"
```

---

### Task 4: Casca do app — entrada, rotas, componentes base e Configurações

**Files:**
- Create: `src/main.tsx`, `src/App.tsx`, `src/pages/Configuracoes.tsx`
- Modify (reescrever inteiro): `src/components/ui.tsx`, `src/auth.tsx`
- Modify: `src/components/Layout.tsx` (menu fechado fora do foco)

**Interfaces:**
- Consumes: `ROTULO_STATUS` (Task 3), `useTema`/`aplicarTema`/`Tema` de `src/lib/config.ts`, `Logo`, `Layout`, `Login`, `Dashboard` existentes.
- Produces:
  - `buttonClass(o?: { variant?: 'primary' | 'secondary' | 'ghost' | 'danger'; size?: 'sm' | 'md'; full?: boolean }): string` — para dar aparência de botão a `<Link>`/`<a>`
  - `Button` (props de `<button>` + `variant`, `size`, `full`)
  - `Chips<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: [T, string][] })`
  - continuam: `Card`, `Field` (`label`, `hint?`, `error?`), `Input`, `Select`, `Textarea`, `StatusBadge`, `Info`, `PageHeader` (`title`, `eyebrow?`, `subtitle?`, `action?`), `Modal` (`open`, `onClose`, `title`), `Empty`, `Loading`, `Alert` (`tone?`, `title`), `ErrorBox` (`error`), `SearchInput`
  - `src/App.tsx` com o comentário-âncora `{/* rotas */}` dentro do layout autenticado, onde as tasks seguintes inserem rotas.

- [ ] **Step 1: Confirmar a falha atual**

Run: `npm run build`
Expected: FAIL — `index.html` aponta para `/src/main.tsx`, que não existe.

- [ ] **Step 2: Reescrever os componentes base**

Substituir `src/components/ui.tsx` por:

```tsx
// Componentes base no padrão do design system Franco Importados:
// monocromático, cantos retos, rótulos em caixa alta espaçada, fios de 1px em vez de sombras.
import clsx from 'clsx'
import { X } from 'lucide-react'
import {
  useEffect,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { ROTULO_STATUS, type StatusParcela, type StatusVenda } from '@/lib/domain'

type Variante = 'primary' | 'secondary' | 'ghost' | 'danger'

const variantes: Record<Variante, string> = {
  primary: 'bg-brand text-on-brand border-transparent hover:bg-brand-hover',
  secondary: 'bg-transparent text-ink border-ink hover:bg-ink hover:text-ink-inverse',
  ghost: 'bg-transparent text-ink border-transparent underline underline-offset-[6px] decoration-1 hover:text-ink-muted',
  danger: 'bg-transparent text-danger border-danger hover:bg-danger-bg',
}

/** Classes de botão; use em <Link>/<a> que precisam parecer botão. */
export function buttonClass({ variant = 'primary', size = 'md', full }: { variant?: Variante; size?: 'sm' | 'md'; full?: boolean } = {}) {
  return clsx(
    'label inline-flex items-center justify-center gap-2 whitespace-nowrap border transition-colors duration-150',
    'disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-ink-subtle',
    size === 'sm' ? 'h-11 px-3 text-[11px]' : 'h-control px-6',
    full && 'w-full',
    variantes[variant],
  )
}

export function Button({
  variant,
  size,
  full,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variante; size?: 'sm' | 'md'; full?: boolean }) {
  return <button className={clsx(buttonClass({ variant, size, full }), className)} {...props} />
}

/** Filtros em chips (únicos elementos, com o contador, que usam radius-pill). */
export function Chips<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: [T, string][]
}) {
  return (
    <div role="radiogroup" aria-label={label} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {options.map(([v, rotulo]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={clsx(
            'h-11 shrink-0 rounded-pill border px-4 text-sm transition-colors duration-150',
            value === v ? 'border-brand bg-brand text-on-brand' : 'border-line-strong bg-surface-raised text-ink hover:border-ink',
          )}
        >
          {rotulo}
        </button>
      ))}
    </div>
  )
}

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={clsx('border border-line bg-surface-raised p-4', onClick && 'cursor-pointer transition-colors hover:border-line-strong', className)}
    >
      {children}
    </div>
  )
}

export function Field({ label, children, hint, error }: { label: string; children: ReactNode; hint?: string; error?: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="text-xs font-medium uppercase leading-4 tracking-label">{label}</span>
      {children}
      {(error || hint) && <span className={clsx('text-xs leading-4', error ? 'text-danger' : 'text-ink-subtle')}>{error || hint}</span>}
    </label>
  )
}

const campo =
  'h-control w-full border border-line-strong bg-surface-raised px-4 text-base text-ink outline-none placeholder:text-ink-subtle hover:border-ink disabled:bg-surface disabled:text-ink-subtle'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(campo, className)} {...props} />
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx(campo, 'pr-8', className)} {...props} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(campo, 'h-24 py-3')} {...props} />
}

const estilosStatus: Record<StatusVenda | StatusParcela, string> = {
  em_dia: 'bg-surface text-ink border border-line',
  aberta: 'bg-surface text-ink border border-line',
  atrasada: 'bg-danger-bg text-danger',
  quitada: 'bg-success-bg text-success',
  paga: 'bg-success-bg text-success',
}

/** Selo de status: a cor é só reforço, o texto sempre diz o estado. */
export function StatusBadge({ status }: { status: StatusVenda | StatusParcela }) {
  return (
    <span className={clsx('inline-flex shrink-0 rounded-sm px-2 py-1 text-[11px] font-medium uppercase leading-[14px] tracking-label', estilosStatus[status])}>
      {ROTULO_STATUS[status]}
    </span>
  )
}

export function Info({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs leading-4 text-ink-subtle">{label}</div>
      <div className={clsx('tabular text-sm leading-5 text-ink', className)}>{children}</div>
    </div>
  )
}

export function PageHeader({ title, eyebrow, subtitle, action }: { title: string; eyebrow?: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 border-b border-line pb-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-1 break-words font-display text-[32px] font-semibold leading-10">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto bg-surface-raised p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between border-b border-line pb-4">
          <h2 className="text-[22px] font-medium leading-[30px]">{title}</h2>
          <button onClick={onClose} className="-mr-2 flex h-11 w-11 items-center justify-center text-ink" aria-label="Fechar">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="border border-dashed border-line-strong p-8 text-center text-sm text-ink-muted">{children}</div>
}

export function Loading() {
  return (
    <div className="flex justify-center p-10" role="status" aria-label="Carregando">
      <div className="h-8 w-8 animate-spin rounded-pill border-2 border-ink border-t-transparent" />
    </div>
  )
}

export function Alert({ tone = 'danger', title, children }: { tone?: 'success' | 'warning' | 'danger' | 'info'; title: string; children?: ReactNode }) {
  const tons = {
    success: 'bg-success-bg text-success',
    warning: 'bg-warning-bg text-warning',
    danger: 'bg-danger-bg text-danger',
    info: 'bg-info-bg text-info',
  }
  return (
    <div className={clsx('flex gap-3 border border-current p-4', tons[tone])} role={tone === 'danger' ? 'alert' : 'status'}>
      <div className="flex flex-col gap-0.5 text-sm leading-5 text-ink">
        <span className="font-medium">{title}</span>
        {children}
      </div>
    </div>
  )
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null
  return <Alert title="Não foi possível concluir">{error instanceof Error ? error.message : String(error)}</Alert>
}

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
      <Input className="pl-11" type="search" {...props} />
    </div>
  )
}
```

- [ ] **Step 3: Limpar o cache de dados ao sair**

Substituir `src/auth.tsx` por:

```tsx
import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Loading } from './components/ui'
import { supabase } from './lib/supabase'

const Ctx = createContext<{ session: Session | null; carregando: boolean }>({ session: null, carregando: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCarregando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      setSession(s)
      // Não deixa dados de uma sessão aparecerem na próxima.
      if (evento === 'SIGNED_OUT') qc.clear()
    })
    return () => data.subscription.unsubscribe()
  }, [qc])
  return <Ctx.Provider value={{ session, carregando }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, carregando } = useAuth()
  if (carregando) return <Loading />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}
```

- [ ] **Step 4: Tirar o menu fechado do foco do teclado**

Em `src/components/Layout.tsx`, trocar:

```tsx
          aberto ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-hidden={!aberto}
      >
```

por:

```tsx
          aberto ? 'visible translate-x-0' : 'invisible -translate-x-full',
        )}
      >
```

- [ ] **Step 5: Criar entrada, rotas e Configurações**

Criar `src/main.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth'
import { aplicarTema } from './lib/config'
import './index.css'

aplicarTema()
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => aplicarTema())

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
```

Criar `src/App.tsx`:

```tsx
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth'
import { Layout } from './components/Layout'
import Configuracoes from './pages/Configuracoes'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        {/* rotas */}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
```

Criar `src/pages/Configuracoes.tsx`:

```tsx
import { useAuth } from '@/auth'
import { Button, Card, Field, PageHeader, Select } from '@/components/ui'
import { useTema, type Tema } from '@/lib/config'
import { supabase } from '@/lib/supabase'

export default function Configuracoes() {
  const [tema, setTema] = useTema()
  const { session } = useAuth()
  return (
    <>
      <PageHeader title="Configurações" />
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Aparência</h2>
          <Field label="Tema">
            <Select value={tema} onChange={(e) => setTema(e.target.value as Tema)}>
              <option value="sistema">Igual ao celular</option>
              <option value="claro">Claro</option>
              <option value="escuro">Escuro</option>
            </Select>
          </Field>
        </Card>
        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Conta</h2>
          <p className="text-sm text-ink-muted">Conectado como {session?.user.email}</p>
          <Button variant="secondary" onClick={() => supabase.auth.signOut()}>
            Sair
          </Button>
        </Card>
      </div>
    </>
  )
}
```

- [ ] **Step 6: Build e testes passam**

Run: `npm run build && npm test`
Expected: build OK (gera `dist/` com `manifest.webmanifest` e `sw.js`); todos os testes PASS.

- [ ] **Step 7: Commit**

```bash
git add src/
git commit -m "feat: entrada do app, rotas, componentes base do DS e tela de configurações"
```

---

### Task 5: Clientes — lista e cadastro

**Files:**
- Create: `src/components/ClienteForm.tsx`, `src/pages/Clientes.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useClientes`, `useVendas`, `useSalvarCliente` (`src/lib/api.ts`), `clientesComAtraso`, `saldoPorCliente`, `Cliente` (Task 3), `brl`, `combina` (Task 2), `Button`, `Field`, `Input`, `Textarea`, `Modal`, `ErrorBox`, `Empty`, `Loading`, `PageHeader`, `SearchInput`, `StatusBadge` (Task 4).
- Produces: `ClienteForm({ cliente?: Cliente | null; onClose: () => void; onSaved?: (c: Cliente) => void })` — modal sempre aberto enquanto montado (o pai monta/desmonta). Rota `/clientes`.

- [ ] **Step 1: Registrar a rota (falha esperada)**

Em `src/App.tsx`, acrescentar o import depois de `import { Layout } from './components/Layout'`:

```tsx
import Clientes from './pages/Clientes'
```

e trocar `{/* rotas */}` por:

```tsx
        <Route path="clientes" element={<Clientes />} />
        {/* rotas */}
```

- [ ] **Step 2: Ver falhar**

Run: `npm run build`
Expected: FAIL — `Cannot find module './pages/Clientes'`.

- [ ] **Step 3: Implementar**

Criar `src/components/ClienteForm.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import { useSalvarCliente } from '@/lib/api'
import type { Cliente } from '@/lib/domain'
import { Button, ErrorBox, Field, Input, Modal, Textarea } from './ui'

const vazio = (s: string) => s.trim() || null

export function ClienteForm({ cliente, onClose, onSaved }: { cliente?: Cliente | null; onClose: () => void; onSaved?: (c: Cliente) => void }) {
  const salvar = useSalvarCliente()
  const [nome, setNome] = useState(cliente?.nome ?? '')
  const [telefone, setTelefone] = useState(cliente?.telefone ?? '')
  const [cpf, setCpf] = useState(cliente?.cpf ?? '')
  const [endereco, setEndereco] = useState(cliente?.endereco ?? '')
  const [observacao, setObservacao] = useState(cliente?.observacao ?? '')
  const [erroNome, setErroNome] = useState<string>()

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return setErroNome('Informe o nome do cliente.')
    try {
      const salvo = await salvar.mutateAsync({
        id: cliente?.id,
        nome: nome.trim(),
        telefone: vazio(telefone),
        cpf: vazio(cpf),
        endereco: vazio(endereco),
        observacao: vazio(observacao),
      })
      onSaved?.(salvo)
      onClose()
    } catch {
      // o erro aparece no ErrorBox abaixo
    }
  }

  return (
    <Modal open onClose={onClose} title={cliente ? 'Editar cliente' : 'Novo cliente'}>
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <Field label="Nome" error={erroNome}>
          <Input
            value={nome}
            onChange={(e) => {
              setNome(e.target.value)
              setErroNome(undefined)
            }}
            autoComplete="off"
            autoFocus
          />
        </Field>
        <Field label="Telefone / WhatsApp" hint="Com DDD, ex.: (19) 98287-2749">
          <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" autoComplete="off" />
        </Field>
        <Field label="CPF">
          <Input value={cpf} onChange={(e) => setCpf(e.target.value)} inputMode="numeric" autoComplete="off" />
        </Field>
        <Field label="Endereço">
          <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Observação">
          <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </Field>
        <ErrorBox error={salvar.error} />
        <Button full disabled={salvar.isPending}>
          {salvar.isPending ? 'Salvando…' : 'Salvar cliente'}
        </Button>
      </form>
    </Modal>
  )
}
```

Criar `src/pages/Clientes.tsx`:

```tsx
import { ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ClienteForm } from '@/components/ClienteForm'
import { Button, Empty, ErrorBox, Loading, PageHeader, SearchInput, StatusBadge } from '@/components/ui'
import { useClientes, useVendas } from '@/lib/api'
import { clientesComAtraso, saldoPorCliente } from '@/lib/domain'
import { brl, combina } from '@/lib/format'

export default function Clientes() {
  const clientes = useClientes()
  const vendas = useVendas()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [novo, setNovo] = useState(false)
  const atrasados = useMemo(() => clientesComAtraso(vendas.data ?? []), [vendas.data])
  const saldos = useMemo(() => saldoPorCliente(vendas.data ?? []), [vendas.data])
  const lista = (clientes.data ?? []).filter((c) => combina(busca, c.nome, c.telefone, c.cpf))

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={`${clientes.data?.length ?? 0} cadastrados`}
        action={
          <Button size="sm" onClick={() => setNovo(true)}>
            <Plus size={16} strokeWidth={1.5} />
            Novo
          </Button>
        }
      />
      <div className="mb-4">
        <SearchInput placeholder="Nome, telefone ou CPF" aria-label="Buscar clientes" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      <ErrorBox error={clientes.error} />
      {clientes.isLoading ? (
        <Loading />
      ) : lista.length === 0 ? (
        <Empty>{busca ? 'Nenhum cliente encontrado.' : 'Nenhum cliente ainda. Toque em Novo para cadastrar.'}</Empty>
      ) : (
        <ul className="divide-y divide-line border border-line bg-surface-raised">
          {lista.map((c) => {
            const saldo = saldos.get(c.id) ?? 0
            return (
              <li key={c.id}>
                <Link to={`/clientes/${c.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-surface">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.nome}</div>
                    <div className="truncate text-sm text-ink-muted">{c.telefone || 'Sem telefone'}</div>
                  </div>
                  {atrasados.has(c.id) && <StatusBadge status="atrasada" />}
                  {saldo > 0 && <span className="tabular hidden text-sm text-ink-muted sm:inline">{brl(saldo)}</span>}
                  <ChevronRight size={18} strokeWidth={1.5} className="shrink-0 text-ink-subtle" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {novo && <ClienteForm onClose={() => setNovo(false)} onSaved={(c) => navigate(`/clientes/${c.id}`)} />}
    </>
  )
}
```

- [ ] **Step 4: Build e testes passam**

Run: `npm run build && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: lista de clientes com busca, destaque de atraso e cadastro"
```

---

### Task 6: Vendas — lista, cartão e registro de pagamento

**Files:**
- Create: `src/components/VendaCard.tsx`, `src/components/PagarModal.tsx`, `src/pages/Vendas.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useVendas`, `useExcluirVenda`, `useAtualizarParcelas` (api), `FORMAS`, `lucro`, `restante`, `statusVenda`, `proximaAberta`, `saldoDevedor`, `distribuirPagamento`, `hoje`, `VendaCompleta`, `Parcela`, `StatusVenda` (domain), `brl`, `dataBR`, `parseValor`, `valorInput`, `combina` (format), `buttonClass`, `Button`, `Card`, `Chips`, `Info`, `StatusBadge`, `Modal`, `Field`, `Input`, `ErrorBox`, `Empty`, `Loading`, `PageHeader`, `SearchInput` (ui).
- Produces:
  - `VendaCard({ venda: VendaCompleta; onPagar: () => void })`
  - `PagarModal({ venda: VendaCompleta; parcela?: Parcela; onClose: () => void })` — sem `parcela`, abate a partir da próxima em aberto (pode cobrir várias); com `parcela`, só aquela.
  - Rota `/vendas`.

- [ ] **Step 1: Registrar a rota (falha esperada)**

Em `src/App.tsx`, acrescentar o import depois de `import Login from './pages/Login'`:

```tsx
import Vendas from './pages/Vendas'
```

e trocar `{/* rotas */}` por:

```tsx
        <Route path="vendas" element={<Vendas />} />
        {/* rotas */}
```

- [ ] **Step 2: Ver falhar**

Run: `npm run build`
Expected: FAIL — `Cannot find module './pages/Vendas'`.

- [ ] **Step 3: Implementar**

Criar `src/components/PagarModal.tsx`:

```tsx
import { useState, type FormEvent } from 'react'
import { useAtualizarParcelas } from '@/lib/api'
import { distribuirPagamento, hoje, proximaAberta, restante, saldoDevedor, type Parcela, type VendaCompleta } from '@/lib/domain'
import { brl, parseValor, valorInput } from '@/lib/format'
import { Button, ErrorBox, Field, Info, Input, Modal } from './ui'

export function PagarModal({ venda, parcela, onClose }: { venda: VendaCompleta; parcela?: Parcela; onClose: () => void }) {
  const atualizar = useAtualizarParcelas()
  const alvo = parcela ? [parcela] : venda.parcelas
  const primeira = parcela ?? proximaAberta(venda.parcelas)
  const saldo = parcela ? restante(parcela) : saldoDevedor(venda.parcelas)
  const [valor, setValor] = useState(valorInput(primeira ? restante(primeira) : 0))
  const [dataPagamento, setDataPagamento] = useState(hoje())
  const [erro, setErro] = useState<string>()
  const v = parseValor(valor)
  const { updates, troco } = distribuirPagamento(alvo, v, dataPagamento)

  async function confirmar(e: FormEvent) {
    e.preventDefault()
    if (v <= 0) return setErro('Informe um valor maior que zero.')
    if (troco > 0) return setErro(`O valor passa do saldo de ${brl(saldo)}.`)
    if (!dataPagamento) return setErro('Informe a data do pagamento.')
    try {
      await atualizar.mutateAsync(updates)
      onClose()
    } catch {
      // o erro aparece no ErrorBox abaixo
    }
  }

  if (!primeira || saldo === 0) {
    return (
      <Modal open onClose={onClose} title="Registrar pagamento">
        <p className="text-sm text-ink-muted">Não há valor em aberto nesta {parcela ? 'parcela' : 'venda'}.</p>
      </Modal>
    )
  }

  return (
    <Modal open onClose={onClose} title="Registrar pagamento">
      <form onSubmit={confirmar} className="flex flex-col gap-4" noValidate>
        <p className="text-sm text-ink-muted">
          {venda.cliente.nome} · {venda.produto}
        </p>
        <div className="grid grid-cols-2 gap-px border border-line bg-line">
          <div className="bg-surface-raised p-3">
            <Info label={`Parcela ${primeira.numero}`}>{brl(restante(primeira))}</Info>
          </div>
          <div className="bg-surface-raised p-3">
            <Info label={parcela ? 'Valor da parcela' : 'Saldo da venda'}>{brl(parcela ? parcela.valor : saldo)}</Info>
          </div>
        </div>
        <Field
          label="Valor pago"
          error={erro}
          hint={parcela ? 'Valor menor fica como pagamento parcial.' : 'Valor menor fica como pagamento parcial; maior abate as próximas parcelas.'}
        >
          <Input
            value={valor}
            onChange={(e) => {
              setValor(e.target.value)
              setErro(undefined)
            }}
            inputMode="decimal"
            autoComplete="off"
            autoFocus
          />
        </Field>
        <Field label="Data do pagamento">
          <Input type="date" value={dataPagamento} max={hoje()} onChange={(e) => setDataPagamento(e.target.value)} />
        </Field>
        {v > 0 && troco === 0 && updates.length > 0 && (
          <ul className="tabular flex flex-col gap-1 text-sm text-ink-muted">
            {updates.map((u) => {
              const p = alvo.find((x) => x.id === u.id)!
              return (
                <li key={u.id}>
                  Parcela {p.numero}: {u.valor_pago >= p.valor ? 'quitada' : `${brl(u.valor_pago)} de ${brl(p.valor)}`}
                </li>
              )
            })}
          </ul>
        )}
        <ErrorBox error={atualizar.error} />
        <Button full disabled={atualizar.isPending}>
          {atualizar.isPending ? 'Salvando…' : 'Confirmar pagamento'}
        </Button>
      </form>
    </Modal>
  )
}
```

Criar `src/components/VendaCard.tsx`:

```tsx
import clsx from 'clsx'
import { CircleDollarSign, Eye, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useExcluirVenda } from '@/lib/api'
import { FORMAS, lucro, proximaAberta, restante, statusVenda, type VendaCompleta } from '@/lib/domain'
import { brl, dataBR } from '@/lib/format'
import { Button, Card, ErrorBox, Info, StatusBadge, buttonClass } from './ui'

export function VendaCard({ venda, onPagar }: { venda: VendaCompleta; onPagar: () => void }) {
  const excluir = useExcluirVenda()
  const status = statusVenda(venda.parcelas)
  const restantes = venda.parcelas.filter((p) => restante(p) > 0).length
  const valorParcela = (proximaAberta(venda.parcelas) ?? venda.parcelas[0])?.valor
  const l = lucro(venda)

  async function remover() {
    if (!confirm(`Excluir a venda de ${venda.produto} para ${venda.cliente.nome}? As parcelas também serão apagadas.`)) return
    try {
      await excluir.mutateAsync(venda.id)
    } catch {
      // o erro aparece no ErrorBox abaixo
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to={`/clientes/${venda.cliente_id}`} className="block truncate text-lg font-medium hover:underline">
            {venda.cliente.nome}
          </Link>
          <div className="truncate text-sm text-ink-muted">{venda.produto}</div>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Info label="Data">{dataBR(venda.data_venda)}</Info>
        <Info label="Forma">{FORMAS[venda.forma_pagamento]}</Info>
        <Info label="Capital próprio">{brl(venda.capital_proprio)}</Info>
        <Info label="Venda" className="font-medium">
          {brl(venda.valor_venda)}
        </Info>
        <Info label="Lucro" className={clsx('font-medium', l >= 0 ? 'text-success' : 'text-danger')}>
          {brl(l)}
        </Info>
        <Info label="Entrada">{brl(venda.entrada)}</Info>
        <Info label="Parcelas">{venda.num_parcelas > 0 ? `${venda.num_parcelas}x de ${brl(valorParcela)}` : 'À vista'}</Info>
        <Info label="Restantes">{restantes === 1 ? '1 parcela' : `${restantes} parcelas`}</Info>
      </div>
      <ErrorBox error={excluir.error} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Link to={`/vendas/${venda.id}`} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
          <Eye size={16} strokeWidth={1.5} aria-hidden="true" />
          Detalhes
        </Link>
        <Link to={`/vendas/${venda.id}/editar`} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
          <Pencil size={16} strokeWidth={1.5} aria-hidden="true" />
          Editar
        </Link>
        <Button size="sm" onClick={onPagar} disabled={restantes === 0}>
          <CircleDollarSign size={16} strokeWidth={1.5} aria-hidden="true" />
          {restantes === 0 ? 'Quitada' : 'Pagar'}
        </Button>
        <Button size="sm" variant="danger" onClick={remover} disabled={excluir.isPending}>
          <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
          Excluir
        </Button>
      </div>
    </Card>
  )
}
```

Criar `src/pages/Vendas.tsx`:

```tsx
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PagarModal } from '@/components/PagarModal'
import { VendaCard } from '@/components/VendaCard'
import { Chips, Empty, ErrorBox, Loading, PageHeader, SearchInput, buttonClass } from '@/components/ui'
import { useVendas } from '@/lib/api'
import { statusVenda, type StatusVenda, type VendaCompleta } from '@/lib/domain'
import { combina } from '@/lib/format'

type Filtro = 'todas' | StatusVenda

export default function Vendas() {
  const vendas = useVendas()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [pagando, setPagando] = useState<VendaCompleta | null>(null)
  const lista = (vendas.data ?? []).filter(
    (v) => combina(busca, v.cliente.nome, v.produto) && (filtro === 'todas' || statusVenda(v.parcelas) === filtro),
  )

  return (
    <>
      <PageHeader
        title="Vendas"
        action={
          <Link to="/vendas/nova" className={buttonClass({ size: 'sm' })}>
            <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
            Nova venda
          </Link>
        }
      />
      <div className="mb-4 flex flex-col gap-3">
        <SearchInput placeholder="Cliente ou produto" aria-label="Buscar vendas" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <Chips
          label="Filtrar por situação"
          value={filtro}
          onChange={setFiltro}
          options={[
            ['todas', 'Todas'],
            ['atrasada', 'Atrasadas'],
            ['em_dia', 'Em dia'],
            ['quitada', 'Quitadas'],
          ]}
        />
      </div>
      <ErrorBox error={vendas.error} />
      {vendas.isLoading ? (
        <Loading />
      ) : lista.length === 0 ? (
        <Empty>{busca || filtro !== 'todas' ? 'Nenhuma venda encontrada.' : 'Nenhuma venda ainda. Toque em Nova venda.'}</Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {lista.map((v) => (
            <VendaCard key={v.id} venda={v} onPagar={() => setPagando(v)} />
          ))}
        </div>
      )}
      {pagando && <PagarModal venda={pagando} onClose={() => setPagando(null)} />}
    </>
  )
}
```

- [ ] **Step 4: Build e testes passam**

Run: `npm run build && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: lista de vendas com filtros e registro de pagamento"
```

---

### Task 7: Formulário de venda (nova e editar)

**Files:**
- Create: `src/pages/VendaForm.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useVendas`, `useClientes`, `useSalvarVenda` (api; `useSalvarVenda().mutateAsync({ venda: VendaInput; parcelas: NovaParcela[] }): Promise<string>` devolve o id), `FORMAS`, `hoje`, `recalcularParcelas`, `validarVenda`, `Cliente`, `FormaPagamento`, `NovaParcela`, `VendaCompleta` (domain), `brl`, `dataBR`, `parseValor`, `valorInput` (format), `ClienteForm` (Task 5), componentes de ui.
- Produces: rotas `/vendas/nova` (aceita `?cliente=<id>` para pré-selecionar) e `/vendas/:id/editar`. Depois de salvar navega para `/vendas/<id>` (rota criada na Task 8; até lá cai no redirecionamento para `/`).

- [ ] **Step 1: Registrar as rotas (falha esperada)**

Em `src/App.tsx`, acrescentar o import depois de `import Vendas from './pages/Vendas'`:

```tsx
import VendaForm from './pages/VendaForm'
```

e trocar `{/* rotas */}` por:

```tsx
        <Route path="vendas/nova" element={<VendaForm />} />
        <Route path="vendas/:id/editar" element={<VendaForm />} />
        {/* rotas */}
```

- [ ] **Step 2: Ver falhar**

Run: `npm run build`
Expected: FAIL — `Cannot find module './pages/VendaForm'`.

- [ ] **Step 3: Implementar**

Criar `src/pages/VendaForm.tsx`:

```tsx
import clsx from 'clsx'
import { addMonths, format } from 'date-fns'
import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ClienteForm } from '@/components/ClienteForm'
import { Alert, Button, Empty, ErrorBox, Field, Info, Input, Loading, PageHeader, Select, Textarea } from '@/components/ui'
import { useClientes, useSalvarVenda, useVendas } from '@/lib/api'
import {
  FORMAS,
  hoje,
  recalcularParcelas,
  validarVenda,
  type Cliente,
  type FormaPagamento,
  type NovaParcela,
  type VendaCompleta,
} from '@/lib/domain'
import { brl, dataBR, parseValor, valorInput } from '@/lib/format'

export default function VendaForm() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const vendas = useVendas()
  const clientes = useClientes()
  if (vendas.isLoading || clientes.isLoading) return <Loading />
  const venda = id ? vendas.data?.find((v) => v.id === id) : undefined
  if (id && !venda) return <Empty>Venda não encontrada.</Empty>
  return <Formulario key={id ?? 'nova'} venda={venda} clientes={clientes.data ?? []} clienteInicial={params.get('cliente') ?? ''} />
}

function Formulario({ venda, clientes, clienteInicial }: { venda?: VendaCompleta; clientes: Cliente[]; clienteInicial: string }) {
  const navigate = useNavigate()
  const salvar = useSalvarVenda()
  const [clienteId, setClienteId] = useState(venda?.cliente_id ?? clienteInicial)
  const [produto, setProduto] = useState(venda?.produto ?? '')
  const [dataVenda, setDataVenda] = useState(venda?.data_venda ?? hoje())
  const [forma, setForma] = useState<FormaPagamento>(venda?.forma_pagamento ?? 'boleto')
  const [capital, setCapital] = useState(valorInput(venda?.capital_proprio))
  const [valorVenda, setValorVenda] = useState(valorInput(venda?.valor_venda))
  const [entrada, setEntrada] = useState(valorInput(venda?.entrada))
  const [numParcelas, setNumParcelas] = useState(String(venda?.num_parcelas ?? 1))
  const [primeiroVencimento, setPrimeiroVencimento] = useState(
    venda?.primeiro_vencimento ?? format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
  )
  const [observacao, setObservacao] = useState(venda?.observacao ?? '')
  const [novoCliente, setNovoCliente] = useState(false)
  const [tentou, setTentou] = useState(false)

  const dados = {
    clienteId,
    produto,
    valorVenda: parseValor(valorVenda),
    entrada: parseValor(entrada),
    capitalProprio: parseValor(capital),
    numParcelas: numParcelas.trim() === '' ? 0 : Number(numParcelas),
    primeiroVencimento,
  }
  const invalido = validarVenda(dados)
  let novas: NovaParcela[] = []
  let erroParcelas: string | null = null
  if (!invalido) {
    try {
      novas = recalcularParcelas(dados, venda?.parcelas ?? [])
    } catch (e) {
      erroParcelas = (e as Error).message
    }
  }
  const mantidas = (venda?.parcelas ?? []).filter((p) => p.valor_pago > 0)
  const previa = [
    ...mantidas.map((p) => ({ numero: p.numero, vencimento: p.vencimento, valor: p.valor, comPagamento: true })),
    ...novas.map((p) => ({ ...p, comPagamento: false })),
  ].sort((a, b) => a.numero - b.numero)
  const problema = invalido ?? erroParcelas
  const lucro = dados.valorVenda - dados.capitalProprio

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setTentou(true)
    if (problema) return
    if (mantidas.length > 0 && !confirm(`${mantidas.length} parcela(s) com pagamento serão mantidas e as demais recalculadas. Continuar?`)) return
    try {
      const vendaId = await salvar.mutateAsync({
        venda: {
          id: venda?.id,
          cliente_id: clienteId,
          produto: produto.trim(),
          data_venda: dataVenda,
          forma_pagamento: forma,
          capital_proprio: dados.capitalProprio,
          valor_venda: dados.valorVenda,
          entrada: dados.entrada,
          num_parcelas: dados.numParcelas,
          primeiro_vencimento: dados.numParcelas > 0 ? primeiroVencimento : null,
          observacao: observacao.trim() || null,
        },
        parcelas: novas,
      })
      navigate(`/vendas/${vendaId}`, { replace: true })
    } catch {
      // o erro aparece no ErrorBox abaixo
    }
  }

  return (
    <>
      <PageHeader eyebrow={venda ? 'Editar venda' : 'Nova venda'} title={venda ? venda.produto : 'Registrar venda'} />
      <form onSubmit={enviar} className="flex flex-col gap-6" noValidate>
        <section className="flex flex-col gap-4">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Field label="Cliente">
                <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  <option value="">Escolha o cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button type="button" variant="secondary" className="px-3" onClick={() => setNovoCliente(true)} aria-label="Cadastrar novo cliente">
              <Plus size={18} strokeWidth={1.5} aria-hidden="true" />
            </Button>
          </div>
          <Field label="Produto">
            <Input value={produto} onChange={(e) => setProduto(e.target.value)} placeholder="Ex.: iPhone 16 branco" autoComplete="off" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Data da venda">
              <Input type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} />
            </Field>
            <Field label="Forma de pagamento">
              <Select value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
                {Object.entries(FORMAS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4">
          <Field label="Valor da venda">
            <Input inputMode="decimal" value={valorVenda} onChange={(e) => setValorVenda(e.target.value)} placeholder="0,00" autoComplete="off" />
          </Field>
          <Field label="Capital próprio" hint="Quanto o produto custou">
            <Input inputMode="decimal" value={capital} onChange={(e) => setCapital(e.target.value)} placeholder="0,00" autoComplete="off" />
          </Field>
          <Field label="Entrada">
            <Input inputMode="decimal" value={entrada} onChange={(e) => setEntrada(e.target.value)} placeholder="0,00" autoComplete="off" />
          </Field>
          <Field label="Nº de parcelas" hint="0 = à vista">
            <Input type="number" inputMode="numeric" min={0} max={120} value={numParcelas} onChange={(e) => setNumParcelas(e.target.value)} />
          </Field>
          {dados.numParcelas > 0 && (
            <Field label="1º vencimento">
              <Input type="date" value={primeiroVencimento} onChange={(e) => setPrimeiroVencimento(e.target.value)} />
            </Field>
          )}
          <div className="flex items-end pb-3">
            <Info label="Lucro" className={clsx('font-medium', lucro >= 0 ? 'text-success' : 'text-danger')}>
              {brl(lucro)}
            </Info>
          </div>
        </section>

        <Field label="Observação">
          <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </Field>

        {previa.length > 0 && (
          <section>
            <p className="eyebrow mb-3">Parcelas</p>
            <ul className="tabular divide-y divide-line border border-line bg-surface-raised text-sm">
              {previa.map((p) => (
                <li key={p.numero} className="flex justify-between gap-3 px-4 py-2">
                  <span>
                    {p.numero}ª · {dataBR(p.vencimento)}
                  </span>
                  <span>
                    {brl(p.valor)}
                    {p.comPagamento && ' · com pagamento'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {tentou && problema && <Alert title="Confira os dados">{problema}</Alert>}
        <ErrorBox error={salvar.error} />
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button className="flex-1" disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando…' : 'Salvar venda'}
          </Button>
        </div>
      </form>
      {novoCliente && <ClienteForm onClose={() => setNovoCliente(false)} onSaved={(c) => setClienteId(c.id)} />}
    </>
  )
}
```

- [ ] **Step 4: Build e testes passam**

Run: `npm run build && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: formulário de nova venda e edição com prévia das parcelas"
```

---

### Task 8: Detalhes da venda e do cliente

**Files:**
- Create: `src/pages/VendaDetalhe.tsx`, `src/pages/ClienteDetalhe.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useVendas`, `useClientes`, `useAtualizarParcelas`, `useExcluirVenda`, `useExcluirCliente` (api), `FORMAS`, `lucro`, `proximaAberta`, `restante`, `round2`, `saldoDevedor`, `statusParcela`, `statusVenda`, `Parcela`, `VendaCompleta` (domain), `brl`, `dataBR`, `mensagemCobranca`, `whatsapp` (format), `ClienteForm`, `PagarModal`, `VendaCard`, componentes de ui.
- Produces: rotas `/vendas/:id` e `/clientes/:id`.

- [ ] **Step 1: Registrar as rotas (falha esperada)**

Em `src/App.tsx`, acrescentar depois de `import Clientes from './pages/Clientes'`:

```tsx
import ClienteDetalhe from './pages/ClienteDetalhe'
```

e depois de `import VendaForm from './pages/VendaForm'`:

```tsx
import VendaDetalhe from './pages/VendaDetalhe'
```

e trocar `{/* rotas */}` por:

```tsx
        <Route path="vendas/:id" element={<VendaDetalhe />} />
        <Route path="clientes/:id" element={<ClienteDetalhe />} />
        {/* rotas */}
```

- [ ] **Step 2: Ver falhar**

Run: `npm run build`
Expected: FAIL — `Cannot find module './pages/ClienteDetalhe'`.

- [ ] **Step 3: Implementar**

Criar `src/pages/VendaDetalhe.tsx`:

```tsx
import clsx from 'clsx'
import { MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PagarModal } from '@/components/PagarModal'
import { Button, Card, Empty, ErrorBox, Info, Loading, PageHeader, StatusBadge, buttonClass } from '@/components/ui'
import { useAtualizarParcelas, useExcluirVenda, useVendas } from '@/lib/api'
import { FORMAS, lucro, proximaAberta, restante, saldoDevedor, statusParcela, statusVenda, type Parcela } from '@/lib/domain'
import { brl, dataBR, mensagemCobranca, whatsapp } from '@/lib/format'

export default function VendaDetalhe() {
  const { id } = useParams()
  const vendas = useVendas()
  const atualizar = useAtualizarParcelas()
  const excluir = useExcluirVenda()
  const navigate = useNavigate()
  const [pagando, setPagando] = useState<{ parcela?: Parcela } | null>(null)

  if (vendas.isLoading) return <Loading />
  if (vendas.error) return <ErrorBox error={vendas.error} />
  const venda = vendas.data?.find((v) => v.id === id)
  if (!venda) return <Empty>Venda não encontrada.</Empty>
  const v = venda

  const status = statusVenda(v.parcelas)
  const saldo = saldoDevedor(v.parcelas)
  const proxima = proximaAberta(v.parcelas)
  const l = lucro(v)
  const link = proxima ? whatsapp(v.cliente.telefone, mensagemCobranca(v.cliente.nome, restante(proxima), proxima.vencimento)) : null

  async function desfazer(p: Parcela) {
    if (!confirm(`Desfazer o pagamento da parcela ${p.numero}?`)) return
    try {
      await atualizar.mutateAsync([{ id: p.id, valor_pago: 0, data_pagamento: null }])
    } catch {
      // o erro aparece no ErrorBox abaixo
    }
  }

  async function remover() {
    if (!confirm(`Excluir a venda de ${v.produto} para ${v.cliente.nome}? As parcelas também serão apagadas.`)) return
    try {
      await excluir.mutateAsync(v.id)
      navigate('/vendas', { replace: true })
    } catch {
      // o erro aparece no ErrorBox abaixo
    }
  }

  return (
    <>
      <PageHeader eyebrow="Venda" title={v.produto} action={<StatusBadge status={status} />} />
      <Card className="mb-6 grid grid-cols-2 gap-x-4 gap-y-3">
        <Info label="Cliente">
          <Link to={`/clientes/${v.cliente_id}`} className="underline underline-offset-4">
            {v.cliente.nome}
          </Link>
        </Info>
        <Info label="Data">{dataBR(v.data_venda)}</Info>
        <Info label="Forma">{FORMAS[v.forma_pagamento]}</Info>
        <Info label="Venda" className="font-medium">
          {brl(v.valor_venda)}
        </Info>
        <Info label="Capital próprio">{brl(v.capital_proprio)}</Info>
        <Info label="Lucro" className={clsx('font-medium', l >= 0 ? 'text-success' : 'text-danger')}>
          {brl(l)}
        </Info>
        <Info label="Entrada">{brl(v.entrada)}</Info>
        <Info label="Saldo devedor" className="font-medium">
          {brl(saldo)}
        </Info>
        {v.observacao && (
          <div className="col-span-2">
            <Info label="Observação">{v.observacao}</Info>
          </div>
        )}
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Button className="col-span-2" onClick={() => setPagando({})} disabled={!proxima}>
          {proxima ? 'Registrar pagamento' : 'Venda quitada'}
        </Button>
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className={clsx(buttonClass({ variant: 'secondary' }), 'col-span-2')}>
            <MessageCircle size={18} strokeWidth={1.5} aria-hidden="true" />
            Cobrar no WhatsApp
          </a>
        )}
        <Link to={`/vendas/${v.id}/editar`} className={buttonClass({ variant: 'secondary' })}>
          Editar
        </Link>
        <Button variant="danger" onClick={remover} disabled={excluir.isPending}>
          Excluir
        </Button>
      </div>
      <div className="mb-6">
        <ErrorBox error={atualizar.error ?? excluir.error} />
      </div>

      <p className="eyebrow mb-3">Parcelas</p>
      {v.parcelas.length === 0 ? (
        <Empty>Venda à vista, sem parcelas.</Empty>
      ) : (
        <ul className="divide-y divide-line border border-line bg-surface-raised">
          {v.parcelas.map((p) => {
            const st = statusParcela(p)
            return (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.numero}ª parcela</span>
                    <StatusBadge status={st} />
                  </div>
                  <div className="tabular text-sm text-ink-muted">
                    Vence {dataBR(p.vencimento)} · {brl(p.valor)}
                  </div>
                  {p.valor_pago > 0 && (
                    <div className="tabular text-sm text-ink-muted">
                      Pago {brl(p.valor_pago)} em {dataBR(p.data_pagamento)}
                    </div>
                  )}
                </div>
                {st !== 'paga' && (
                  <Button size="sm" variant="secondary" onClick={() => setPagando({ parcela: p })}>
                    Pagar
                  </Button>
                )}
                {p.valor_pago > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => desfazer(p)} disabled={atualizar.isPending}>
                    Desfazer
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {pagando && <PagarModal venda={v} parcela={pagando.parcela} onClose={() => setPagando(null)} />}
    </>
  )
}
```

Criar `src/pages/ClienteDetalhe.tsx`:

```tsx
import clsx from 'clsx'
import { MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ClienteForm } from '@/components/ClienteForm'
import { PagarModal } from '@/components/PagarModal'
import { VendaCard } from '@/components/VendaCard'
import { Button, Card, Empty, ErrorBox, Info, Loading, PageHeader, buttonClass } from '@/components/ui'
import { useClientes, useExcluirCliente, useVendas } from '@/lib/api'
import { restante, round2, saldoDevedor, statusParcela, type VendaCompleta } from '@/lib/domain'
import { brl, mensagemCobranca, whatsapp } from '@/lib/format'

export default function ClienteDetalhe() {
  const { id } = useParams()
  const clientes = useClientes()
  const vendas = useVendas()
  const excluir = useExcluirCliente()
  const navigate = useNavigate()
  const [editando, setEditando] = useState(false)
  const [pagando, setPagando] = useState<VendaCompleta | null>(null)

  if (clientes.isLoading || vendas.isLoading) return <Loading />
  const erro = clientes.error ?? vendas.error
  if (erro) return <ErrorBox error={erro} />
  const cliente = clientes.data?.find((c) => c.id === id)
  if (!cliente) return <Empty>Cliente não encontrado.</Empty>
  const c = cliente

  const doCliente = (vendas.data ?? []).filter((v) => v.cliente_id === c.id)
  const parcelas = doCliente.flatMap((v) => v.parcelas)
  const devido = saldoDevedor(parcelas)
  const atrasado = round2(parcelas.filter((p) => statusParcela(p) === 'atrasada').reduce((s, p) => s + restante(p), 0))
  const link = whatsapp(c.telefone, atrasado > 0 ? mensagemCobranca(c.nome, atrasado) : undefined)

  async function remover() {
    if (!confirm(`Excluir ${c.nome}?`)) return
    try {
      await excluir.mutateAsync(c.id)
      navigate('/clientes', { replace: true })
    } catch {
      // o erro aparece no ErrorBox abaixo
    }
  }

  return (
    <>
      <PageHeader eyebrow="Cliente" title={c.nome} subtitle={c.telefone || 'Sem telefone'} />
      <div className="mb-6 grid grid-cols-2 gap-px border border-line bg-line">
        <div className="bg-surface-raised p-4">
          <div className="text-xs leading-4 text-ink-muted">Saldo devedor</div>
          <div className="tabular mt-1 text-[22px] font-medium leading-7">{brl(devido)}</div>
        </div>
        <div className="bg-surface-raised p-4">
          <div className="text-xs leading-4 text-ink-muted">Em atraso</div>
          <div className={clsx('tabular mt-1 text-[22px] font-medium leading-7', atrasado > 0 && 'text-danger')}>{brl(atrasado)}</div>
        </div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3">
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className={clsx(buttonClass({ variant: 'secondary' }), 'col-span-2')}>
            <MessageCircle size={18} strokeWidth={1.5} aria-hidden="true" />
            {atrasado > 0 ? 'Cobrar no WhatsApp' : 'Abrir WhatsApp'}
          </a>
        )}
        <Button variant="secondary" onClick={() => setEditando(true)}>
          Editar
        </Button>
        <Button variant="danger" onClick={remover} disabled={excluir.isPending}>
          Excluir
        </Button>
      </div>
      <div className="mb-6">
        <ErrorBox error={excluir.error} />
      </div>
      {(c.cpf || c.endereco || c.observacao) && (
        <Card className="mb-6 grid gap-3 sm:grid-cols-2">
          {c.cpf && <Info label="CPF">{c.cpf}</Info>}
          {c.endereco && <Info label="Endereço">{c.endereco}</Info>}
          {c.observacao && <Info label="Observação">{c.observacao}</Info>}
        </Card>
      )}
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">Vendas</p>
        <Link to={`/vendas/nova?cliente=${c.id}`} className={buttonClass({ variant: 'ghost', size: 'sm' })}>
          Nova venda
        </Link>
      </div>
      {doCliente.length === 0 ? (
        <Empty>Nenhuma venda para este cliente.</Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {doCliente.map((v) => (
            <VendaCard key={v.id} venda={v} onPagar={() => setPagando(v)} />
          ))}
        </div>
      )}
      {editando && <ClienteForm cliente={c} onClose={() => setEditando(false)} />}
      {pagando && <PagarModal venda={pagando} onClose={() => setPagando(null)} />}
    </>
  )
}
```

- [ ] **Step 4: Build e testes passam**

Run: `npm run build && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: detalhes da venda (baixa e desfazer) e do cliente (saldo e cobrança)"
```

---

### Task 9: Parcelas e Agenda de cobranças

**Files:**
- Create: `src/components/ParcelaItem.tsx`, `src/pages/Parcelas.tsx`, `src/pages/Agenda.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useVendas` (api), `agruparAgenda`, `hoje`, `restante`, `round2`, `statusParcela`, `ItemAgenda` (domain), `brl`, `dataBR`, `dataExtenso`, `mensagemCobranca`, `whatsapp` (format), `PagarModal`, componentes de ui.
- Produces: `ParcelaItem({ venda, parcela, onPagar }: ItemAgenda & { onPagar: () => void })` (renderiza um `<li>`); rotas `/parcelas` e `/agenda`.

- [ ] **Step 1: Registrar as rotas (falha esperada)**

Em `src/App.tsx`, acrescentar depois de `import { Layout } from './components/Layout'`:

```tsx
import Agenda from './pages/Agenda'
```

e depois de `import Login from './pages/Login'`:

```tsx
import Parcelas from './pages/Parcelas'
```

e trocar `{/* rotas */}` por:

```tsx
        <Route path="parcelas" element={<Parcelas />} />
        <Route path="agenda" element={<Agenda />} />
        {/* rotas */}
```

- [ ] **Step 2: Ver falhar**

Run: `npm run build`
Expected: FAIL — `Cannot find module './pages/Agenda'`.

- [ ] **Step 3: Implementar**

Criar `src/components/ParcelaItem.tsx`:

```tsx
import { MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { restante, statusParcela, type ItemAgenda } from '@/lib/domain'
import { brl, dataBR, mensagemCobranca, whatsapp } from '@/lib/format'
import { Button, StatusBadge, buttonClass } from './ui'

export function ParcelaItem({ venda, parcela, onPagar }: ItemAgenda & { onPagar: () => void }) {
  const status = statusParcela(parcela)
  const aberta = status !== 'paga'
  const link = aberta ? whatsapp(venda.cliente.telefone, mensagemCobranca(venda.cliente.nome, restante(parcela), parcela.vencimento)) : null
  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <Link to={`/vendas/${venda.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{venda.cliente.nome}</span>
          <StatusBadge status={status} />
        </div>
        <div className="truncate text-sm text-ink-muted">
          {venda.produto} · parcela {parcela.numero}/{venda.num_parcelas}
        </div>
        <div className="tabular text-sm">
          {aberta
            ? `Vence ${dataBR(parcela.vencimento)} · ${brl(restante(parcela))}`
            : `Paga em ${dataBR(parcela.data_pagamento)} · ${brl(parcela.valor_pago)}`}
        </div>
      </Link>
      {aberta && (
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {link ? (
            <a href={link} target="_blank" rel="noreferrer" className={buttonClass({ variant: 'secondary', size: 'sm' })}>
              <MessageCircle size={16} strokeWidth={1.5} aria-hidden="true" />
              WhatsApp
            </a>
          ) : (
            <span />
          )}
          <Button size="sm" onClick={onPagar}>
            Pagar
          </Button>
        </div>
      )}
    </li>
  )
}
```

Criar `src/pages/Parcelas.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { PagarModal } from '@/components/PagarModal'
import { ParcelaItem } from '@/components/ParcelaItem'
import { Chips, Empty, ErrorBox, Loading, PageHeader } from '@/components/ui'
import { useVendas } from '@/lib/api'
import { restante, round2, statusParcela, type ItemAgenda } from '@/lib/domain'
import { brl } from '@/lib/format'

type Filtro = 'abertas' | 'atrasadas' | 'pagas' | 'todas'

export default function Parcelas() {
  const vendas = useVendas()
  const [filtro, setFiltro] = useState<Filtro>('abertas')
  const [pagando, setPagando] = useState<ItemAgenda | null>(null)

  const itens = useMemo(() => {
    const todos: ItemAgenda[] = (vendas.data ?? []).flatMap((venda) => venda.parcelas.map((parcela) => ({ venda, parcela })))
    const filtrados = todos.filter((i) => {
      const st = statusParcela(i.parcela)
      if (filtro === 'abertas') return st !== 'paga'
      if (filtro === 'atrasadas') return st === 'atrasada'
      if (filtro === 'pagas') return st === 'paga'
      return true
    })
    return filtro === 'pagas'
      ? filtrados.sort((a, b) => (b.parcela.data_pagamento ?? '').localeCompare(a.parcela.data_pagamento ?? ''))
      : filtrados.sort((a, b) => a.parcela.vencimento.localeCompare(b.parcela.vencimento))
  }, [vendas.data, filtro])

  const total = round2(
    itens.reduce((s, i) => s + (filtro === 'pagas' ? i.parcela.valor_pago : filtro === 'todas' ? i.parcela.valor : restante(i.parcela)), 0),
  )

  return (
    <>
      <PageHeader title="Parcelas" subtitle={`${itens.length} ${itens.length === 1 ? 'parcela' : 'parcelas'} · ${brl(total)}`} />
      <div className="mb-4">
        <Chips
          label="Filtrar parcelas"
          value={filtro}
          onChange={setFiltro}
          options={[
            ['abertas', 'Abertas'],
            ['atrasadas', 'Atrasadas'],
            ['pagas', 'Pagas'],
            ['todas', 'Todas'],
          ]}
        />
      </div>
      <ErrorBox error={vendas.error} />
      {vendas.isLoading ? (
        <Loading />
      ) : itens.length === 0 ? (
        <Empty>Nenhuma parcela neste filtro.</Empty>
      ) : (
        <ul className="divide-y divide-line border border-line bg-surface-raised">
          {itens.map((i) => (
            <ParcelaItem key={i.parcela.id} {...i} onPagar={() => setPagando(i)} />
          ))}
        </ul>
      )}
      {pagando && <PagarModal venda={pagando.venda} parcela={pagando.parcela} onClose={() => setPagando(null)} />}
    </>
  )
}
```

Criar `src/pages/Agenda.tsx`:

```tsx
import { useMemo, useState } from 'react'
import { PagarModal } from '@/components/PagarModal'
import { ParcelaItem } from '@/components/ParcelaItem'
import { Empty, ErrorBox, Loading, PageHeader } from '@/components/ui'
import { useVendas } from '@/lib/api'
import { agruparAgenda, hoje, restante, round2, type ItemAgenda } from '@/lib/domain'
import { brl, dataExtenso } from '@/lib/format'

export default function Agenda() {
  const vendas = useVendas()
  const [pagando, setPagando] = useState<ItemAgenda | null>(null)
  const agenda = useMemo(() => agruparAgenda(vendas.data ?? []), [vendas.data])
  const grupos: [string, ItemAgenda[]][] = [
    ['Atrasadas', agenda.atrasadas],
    ['Vencem hoje', agenda.hoje],
    ['Próximos 7 dias', agenda.semana],
    ['Restante do mês', agenda.mes],
  ]
  const comItens = grupos.filter(([, itens]) => itens.length > 0)

  return (
    <>
      <PageHeader title="Agenda de cobranças" subtitle={dataExtenso(hoje())} />
      <ErrorBox error={vendas.error} />
      {vendas.isLoading ? (
        <Loading />
      ) : comItens.length === 0 ? (
        <Empty>Nenhuma cobrança pendente para este mês.</Empty>
      ) : (
        comItens.map(([titulo, itens]) => (
          <section key={titulo} className="mb-8">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="eyebrow">
                {titulo} · {itens.length}
              </h2>
              <span className="tabular text-sm text-ink-muted">{brl(round2(itens.reduce((s, i) => s + restante(i.parcela), 0)))}</span>
            </div>
            <ul className="divide-y divide-line border border-line bg-surface-raised">
              {itens.map((i) => (
                <ParcelaItem key={i.parcela.id} {...i} onPagar={() => setPagando(i)} />
              ))}
            </ul>
          </section>
        ))
      )}
      {pagando && <PagarModal venda={pagando.venda} parcela={pagando.parcela} onClose={() => setPagando(null)} />}
    </>
  )
}
```

- [ ] **Step 4: Build e testes passam**

Run: `npm run build && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: telas de parcelas e agenda de cobranças com WhatsApp"
```

---

### Task 10: Pesquisa e Relatórios

**Files:**
- Create: `src/pages/Pesquisa.tsx`, `src/pages/Relatorios.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `useClientes`, `useVendas` (api), `FORMAS`, `ROTULO_STATUS`, `hoje`, `lucro`, `maioresDevedores`, `resumoMensal`, `saldoDevedor`, `statusParcela`, `statusVenda` (domain), `brl`, `combina`, `dataBR`, `mesAno`, `normalizar` (format), `baixarCsv` (csv), componentes de ui.
- Produces: rotas `/pesquisa` (lê e grava `?q=`) e `/relatorios`.

- [ ] **Step 1: Registrar as rotas (falha esperada)**

Em `src/App.tsx`, acrescentar depois de `import Parcelas from './pages/Parcelas'`:

```tsx
import Pesquisa from './pages/Pesquisa'
import Relatorios from './pages/Relatorios'
```

e trocar `{/* rotas */}` por:

```tsx
        <Route path="pesquisa" element={<Pesquisa />} />
        <Route path="relatorios" element={<Relatorios />} />
```

(o comentário-âncora não é mais necessário e sai aqui.)

- [ ] **Step 2: Ver falhar**

Run: `npm run build`
Expected: FAIL — `Cannot find module './pages/Pesquisa'`.

- [ ] **Step 3: Implementar**

Criar `src/pages/Pesquisa.tsx`:

```tsx
import { ChevronRight } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Empty, ErrorBox, Loading, PageHeader, SearchInput, StatusBadge } from '@/components/ui'
import { useClientes, useVendas } from '@/lib/api'
import { statusVenda } from '@/lib/domain'
import { combina, dataBR, normalizar } from '@/lib/format'

const LIMITE = 20

export default function Pesquisa() {
  const [params, setParams] = useSearchParams()
  const busca = params.get('q') ?? ''
  const clientes = useClientes()
  const vendas = useVendas()
  const ativa = normalizar(busca).length >= 2
  const achadosClientes = ativa ? (clientes.data ?? []).filter((c) => combina(busca, c.nome, c.telefone, c.cpf, c.observacao)).slice(0, LIMITE) : []
  const achadosVendas = ativa ? (vendas.data ?? []).filter((v) => combina(busca, v.produto, v.cliente.nome, v.observacao)).slice(0, LIMITE) : []
  const carregando = clientes.isLoading || vendas.isLoading

  return (
    <>
      <PageHeader title="Pesquisa" />
      <div className="mb-6">
        <SearchInput
          autoFocus
          value={busca}
          onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
          placeholder="Cliente, telefone, CPF ou produto"
          aria-label="Pesquisar"
        />
      </div>
      <ErrorBox error={clientes.error ?? vendas.error} />
      {!ativa ? (
        <Empty>Digite pelo menos 2 letras.</Empty>
      ) : carregando ? (
        <Loading />
      ) : achadosClientes.length === 0 && achadosVendas.length === 0 ? (
        <Empty>Nada encontrado para "{busca}".</Empty>
      ) : (
        <div className="flex flex-col gap-8">
          {achadosClientes.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3">Clientes</h2>
              <ul className="divide-y divide-line border border-line bg-surface-raised">
                {achadosClientes.map((c) => (
                  <li key={c.id}>
                    <Link to={`/clientes/${c.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-surface">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{c.nome}</div>
                        <div className="truncate text-sm text-ink-muted">{c.telefone || 'Sem telefone'}</div>
                      </div>
                      <ChevronRight size={18} strokeWidth={1.5} className="shrink-0 text-ink-subtle" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {achadosVendas.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3">Vendas</h2>
              <ul className="divide-y divide-line border border-line bg-surface-raised">
                {achadosVendas.map((v) => (
                  <li key={v.id}>
                    <Link to={`/vendas/${v.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-surface">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{v.produto}</div>
                        <div className="truncate text-sm text-ink-muted">
                          {v.cliente.nome} · {dataBR(v.data_venda)}
                        </div>
                      </div>
                      <StatusBadge status={statusVenda(v.parcelas)} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  )
}
```

Criar `src/pages/Relatorios.tsx`:

```tsx
import clsx from 'clsx'
import { Download } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button, Empty, ErrorBox, Loading, PageHeader } from '@/components/ui'
import { useVendas } from '@/lib/api'
import { baixarCsv } from '@/lib/csv'
import { FORMAS, ROTULO_STATUS, hoje, lucro, maioresDevedores, resumoMensal, saldoDevedor, statusParcela, statusVenda } from '@/lib/domain'
import { brl, dataBR, mesAno } from '@/lib/format'

export default function Relatorios() {
  const vendas = useVendas()
  const lista = vendas.data
  const meses = useMemo(() => resumoMensal(lista ?? []), [lista])
  const devedores = useMemo(() => maioresDevedores(lista ?? []), [lista])

  function exportarVendas() {
    baixarCsv(`vendas-${hoje()}.csv`, [
      ['Data', 'Cliente', 'Telefone', 'Produto', 'Forma', 'Capital próprio', 'Valor da venda', 'Lucro', 'Entrada', 'Parcelas', 'Saldo devedor', 'Situação'],
      ...(lista ?? []).map((v) => [
        dataBR(v.data_venda),
        v.cliente.nome,
        v.cliente.telefone,
        v.produto,
        FORMAS[v.forma_pagamento],
        v.capital_proprio,
        v.valor_venda,
        lucro(v),
        v.entrada,
        v.num_parcelas,
        saldoDevedor(v.parcelas),
        ROTULO_STATUS[statusVenda(v.parcelas)],
      ]),
    ])
  }

  function exportarParcelas() {
    baixarCsv(`parcelas-${hoje()}.csv`, [
      ['Cliente', 'Produto', 'Parcela', 'Vencimento', 'Valor', 'Valor pago', 'Data do pagamento', 'Situação'],
      ...(lista ?? []).flatMap((v) =>
        v.parcelas.map((p) => [
          v.cliente.nome,
          v.produto,
          `${p.numero}/${v.num_parcelas}`,
          dataBR(p.vencimento),
          p.valor,
          p.valor_pago,
          p.data_pagamento ? dataBR(p.data_pagamento) : '',
          ROTULO_STATUS[statusParcela(p)],
        ]),
      ),
    ])
  }

  return (
    <>
      <PageHeader title="Relatórios" subtitle="Últimos 12 meses" />
      <ErrorBox error={vendas.error} />
      {vendas.isLoading ? (
        <Loading />
      ) : (
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="eyebrow mb-3">Por mês</h2>
            <div className="overflow-x-auto border border-line bg-surface-raised">
              <table className="tabular w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-ink-muted">
                    <th scope="col" className="px-4 py-3 font-normal">Mês</th>
                    <th scope="col" className="px-4 py-3 text-right font-normal">Vendido</th>
                    <th scope="col" className="px-4 py-3 text-right font-normal">Recebido</th>
                    <th scope="col" className="px-4 py-3 text-right font-normal">Lucro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {meses.map((m) => (
                    <tr key={m.mes}>
                      <td className="whitespace-nowrap px-4 py-3 capitalize">{mesAno(m.mes)}</td>
                      <td className="px-4 py-3 text-right">{brl(m.vendido)}</td>
                      <td className="px-4 py-3 text-right">{brl(m.recebido)}</td>
                      <td className={clsx('px-4 py-3 text-right', m.lucro < 0 && 'text-danger')}>{brl(m.lucro)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="eyebrow mb-3">Maiores saldos devedores</h2>
            {devedores.length === 0 ? (
              <Empty>Nenhum cliente com saldo em aberto.</Empty>
            ) : (
              <ol className="divide-y divide-line border border-line bg-surface-raised">
                {devedores.map((d) => (
                  <li key={d.cliente.id}>
                    <Link to={`/clientes/${d.cliente.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-surface">
                      <span className="min-w-0 flex-1 truncate font-medium">{d.cliente.nome}</span>
                      <span className="tabular text-right text-sm">
                        <span className="block">{brl(d.saldo)}</span>
                        {d.atrasado > 0 && <span className="block text-danger">{brl(d.atrasado)} em atraso</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section>
            <h2 className="eyebrow mb-3">Exportar planilhas</h2>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={exportarVendas} disabled={!lista?.length}>
                <Download size={16} strokeWidth={1.5} aria-hidden="true" />
                Vendas
              </Button>
              <Button variant="secondary" onClick={exportarParcelas} disabled={!lista?.length}>
                <Download size={16} strokeWidth={1.5} aria-hidden="true" />
                Parcelas
              </Button>
            </div>
            <p className="mt-2 text-xs leading-4 text-ink-subtle">Arquivos CSV que abrem no Excel e no Google Planilhas.</p>
          </section>
        </div>
      )}
    </>
  )
}
```

- [ ] **Step 4: Build e testes passam**

Run: `npm run build && npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/
git commit -m "feat: pesquisa global e relatórios mensais com exportação CSV"
```

---

### Task 11: Verificação ponta a ponta, revisão de UI, documentação e deploy

**Files:**
- Create: `e2e/smoke.mjs`, `README.md`, `CLAUDE.md`, `vercel.json`, `public/_redirects`
- Modify: `.gitignore`, `package.json` (devDependency + script)

**Interfaces:**
- Consumes: o app completo; a URL do Supabase do `.env.local` (o script intercepta as chamadas, sem rede).
- Produces: `npm run smoke` — não sobe servidor; espera `vite preview` em `http://localhost:4173`, faz login com um Supabase falso (interceptado pelo Playwright), visita todas as telas no tamanho de celular em tema claro e escuro, salva capturas em `e2e/screenshots/` e falha se houver erro de JavaScript ou texto esperado ausente.

- [ ] **Step 1: Instalar o Playwright e criar o roteiro**

```bash
npm i -D playwright@1.56.1
```

Em `package.json`, dentro de `"scripts"`, acrescentar:

```json
    "smoke": "node e2e/smoke.mjs"
```

Em `.gitignore`, acrescentar a linha:

```
e2e/screenshots
```

Criar `e2e/smoke.mjs`:

```js
// Verificação visual: roda o app de produção (vite preview) contra um Supabase falso.
// Uso: npm run build, depois npx vite preview --port 4173 em segundo plano, depois npm run smoke
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173'
const OUT = 'e2e/screenshots'
mkdirSync(OUT, { recursive: true })

// Espera o vite preview responder (até 30 s).
for (let i = 0; ; i++) {
  try {
    await fetch(BASE)
    break
  } catch {
    if (i >= 60) throw new Error(`O servidor não respondeu em ${BASE}`)
    await new Promise((r) => setTimeout(r, 500))
  }
}

const dia = (offset) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

const user = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@francoimportados.com',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
}
const clientes = [
  { id: 'c1', nome: 'Cláudia Campo Bello', telefone: '(19) 98287-2749', cpf: null, endereco: 'Rua das Flores, 10', observacao: 'Cliente desde 2025', created_at: '2026-01-01T00:00:00Z' },
  { id: 'c2', nome: 'Andrew Tablet', telefone: null, cpf: null, endereco: null, observacao: null, created_at: '2026-01-01T00:00:00Z' },
]
const p = (id, venda_id, numero, vencimento, valor, valor_pago = 0, data_pagamento = null) => ({ id, venda_id, numero, vencimento, valor, valor_pago, data_pagamento })
const vendas = [
  {
    id: 'v1', cliente_id: 'c1', cliente: clientes[0], produto: 'iPhone 16 branco', data_venda: dia(-40), forma_pagamento: 'boleto',
    capital_proprio: 4310, valor_venda: 5750, entrada: 1550, num_parcelas: 3, primeiro_vencimento: dia(-10), observacao: null, created_at: '2026-01-01T00:00:00Z',
    parcelas: [p('p1', 'v1', 1, dia(-10), 1400, 0), p('p2', 'v1', 2, dia(0), 1400), p('p3', 'v1', 3, dia(20), 1400)],
  },
  {
    id: 'v2', cliente_id: 'c2', cliente: clientes[1], produto: 'Monja', data_venda: dia(-5), forma_pagamento: 'cartao_credito',
    capital_proprio: 420, valor_venda: 1400, entrada: 280, num_parcelas: 4, primeiro_vencimento: dia(3), observacao: null, created_at: '2026-01-01T00:00:00Z',
    parcelas: [p('p4', 'v2', 1, dia(-2), 280, 280, dia(-2)), p('p5', 'v2', 2, dia(3), 280), p('p6', 'v2', 3, dia(33), 280), p('p7', 'v2', 4, dia(63), 280)],
  },
]

async function fakeSupabase(page) {
  await page.route('**/auth/v1/token**', (r) =>
    r.fulfill({ json: { access_token: 'fake', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user } }),
  )
  await page.route('**/auth/v1/user**', (r) => r.fulfill({ json: user }))
  await page.route('**/auth/v1/logout**', (r) => r.fulfill({ status: 204 }))
  await page.route('**/rest/v1/clientes**', (r) => r.fulfill({ json: r.request().method() === 'GET' ? clientes : clientes[0] }))
  await page.route('**/rest/v1/vendas**', (r) => r.fulfill({ json: r.request().method() === 'GET' ? vendas : [] }))
  await page.route('**/rest/v1/parcelas**', (r) => r.fulfill({ status: 204 }))
  await page.route('**/rest/v1/rpc/salvar_venda', (r) => r.fulfill({ json: 'v1' }))
}

const telas = [
  ['dashboard', '/', 'Painel'],
  ['clientes', '/clientes', 'Cláudia Campo Bello'],
  ['cliente', '/clientes/c1', 'Saldo devedor'],
  ['vendas', '/vendas', 'Atrasada'],
  ['venda', '/vendas/v1', '1ª parcela'],
  ['venda-nova', '/vendas/nova', 'Registrar venda'],
  ['venda-editar', '/vendas/v1/editar', 'Salvar venda'],
  ['parcelas', '/parcelas', 'Parcelas'],
  ['agenda', '/agenda', 'Vencem hoje'],
  ['pesquisa', '/pesquisa?q=claudia', 'Cláudia Campo Bello'],
  ['relatorios', '/relatorios', 'Maiores saldos devedores'],
  ['configuracoes', '/configuracoes', 'Aparência'],
]

const falhas = []
const browser = await chromium.launch()
for (const tema of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: tema })
  const page = await context.newPage()
  page.on('pageerror', (e) => falhas.push(`[${tema}] erro de JS: ${e.message}`))
  await fakeSupabase(page)

  await page.goto(`${BASE}/login`)
  await page.screenshot({ path: `${OUT}/${tema}-login.png` })
  await page.getByLabel('E-mail').fill(user.email)
  await page.getByLabel('Senha').fill('senha-de-teste')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(`${BASE}/`)

  for (const [nome, rota, texto] of telas) {
    await page.goto(`${BASE}${rota}`)
    try {
      await page.getByText(texto, { exact: false }).first().waitFor({ timeout: 5000 })
    } catch {
      falhas.push(`[${tema}] ${rota}: texto "${texto}" não apareceu`)
    }
    await page.screenshot({ path: `${OUT}/${tema}-${nome}.png`, fullPage: true })
  }

  await page.goto(`${BASE}/vendas/v1`)
  await page.getByRole('button', { name: 'Registrar pagamento' }).click()
  await page.getByRole('dialog').waitFor()
  await page.screenshot({ path: `${OUT}/${tema}-pagar.png` })
  await page.getByLabel('Valor pago').fill('0')
  await page.getByRole('button', { name: 'Confirmar pagamento' }).click()
  if (!(await page.getByText('Informe um valor maior que zero.').isVisible())) falhas.push(`[${tema}] pagamento zero não foi recusado`)

  await page.goto(`${BASE}/`)
  await page.getByRole('button', { name: 'Abrir menu' }).click()
  await page.screenshot({ path: `${OUT}/${tema}-menu.png` })
  await context.close()
}
await browser.close()

if (falhas.length) {
  console.error(falhas.join('\n'))
  process.exit(1)
}
console.log(`OK — capturas em ${OUT}/`)
```

- [ ] **Step 2: Rodar a verificação**

```bash
npm run build
npx vite preview --port 4173 --strictPort > /tmp/preview.log 2>&1 &
npm run smoke
```

(O roteiro espera o servidor responder antes de começar.)

Expected: `OK — capturas em e2e/screenshots/`. Abrir as capturas (`light-*.png`, `dark-*.png`) e conferir visualmente: logotipo correto em cada tema, nada cortado em 390px, selos legíveis, nenhum texto em inglês. Corrigir o que estiver errado e repetir até passar.

- [ ] **Step 3: Revisão de UI com as skills do projeto**

Invocar a skill `ui-ux-pro-max` e aplicar o checklist de `references/pro-rules.md` (acessibilidade, toque ≥ 44px, contraste nos dois temas, áreas seguras, foco) em `src/components/*.tsx` e `src/pages/*.tsx`. Em seguida invocar a skill `web-design-guidelines` com o padrão `src/**/*.tsx`. Corrigir os achados que valem para este app (registrando os que não valem e por quê na mensagem de commit), rodar de novo `npm run build && npm test && npm run smoke`.

- [ ] **Step 4: Documentação e deploy**

Criar `vercel.json`:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

Criar `public/_redirects` (Netlify):

```
/*    /index.html   200
```

Criar `README.md`:

````markdown
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
| `npm run smoke` | Verificação visual de todas as telas (com `vite preview` rodando na porta 4173) |

## Publicar

Vercel ou Netlify: importe o repositório, comando de build `npm run build`, pasta `dist`, e cadastre as variáveis
`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.

## Instalar no celular

Abra o endereço publicado no navegador do celular. iPhone: **Compartilhar → Adicionar à Tela de Início**.
Android (Chrome): menu **⋮ → Instalar app**.
````

Criar `CLAUDE.md`:

```markdown
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
- Visual: design system Franco Importados (tokens em `src/index.css` e `tailwind.config.js`). Monocromático,
  cantos retos, cor só como feedback (`danger`/`success`) e sempre com texto. Use os componentes de
  `src/components/ui.tsx`; para links com cara de botão, `buttonClass()`.
- Textos em pt-BR, tratando por "você"; botões no infinitivo; valores com `brl()`, datas com `dataBR()`.
- SQL novo vai em `supabase/migrations/NNN_nome.sql`, com teste em `supabase/schema.test.ts` (PGlite).
- Antes de commitar: `npm run build && npm test`.
```

- [ ] **Step 5: Verificação final e commit**

Run: `npm run build && npm test && npm run smoke`
Expected: tudo PASS.

```bash
git add -A
git commit -m "chore: verificação visual, revisão de UI, documentação e configuração de deploy"
git push -u origin claude/dreamy-lamport-cert07
```

- [ ] **Step 6: Entregar o teste com o Supabase real**

O ambiente de desenvolvimento não alcança `*.supabase.co` (bloqueio de rede), então a verificação com dados reais da spec §9 fica com o dono. Informar no fechamento, com estes passos: rodar o SQL (README, passo 1), criar o usuário (passo 2), desativar cadastro (passo 3), `npm run dev`, entrar, cadastrar um cliente, criar uma venda parcelada, pagar uma parcela, editar a venda, desfazer o pagamento, excluir a venda e alternar o tema escuro. Qualquer erro relatado volta como correção pontual.
