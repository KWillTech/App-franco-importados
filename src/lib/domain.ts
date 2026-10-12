import { addDays, addMonths, endOfMonth, format, parseISO, subMonths } from 'date-fns'

export type FormaPagamento = 'boleto' | 'cartao_credito' | 'pix' | 'dinheiro'

export const FORMAS: Record<FormaPagamento, string> = {
  boleto: 'Boleto',
  cartao_credito: 'Cartão de Crédito',
  pix: 'Pix',
  dinheiro: 'Dinheiro',
}

export interface Cliente {
  id: string
  nome: string
  telefone: string | null
  cpf: string | null
  endereco: string | null
  observacao: string | null
  created_at: string
}

export interface Parcela {
  id: string
  venda_id: string
  numero: number
  vencimento: string // yyyy-MM-dd
  valor: number
  valor_pago: number
  data_pagamento: string | null
}

export interface Venda {
  id: string
  cliente_id: string
  produto: string
  data_venda: string
  forma_pagamento: FormaPagamento
  capital_proprio: number
  valor_venda: number
  entrada: number
  num_parcelas: number
  primeiro_vencimento: string | null
  observacao: string | null
  created_at: string
}

export type VendaCompleta = Venda & { cliente: Cliente; parcelas: Parcela[] }

export type StatusParcela = 'paga' | 'atrasada' | 'aberta'
export type StatusVenda = 'quitada' | 'atrasada' | 'em_dia'

export const ROTULO_STATUS: Record<StatusVenda | StatusParcela, string> = {
  em_dia: 'Em dia',
  aberta: 'Aberta',
  atrasada: 'Atrasada',
  quitada: 'Quitada',
  paga: 'Paga',
}

export interface NovaParcela {
  numero: number
  vencimento: string
  valor: number
}

export const hoje = () => format(new Date(), 'yyyy-MM-dd')

const cents = (v: number) => Math.round(Number(v) * 100)
export const round2 = (v: number) => cents(v) / 100

export const restante = (p: Pick<Parcela, 'valor' | 'valor_pago'>) =>
  Math.max(0, round2(Number(p.valor) - Number(p.valor_pago)))

export function statusParcela(p: Parcela, ref = hoje()): StatusParcela {
  if (restante(p) === 0) return 'paga'
  return p.vencimento < ref ? 'atrasada' : 'aberta'
}

export function statusVenda(parcelas: Parcela[], ref = hoje()): StatusVenda {
  const st = parcelas.map((p) => statusParcela(p, ref))
  if (st.includes('atrasada')) return 'atrasada'
  if (st.every((s) => s === 'paga')) return 'quitada'
  return 'em_dia'
}

export const lucro = (v: Pick<Venda, 'valor_venda' | 'capital_proprio'>) =>
  round2(Number(v.valor_venda) - Number(v.capital_proprio))

/** Divide um valor em n partes; a diferença de centavos vai para a última. */
export function dividir(total: number, n: number): number[] {
  if (n <= 0) return []
  const t = cents(total)
  const base = Math.floor(t / n)
  return Array.from({ length: n }, (_, i) => (i === n - 1 ? t - base * (n - 1) : base) / 100)
}

export function vencimentoDe(primeiro: string, numero: number): string {
  return format(addMonths(parseISO(primeiro), numero - 1), 'yyyy-MM-dd')
}

export function gerarParcelas(args: {
  valorVenda: number
  entrada: number
  numParcelas: number
  primeiroVencimento: string
}): NovaParcela[] {
  const financiado = round2(args.valorVenda - args.entrada)
  if (args.numParcelas <= 0 || financiado <= 0) return []
  return dividir(financiado, args.numParcelas).map((valor, i) => ({
    numero: i + 1,
    vencimento: vencimentoDe(args.primeiroVencimento, i + 1),
    valor,
  }))
}

/**
 * Recalcula as parcelas de uma venda editada. Parcelas que já têm algum pagamento
 * são mantidas como estão; as demais são regeneradas com o saldo restante.
 * Retorna só as parcelas novas (as pagas continuam no banco).
 */
