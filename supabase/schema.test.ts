import { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'

const MIGRACOES = ['001_schema.sql', '002_equipe_e_troca_de_senha.sql'].map((f) =>
  readFileSync(new URL(`./migrations/${f}`, import.meta.url), 'utf8'),
)
const U1 = '00000000-0000-0000-0000-000000000001'
const U2 = '00000000-0000-0000-0000-000000000002'

// Simula o que o Supabase já oferece: schema auth, auth.uid()/auth.jwt() lendo o JWT e os papéis anon/authenticated.
const SUPABASE_STUB = `
create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  encrypted_password text,
  raw_app_meta_data jsonb default '{"provider": "email"}'
);
create function auth.uid() returns uuid language sql stable
  as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create function auth.jwt() returns jsonb language sql stable
  as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create role anon;
create role authenticated;
grant usage on schema auth, public to anon, authenticated;
insert into auth.users values ('${U1}'), ('${U2}');
`

let db: PGlite

async function como(usuario: string, claims: object = {}) {
  await db.exec(
    `reset role; set role authenticated; set request.jwt.claim.sub = '${usuario}'; set request.jwt.claims = '${JSON.stringify(claims)}';`,
  )
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
  // Os usuários que já existiam antes da 002 (o administrador) não precisam trocar a senha.
  await db.exec(MIGRACOES[0])
  await db.exec(MIGRACOES[1])
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

  it('a equipe compartilha os dados: um usuário vê e edita o que o outro cadastrou', async () => {
    await como(U1)
    const c = await novoCliente()
    const id = await salvarVenda(vendaBase(c), tresParcelas)
    await como(U2)
    expect((await db.query('select * from clientes')).rows).toHaveLength(1)
    expect((await db.query("update clientes set nome = 'Ana Maria' where id = $1", [c])).affectedRows).toBe(1)
    expect((await db.query('update parcelas set valor_pago = 200 where venda_id = $1 and numero = 1', [id])).affectedRows).toBe(1)
    await salvarVenda({ ...vendaBase(c), id, produto: 'iPhone 16 Pro' }, [3].map((n) => ({ numero: n, vencimento: '2027-03-01', valor: 200 })))
  })

  it('visitante sem login e login anônimo não veem nada', async () => {
    await como(U1)
    await novoCliente()
    await como(U2, { is_anonymous: true })
    expect((await db.query('select * from clientes')).rows).toHaveLength(0)
    await expect(novoCliente('Intruso')).rejects.toThrow()
    await db.exec('reset role; set role anon;')
    await expect(db.query('select * from clientes')).rejects.toThrow()
  })

  it('excluir um usuário não apaga o que ele cadastrou', async () => {
    await como(U2)
    const id = await salvarVenda(vendaBase(await novoCliente()), tresParcelas)
    await db.exec('reset role;')
    await db.query('delete from auth.users where id = $1', [U2])
    const v = await db.query<{ user_id: string | null }>('select user_id from vendas where id = $1', [id])
    expect(v.rows[0].user_id).toBeNull()
    expect((await db.query('select * from parcelas where venda_id = $1', [id])).rows).toHaveLength(3)
  })

  it('usuário novo nasce marcado para trocar a senha e a marca sai quando a senha muda', async () => {
    await db.exec('reset role;')
    const U3 = '00000000-0000-0000-0000-000000000003'
    await db.query("insert into auth.users (id, email, encrypted_password) values ($1, 'nova@franco.com', 'hash-1')", [U3])
    const meta = async () =>
      (await db.query<{ m: Record<string, unknown> }>('select raw_app_meta_data as m from auth.users where id = $1', [U3])).rows[0].m
    expect(await meta()).toEqual({ provider: 'email', trocar_senha: true })
    // Outras mudanças (último login, e-mail) não tiram a marca.
    await db.query("update auth.users set email = 'nova2@franco.com' where id = $1", [U3])
    expect((await meta()).trocar_senha).toBe(true)
    await db.query("update auth.users set encrypted_password = 'hash-2' where id = $1", [U3])
    expect(await meta()).toEqual({ provider: 'email' })
    // O administrador, que já existia, não é marcado.
    const adm = await db.query<{ m: Record<string, unknown> }>('select raw_app_meta_data as m from auth.users where id = $1', [U1])
    expect(adm.rows[0].m.trocar_senha).toBeUndefined()
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
    await expect(db.query('delete from clientes where id = $1', [c])).rejects.toMatchObject({ code: '23001' })
    await db.query('delete from vendas where id = $1', [id])
    expect((await db.query('select * from parcelas')).rows).toHaveLength(0)
  })
})
