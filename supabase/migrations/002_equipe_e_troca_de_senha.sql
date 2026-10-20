-- Franco Importados: equipe com dados compartilhados e troca de senha no primeiro acesso.
-- Rode uma vez no Supabase (SQL Editor > New query > colar > Run), ANTES de criar os novos usuários.

-- 1) Dados compartilhados: todo usuário do app vê e edita os mesmos clientes, vendas e parcelas.
--    Só o administrador cria usuários (cadastro público desativado no Supabase), então "logado" = equipe.
--    Login anônimo, se um dia for ligado, não entra.
drop policy if exists clientes_dono on public.clientes;
drop policy if exists vendas_dono on public.vendas;
drop policy if exists parcelas_dono on public.parcelas;

create policy clientes_equipe on public.clientes for all to authenticated
  using ((select coalesce((auth.jwt()->>'is_anonymous')::boolean, false)) = false)
  with check ((select coalesce((auth.jwt()->>'is_anonymous')::boolean, false)) = false);
create policy vendas_equipe on public.vendas for all to authenticated
  using ((select coalesce((auth.jwt()->>'is_anonymous')::boolean, false)) = false)
  with check ((select coalesce((auth.jwt()->>'is_anonymous')::boolean, false)) = false);
create policy parcelas_equipe on public.parcelas for all to authenticated
  using ((select coalesce((auth.jwt()->>'is_anonymous')::boolean, false)) = false)
  with check ((select coalesce((auth.jwt()->>'is_anonymous')::boolean, false)) = false);

-- user_id passa a significar "quem cadastrou". Excluir um usuário não pode apagar os dados da loja.
alter table public.clientes alter column user_id drop not null;
alter table public.vendas alter column user_id drop not null;
alter table public.parcelas alter column user_id drop not null;
alter table public.clientes drop constraint clientes_user_id_fkey,
  add constraint clientes_user_id_fkey foreign key (user_id) references auth.users (id) on delete set null;
alter table public.vendas drop constraint vendas_user_id_fkey,
  add constraint vendas_user_id_fkey foreign key (user_id) references auth.users (id) on delete set null;
alter table public.parcelas drop constraint parcelas_user_id_fkey,
  add constraint parcelas_user_id_fkey foreign key (user_id) references auth.users (id) on delete set null;

-- 2) Troca de senha no primeiro acesso.
--    Todo usuário criado a partir de agora nasce com app_metadata.trocar_senha = true (o usuário não
--    consegue alterar app_metadata). A marca sai sozinha quando a senha muda, então não dá para pular.
--    Para obrigar alguém a trocar de novo:
--      update auth.users set raw_app_meta_data = raw_app_meta_data || '{"trocar_senha": true}'
--      where email = 'pessoa@exemplo.com';
create or replace function public.marcar_troca_de_senha()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb) || '{"trocar_senha": true}'::jsonb;
  return new;
end;
$$;

create or replace function public.limpar_troca_de_senha()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.encrypted_password is distinct from old.encrypted_password then
    new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb) - 'trocar_senha';
  end if;
  return new;
end;
$$;

-- Só os gatilhos chamam essas funções.
revoke execute on function public.marcar_troca_de_senha() from public, anon, authenticated;
revoke execute on function public.limpar_troca_de_senha() from public, anon, authenticated;

drop trigger if exists marcar_troca_de_senha on auth.users;
create trigger marcar_troca_de_senha before insert on auth.users
  for each row execute function public.marcar_troca_de_senha();

drop trigger if exists limpar_troca_de_senha on auth.users;
create trigger limpar_troca_de_senha before update of encrypted_password on auth.users
  for each row execute function public.limpar_troca_de_senha();
