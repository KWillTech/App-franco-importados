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
