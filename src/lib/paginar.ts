/** O PostgREST devolve no máximo 1.000 linhas por requisição: busca página a página e junta. */
export const TAMANHO_PAGINA = 1000

export async function buscarTodas<T>(buscarPagina: (inicio: number, fim: number) => Promise<T[]>): Promise<T[]> {
  const todas: T[] = []
  for (let inicio = 0; ; inicio += TAMANHO_PAGINA) {
    const pagina = (await buscarPagina(inicio, inicio + TAMANHO_PAGINA - 1)) ?? []
    todas.push(...pagina)
    if (pagina.length < TAMANHO_PAGINA) return todas
  }
}
