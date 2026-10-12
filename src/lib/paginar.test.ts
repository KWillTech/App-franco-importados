import { describe, expect, it } from 'vitest'
import { buscarTodas } from './paginar'

const fonte = (total: number) => async (inicio: number, fim: number) =>
  Array.from({ length: Math.max(0, Math.min(fim + 1, total) - inicio) }, (_, i) => inicio + i)

describe('buscarTodas', () => {
  it('junta páginas de 1.000 até vir uma página incompleta', async () => {
    const todas = await buscarTodas(fonte(2500))
    expect(todas).toHaveLength(2500)
    expect(todas[2499]).toBe(2499)
  })

  it('para após uma página cheia seguida de página vazia', async () => {
    const chamadas: number[] = []
    const f = fonte(2000)
    const todas = await buscarTodas(async (i, j) => (chamadas.push(i), f(i, j)))
    expect(todas).toHaveLength(2000)
    expect(chamadas).toEqual([0, 1000, 2000])
  })

  it('não repete a busca quando cabe em uma página', async () => {
    expect(await buscarTodas(fonte(3))).toEqual([0, 1, 2])
  })
})
