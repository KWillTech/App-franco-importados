export type Celula = string | number | null | undefined

function celula(v: Celula): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'number') return Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',')
  // Texto que começa com = + - @ (ou tab/CR) seria executado como fórmula no Excel.
  const t = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v
  return /[;"\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t
}

/** CSV no padrão do Excel em português: separador ";" e vírgula decimal. */
export function toCsv(linhas: Celula[][]): string {
  return linhas.map((l) => l.map(celula).join(';')).join('\r\n')
}

export function baixarCsv(nome: string, linhas: Celula[][]) {
  // O BOM faz o Excel reconhecer UTF-8 (acentos).
  const blob = new Blob(['﻿' + toCsv(linhas)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
