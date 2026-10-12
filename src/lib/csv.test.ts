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

  it('neutraliza texto que o Excel interpretaria como fórmula', () => {
    expect(toCsv([['=1+1', '+55', '-x', '@a', '\tx', 'ok', -5]])).toBe("'=1+1;'+55;'-x;'@a;'\tx;ok;-5")
  })
})