export function recalcularParcelas(
  args: { valorVenda: number; entrada: number; numParcelas: number; primeiroVencimento: string },
  existentes: Parcela[],
): NovaParcela[] {
  const mantidas = existentes.filter((p) => Number(p.valor_pago) > 0)
  if (mantidas.length === 0) return gerarParcelas(args)
  if (mantidas.some((p) => p.numero > args.numParcelas)) {
    throw new Error('O número de parcelas não pode ser menor que as parcelas já pagas.')
  }
  const usados = new Set(mantidas.map((p) => p.numero))
  const livres = Array.from({ length: args.numParcelas }, (_, i) => i + 1).filter((n) => !usados.has(n))
  const saldo = round2(args.valorVenda - args.entrada - mantidas.reduce((s, p) => s + Number(p.valor), 0))
  if (livres.length === 0) {
    if (saldo > 0) throw new Error('Não há parcelas livres para o saldo restante.')
    return []
  }
  if (saldo < 0) throw new Error('O valor da venda é menor que o já pago.')
  const valores = dividir(saldo, livres.length)
  return livres.map((numero, i) => ({
    numero,
    vencimento: vencimentoDe(args.primeiroVencimento, numero),
    valor: valores[i],
  }))
}

export interface AtualizacaoParcela {
  id: string
  valor_pago: number
  data_pagamento: string | null
}

/**
 * Aplica um pagamento às parcelas em aberto, da mais antiga para a mais nova.
 * Um valor maior que a parcela abate as seguintes.
 */
export function distribuirPagamento(parcelas: Parcela[], valor: number, data: string) {
  let sobra = cents(valor)
  if (sobra <= 0) return { updates: [] as AtualizacaoParcela[], troco: 0 }
  const updates: AtualizacaoParcela[] = []
  const abertas = [...parcelas].filter((p) => restante(p) > 0).sort((a, b) => a.numero - b.numero)
  for (const p of abertas) {
    if (sobra <= 0) break
    const aplicar = Math.min(sobra, cents(restante(p)))
    sobra -= aplicar
    updates.push({ id: p.id, valor_pago: (cents(p.valor_pago) + aplicar) / 100, data_pagamento: data })
  }
  return { updates, troco: sobra / 100 }
}

export const proximaAberta = (parcelas: Parcela[]) =>
  [...parcelas].filter((p) => restante(p) > 0).sort((a, b) => a.numero - b.numero)[0]

export const saldoDevedor = (parcelas: Parcela[]) =>
  round2(parcelas.reduce((s, p) => s + restante(p), 0))

export interface Periodo {
  inicio: string
  fim: string
}

const dentro = (d: string | null, p: Periodo) => !!d && d >= p.inicio && d <= p.fim

export function resumo(vendas: VendaCompleta[], periodo: Periodo, ref = hoje()) {
  const doPeriodo = vendas.filter((v) => dentro(v.data_venda, periodo))
  const parcelas = vendas.flatMap((v) => v.parcelas)
  const sum = (xs: number[]) => round2(xs.reduce((a, b) => a + Number(b), 0))

  const entradas = sum(doPeriodo.map((v) => v.entrada))
  const recebidoParcelas = sum(parcelas.filter((p) => dentro(p.data_pagamento, periodo)).map((p) => p.valor_pago))

  return {
    totalVendas: doPeriodo.length,
    valorVendido: sum(doPeriodo.map((v) => v.valor_venda)),
    lucro: sum(doPeriodo.map(lucro)),
    valorRecebido: round2(entradas + recebidoParcelas),
    parcelasNoPeriodo: sum(parcelas.filter((p) => dentro(p.vencimento, periodo)).map((p) => p.valor)),
    recebidoParcelas,
    emAberto: sum(parcelas.map(restante)),
    emAtraso: sum(parcelas.filter((p) => statusParcela(p, ref) === 'atrasada').map(restante)),
  }
}

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
