import { endOfMonth, endOfWeek, endOfYear, format, startOfMonth, startOfWeek, startOfYear, subMonths } from 'date-fns'
import type { Periodo } from './domain'

export type ChavePeriodo = 'hoje' | 'semana' | 'mes' | 'mes_passado' | 'ano' | 'tudo'

export const PERIODOS: Record<ChavePeriodo, string> = {
  hoje: 'Hoje',
  semana: 'Esta Semana',
  mes: 'Este Mês',
  mes_passado: 'Mês Passado',
  ano: 'Este Ano',
  tudo: 'Todo o período',
}

const f = (d: Date) => format(d, 'yyyy-MM-dd')

export function periodo(chave: ChavePeriodo, agora = new Date()): Periodo {
  switch (chave) {
    case 'hoje':
      return { inicio: f(agora), fim: f(agora) }
    case 'semana':
      return { inicio: f(startOfWeek(agora)), fim: f(endOfWeek(agora)) }
    case 'mes':
      return { inicio: f(startOfMonth(agora)), fim: f(endOfMonth(agora)) }
    case 'mes_passado': {
      const m = subMonths(agora, 1)
      return { inicio: f(startOfMonth(m)), fim: f(endOfMonth(m)) }
    }
    case 'ano':
      return { inicio: f(startOfYear(agora)), fim: f(endOfYear(agora)) }
    case 'tudo':
      return { inicio: '0000-01-01', fim: '9999-12-31' }
  }
}
