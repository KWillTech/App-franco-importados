-- Franco Importados: clientes, vendas e parcelas.
-- Rode este arquivo uma vez no Supabase: Dashboard > SQL Editor > New query > colar > Run.

create type forma_pagamento as enum ('boleto', 'cartao_credito', 'pix', 'dinheiro');

create table clientes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nome text not null,
  telefone text,
  cpf text,
  endereco text,
  observacao text,
  created_at timestamptz not null default now()
);

create table vendas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  cliente_id uuid not null references clientes on delete restrict,
  produto text not null,
  data_venda date not null default current_date,
  forma_pagamento forma_pagamento not null default 'boleto',
  capital_proprio numeric(12,2) not null default 0,
  valor_venda numeric(12,2) not null,
  entrada numeric(12,2) not null default 0,
  num_parcelas int not null default 1 check (num_parcelas >= 0),
  primeiro_vencimento date,
  observacao text,
  created_at timestamptz not null default now()
);

create table parcelas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  venda_id uuid not null references vendas on delete cascade,
  numero int not null,
  vencimento date not null,
  valor numeric(12,2) not null,
  valor_pago numeric(12,2) not null default 0,
  data_pagamento date,
  unique (venda_id, numero)
);

create index on vendas (cliente_id);
create index on parcelas (venda_id);
create index on parcelas (vencimento);

alter table clientes enable row level security;
alter table vendas enable row level security;
alter table parcelas enable row level security;

create policy "dono" on clientes for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "dono" on vendas for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "dono" on parcelas for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Cria a venda e as parcelas numa única transação.
-- p_parcelas: [{"numero":1,"vencimento":"2026-11-10","valor":280.00}, ...]
create or replace function salvar_venda(p_venda jsonb, p_parcelas jsonb)
returns uuid
language plpgsql
security invoker
as $$
declare
  v_id uuid := nullif(p_venda->>'id', '')::uuid;
begin
  if v_id is null then
    insert into vendas (cliente_id, produto, data_venda, forma_pagamento, capital_proprio,
                        valor_venda, entrada, num_parcelas, primeiro_vencimento, observacao)
    values ((p_venda->>'cliente_id')::uuid, p_venda->>'produto', (p_venda->>'data_venda')::date,
            (p_venda->>'forma_pagamento')::forma_pagamento, (p_venda->>'capital_proprio')::numeric,
            (p_venda->>'valor_venda')::numeric, (p_venda->>'entrada')::numeric,
            (p_venda->>'num_parcelas')::int, nullif(p_venda->>'primeiro_vencimento', '')::date,
            p_venda->>'observacao')
    returning id into v_id;
  else
    update vendas set
      cliente_id = (p_venda->>'cliente_id')::uuid,
      produto = p_venda->>'produto',
      data_venda = (p_venda->>'data_venda')::date,
      forma_pagamento = (p_venda->>'forma_pagamento')::forma_pagamento,
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
    -- Parcelas com pagamento são preservadas; o front só envia as que devem ser (re)criadas.
    delete from parcelas where venda_id = v_id and valor_pago = 0;
  end if;

  insert into parcelas (venda_id, numero, vencimento, valor, valor_pago, data_pagamento)
  select v_id, (p->>'numero')::int, (p->>'vencimento')::date, (p->>'valor')::numeric,
         coalesce((p->>'valor_pago')::numeric, 0), nullif(p->>'data_pagamento', '')::date
  from jsonb_array_elements(p_parcelas) p
  on conflict (venda_id, numero) do update
    set vencimento = excluded.vencimento, valor = excluded.valor;

  return v_id;
end;
$$;
