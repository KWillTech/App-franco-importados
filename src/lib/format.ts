import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const brl = (v: number | string | null | undefined) => moeda.format(Number(v ?? 0))

export const dataBR = (d: string | null | undefined) => (d ? format(parseISO(d), 'dd/MM/yyyy') : '—')

export const dataExtenso = (d: string) => format(parseISO(d), "EEEE, dd 'de' MMMM", { locale: ptBR })

/** "2026-10" → "out de 2026". */
export const mesAno = (m: string) => format(parseISO(`${m}-01`), "MMM 'de' yyyy", { locale: ptBR })

export const soDigitos = (s: string | null | undefined) => (s ?? '').replace(/\D/g, '')

/** Link do WhatsApp; assume DDI 55 quando o número tem até 11 dígitos. */
export function whatsapp(telefone: string | null | undefined, mensagem?: string) {
  let n = soDigitos(telefone)
  if (!n) return null
  if (n.length <= 11) n = '55' + n
  return `https://wa.me/${n}${mensagem ? `?text=${encodeURIComponent(mensagem)}` : ''}`
}

export function mensagemCobranca(nome: string, valor: number, vencimento?: string | null) {
  const primeiro = nome.trim().split(/\s+/)[0]
  const quando = vencimento ? ` com vencimento em ${dataBR(vencimento)}` : ''
  return `Olá, ${primeiro}, tudo bem? Passando para lembrar da parcela de ${brl(valor)}${quando}. Qualquer dúvida, estou à disposição. Franco Importados`
}

/**
 * Converte o que a pessoa digitou em número: "1.234,56", "1.400" (mil e quatrocentos),
 * "1234.56", "R$ 280". Vazio, texto ou negativo viram 0.
 */
export function parseValor(s: string): number {
  let t = s.replace(/[^\d.,-]/g, '')
  if (!t || t.startsWith('-')) return 0
  if (t.includes(',')) t = t.replace(/\./g, '').replace(',', '.')
  else if (/^\d{1,3}(\.\d{3})+$/.test(t)) t = t.replace(/\./g, '')
  const n = Number(t)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0
}

export const valorInput = (n: number | null | undefined) =>
  n ? Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''

/** Minúsculas e sem acentos, para comparar buscas. */
export const normalizar = (s: string | null | undefined) =>
  (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()

/** Todos os termos da busca aparecem em algum dos campos (ou os dígitos batem com um telefone/CPF). */
export function combina(busca: string, ...campos: (string | null | undefined)[]) {
  const termos = normalizar(busca).split(/\s+/).filter(Boolean)
  if (termos.length === 0) return true
  const alvo = campos.map(normalizar).join(' ')
  if (termos.every((t) => alvo.includes(t))) return true
  const digitos = soDigitos(busca)
  return digitos.length >= 3 && campos.some((c) => soDigitos(c).includes(digitos))
}
