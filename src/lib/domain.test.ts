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
  precisaTrocarSenha,
  validarNovaSenha,
  type Cliente,
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

  it('recusa valor de venda menor que o já pago, mesmo sem parcelas livres', () => {
    const existentes = [
      parcela({ numero: 1, valor: 500, valor_pago: 500 }),
      parcela({ numero: 2, valor: 500, valor_pago: 500 }),
    ]
    expect(() =>
      recalcularParcelas({ valorVenda: 800, entrada: 0, numParcelas: 2, primeiroVencimento: '2026-10-10' }, existentes),
    ).toThrow('O valor da venda é menor que o já pago.')
  })

  it('recusa saldo zerado quando ainda há parcelas livres', () => {
    const existentes = [parcela({ numero: 1, valor: 500, valor_pago: 200 })]
    expect(() =>
      recalcularParcelas({ valorVenda: 1000, entrada: 500, numParcelas: 3, primeiroVencimento: '2026-10-10' }, existentes),
    ).toThrow('O saldo já está coberto pelas parcelas pagas')
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

describe('validarNovaSenha', () => {
  it('aceita senha com 8+ caracteres repetida igual', () => {
    expect(validarNovaSenha('franco2026', 'franco2026')).toEqual({})
  })
  it('recusa senha curta, só de espaços ou confirmação diferente/vazia', () => {
    expect(validarNovaSenha('abc', 'abc').senha).toBe('Use pelo menos 8 caracteres.')
    expect(validarNovaSenha('        ', '        ').senha).toBe('A senha não pode ter só espaços.')
    expect(validarNovaSenha('franco2026', 'franco2025').confirmacao).toBe('As senhas não são iguais.')
    expect(validarNovaSenha('franco2026', '').confirmacao).toBe('Repita a senha.')
  })
})

describe('precisaTrocarSenha', () => {
  it('só quando o banco marcou trocar_senha = true', () => {
    expect(precisaTrocarSenha({ provider: 'email', trocar_senha: true })).toBe(true)
    expect(precisaTrocarSenha({ provider: 'email' })).toBe(false)
    expect(precisaTrocarSenha({ trocar_senha: 'true' })).toBe(false)
    expect(precisaTrocarSenha(undefined)).toBe(false)
  })
})
