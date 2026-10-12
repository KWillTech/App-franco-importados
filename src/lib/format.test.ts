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
