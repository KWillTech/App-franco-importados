import { describe, expect, it } from 'vitest'
import {
  dividir,
  distribuirPagamento,
  gerarParcelas,
  recalcularParcelas,
  resumo,
  statusParcela,
  statusVenda,
  type Parcela,
  type VendaCompleta,
} from './domain'

const parcela = (o: Partial<Parcela>): Parcela => ({
  id: `p${o.numero ?? 1}`,
  venda_id: 'v1',
  numero: 1,
  vencimento: '2026-10-10',
  valor: 100,
  valor_pago: 0,
  data_pagamento: null,
  ...o,
})

describe('dividir', () => {
  it('joga a diferença de centavos na última parcela', () => {
    expect(dividir(100, 3)).toEqual([33.33, 33.33, 33.34])
    expect(dividir(2409, 12).reduce((a, b) => a + b, 0)).toBeCloseTo(2409, 2)
  })
})

describe('gerarParcelas', () => {
  it('desconta a entrada e gera vencimentos mensais', () => {
    const ps = gerarParcelas({ valorVenda: 1400, entrada: 280, numParcelas: 4, primeiroVencimento: '2026-10-21' })
    expect(ps.map((p) => p.valor)).toEqual([280, 280, 280, 280])
    expect(ps.map((p) => p.vencimento)).toEqual(['2026-10-21', '2026-11-21', '2026-12-21', '2027-01-21'])
  })

  it('ajusta dia 31 para o fim do mês', () => {
    const ps = gerarParcelas({ valorVenda: 300, entrada: 0, numParcelas: 2, primeiroVencimento: '2026-01-31' })
    expect(ps[1].vencimento).toBe('2026-02-28')
  })

  it('não gera parcelas para venda à vista', () => {
    expect(gerarParcelas({ valorVenda: 500, entrada: 500, numParcelas: 3, primeiroVencimento: '2026-10-01' })).toEqual([])
  })
})

describe('status', () => {
  it('classifica parcelas', () => {
    expect(statusParcela(parcela({ valor_pago: 100 }), '2026-12-01')).toBe('paga')
    expect(statusParcela(parcela({ valor_pago: 50 }), '2026-12-01')).toBe('atrasada')
    expect(statusParcela(parcela({}), '2026-10-10')).toBe('aberta')
  })

  it('classifica vendas', () => {
    const paga = parcela({ numero: 1, valor_pago: 100 })
    const futura = parcela({ numero: 2, vencimento: '2026-11-10' })
    expect(statusVenda([paga], '2026-10-20')).toBe('quitada')
    expect(statusVenda([paga, futura], '2026-10-20')).toBe('em_dia')
    expect(statusVenda([paga, futura], '2026-11-11')).toBe('atrasada')
    expect(statusVenda([], '2026-11-11')).toBe('quitada')
  })
})

describe('distribuirPagamento', () => {
  const ps = [parcela({ numero: 1 }), parcela({ numero: 2 }), parcela({ numero: 3 })]

  it('paga a próxima parcela', () => {
    const { updates, troco } = distribuirPagamento(ps, 100, '2026-10-05')
    expect(updates).toEqual([{ id: 'p1', valor_pago: 100, data_pagamento: '2026-10-05' }])
    expect(troco).toBe(0)
  })

  it('pagamento parcial e excedente abatem em ordem', () => {
    const { updates } = distribuirPagamento([parcela({ numero: 1, valor_pago: 40 }), ...ps.slice(1)], 110, '2026-10-05')
    expect(updates.map((u) => [u.id, u.valor_pago])).toEqual([
      ['p1', 100],
      ['p2', 50],
    ])
  })

  it('devolve troco quando paga mais que o saldo', () => {
    expect(distribuirPagamento(ps, 350, '2026-10-05').troco).toBe(50)
  })
})

describe('recalcularParcelas', () => {
  const args = { valorVenda: 1000, entrada: 100, numParcelas: 3, primeiroVencimento: '2026-10-10' }

  it('mantém as pagas e redistribui o saldo', () => {
    const existentes = [parcela({ numero: 1, valor: 300, valor_pago: 300 }), parcela({ numero: 2, valor: 300 })]
    const novas = recalcularParcelas({ ...args, numParcelas: 4 }, existentes)
    expect(novas.map((p) => p.numero)).toEqual([2, 3, 4])
    expect(novas.map((p) => p.valor)).toEqual([200, 200, 200])
  })

  it('recusa reduzir abaixo das parcelas pagas', () => {
    const existentes = [parcela({ numero: 3, valor: 300, valor_pago: 300 })]
    expect(() => recalcularParcelas({ ...args, numParcelas: 2 }, existentes)).toThrow()
  })
})

describe('resumo', () => {
  it('soma os indicadores do período', () => {
    const venda: VendaCompleta = {
      id: 'v1',
      cliente_id: 'c1',
      cliente: { id: 'c1', nome: 'Ana', telefone: null, cpf: null, endereco: null, observacao: null, created_at: '' },
      produto: 'iPhone',
      data_venda: '2026-10-01',
      forma_pagamento: 'boleto',
      capital_proprio: 600,
      valor_venda: 1000,
      entrada: 400,
      num_parcelas: 3,
      primeiro_vencimento: '2026-09-05',
      observacao: null,
      created_at: '',
      parcelas: [
        parcela({ numero: 1, vencimento: '2026-09-05', valor: 200, valor_pago: 200, data_pagamento: '2026-10-02' }),
        parcela({ numero: 2, vencimento: '2026-10-05', valor: 200 }),
        parcela({ numero: 3, vencimento: '2026-11-05', valor: 200 }),
      ],
    }
    const r = resumo([venda], { inicio: '2026-10-01', fim: '2026-10-31' }, '2026-10-20')
    expect(r).toEqual({
      totalVendas: 1,
      valorVendido: 1000,
      lucro: 400,
      valorRecebido: 600,
      parcelasNoPeriodo: 200,
      recebidoParcelas: 200,
      emAberto: 400,
      emAtraso: 200,
    })
  })
})
