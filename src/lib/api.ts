import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { AtualizacaoParcela, Cliente, NovaParcela, Parcela, Venda, VendaCompleta } from './domain'

const n = (v: unknown) => Number(v ?? 0)

function normalizarParcela(p: Parcela): Parcela {
  return { ...p, valor: n(p.valor), valor_pago: n(p.valor_pago) }
}

function normalizarVenda(v: VendaCompleta): VendaCompleta {
  return {
    ...v,
    capital_proprio: n(v.capital_proprio),
    valor_venda: n(v.valor_venda),
    entrada: n(v.entrada),
    parcelas: (v.parcelas ?? []).map(normalizarParcela).sort((a, b) => a.numero - b.numero),
  }
}

function ok<T>(r: { data: T | null; error: { message: string } | null }): T {
  if (r.error) throw new Error(r.error.message)
  return r.data as T
}

export function useClientes() {
  return useQuery({
    queryKey: ['clientes'],
    queryFn: async () => ok(await supabase.from('clientes').select('*').order('nome')) as Cliente[],
  })
}

export function useVendas() {
  return useQuery({
    queryKey: ['vendas'],
    queryFn: async () => {
      const data = ok(
        await supabase
          .from('vendas')
          .select('*, cliente:clientes(*), parcelas(*)')
          .order('data_venda', { ascending: false })
          .order('created_at', { ascending: false }),
      ) as VendaCompleta[]
      return data.map(normalizarVenda)
    },
  })
}

function useInvalidar() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['clientes'] })
    qc.invalidateQueries({ queryKey: ['vendas'] })
  }
}

export type ClienteInput = Omit<Cliente, 'id' | 'created_at'> & { id?: string }

export function useSalvarCliente() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ id, ...dados }: ClienteInput) => {
      const q = id
        ? supabase.from('clientes').update(dados).eq('id', id).select().single()
        : supabase.from('clientes').insert(dados).select().single()
      return ok(await q) as Cliente
    },
    onSuccess: invalidar,
  })
}

export function useExcluirCliente() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clientes').delete().eq('id', id)
      if (error) {
        throw new Error(
          error.code === '23001' || error.code === '23503' ? 'Este cliente tem vendas. Exclua as vendas primeiro.' : error.message,
        )
      }
    },
    onSuccess: invalidar,
  })
}

export type VendaInput = Omit<Venda, 'id' | 'created_at'> & { id?: string }

export function useSalvarVenda() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async ({ venda, parcelas }: { venda: VendaInput; parcelas: NovaParcela[] }) =>
      ok(await supabase.rpc('salvar_venda', { p_venda: venda, p_parcelas: parcelas })) as string,
    onSuccess: invalidar,
  })
}

export function useExcluirVenda() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (id: string) => {
      ok(await supabase.from('vendas').delete().eq('id', id))
    },
    onSuccess: invalidar,
  })
}

export function useAtualizarParcelas() {
  const invalidar = useInvalidar()
  return useMutation({
    mutationFn: async (updates: AtualizacaoParcela[]) => {
      for (const { id, ...dados } of updates) {
        ok(await supabase.from('parcelas').update(dados).eq('id', id))
      }
    },
    onSuccess: invalidar,
  })
}
