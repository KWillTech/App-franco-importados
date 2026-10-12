import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const brl = (v: number | string | null | undefined) => moeda.format(Number(v ?? 0))

export const data = (d: string | null | undefined) => (d ? format(parseISO(d), 'dd/MM/yyyy') : '—')

export const dataExtenso = (d: string) => format(parseISO(d), "EEEE, dd 'de' MMMM", { locale: ptBR })

export const soDigitos = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '')

/** Link do WhatsApp; assume DDI 55 quando o número tem 10 ou 11 dígitos. */
export function whatsapp(telefone: string | null | undefined, mensagem?: string) {
  let n = soDigitos(telefone)
  if (!n) return null
  if (n.length <= 11) n = '55' + n
  return `https://wa.me/${n}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''}`
}

/** Converte "1.234,56" ou "1234.56" em número. */
export function parseValor(s: string): number {
  const t = s.trim()
  if (!t) return 0
  const normal = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  const n = Number(normal.replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

export const valorInput = (n: number | null | undefined) =>
  n ? Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''
