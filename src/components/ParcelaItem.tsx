import { MessageCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { restante, statusParcela, type ItemAgenda } from '@/lib/domain'
import { brl, dataBR, mensagemCobranca, whatsapp } from '@/lib/format'
import { Button, StatusBadge, buttonClass } from './ui'

export function ParcelaItem({ venda, parcela, onPagar }: ItemAgenda & { onPagar: () => void }) {
  const status = statusParcela(parcela)
  const aberta = status !== 'paga'
  const link = aberta ? whatsapp(venda.cliente.telefone, mensagemCobranca(venda.cliente.nome, restante(parcela), parcela.vencimento)) : null
  return (
    <li className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
      <Link to={`/vendas/${venda.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{venda.cliente.nome}</span>
          <StatusBadge status={status} />
        </div>
        <div className="truncate text-sm text-ink-muted">
          {venda.produto} · parcela {parcela.numero}/{venda.num_parcelas}
        </div>
        <div className="tabular text-sm">
          {aberta
            ? `Vence ${dataBR(parcela.vencimento)} · ${brl(restante(parcela))}`
            : `Paga em ${dataBR(parcela.data_pagamento)} · ${brl(parcela.valor_pago)}`}
        </div>
      </Link>
      {aberta && (
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {link ? (
            <a href={link} target="_blank" rel="noreferrer" className={buttonClass({ variant: 'secondary', size: 'sm' })}>
              <MessageCircle size={16} strokeWidth={1.5} aria-hidden="true" />
              WhatsApp
            </a>
          ) : (
            <span className="flex items-center justify-center text-xs leading-4 text-ink-subtle">Sem telefone</span>
          )}
          <Button size="sm" onClick={onPagar}>
            Pagar
          </Button>
        </div>
      )}
    </li>
  )
}
