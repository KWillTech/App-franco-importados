import clsx from 'clsx'
import { CircleDollarSign, Eye, Pencil, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useExcluirVenda } from '@/lib/api'
import { FORMAS, lucro, proximaAberta, restante, statusVenda, type VendaCompleta } from '@/lib/domain'
import { brl, dataBR } from '@/lib/format'
import { Avatar, Button, Card, ErrorBox, Info, StatusBadge, buttonClass, useConfirmacao } from './ui'

export function VendaCard({ venda, onPagar }: { venda: VendaCompleta; onPagar: () => void }) {
  const excluir = useExcluirVenda()
  const [confirmar, dialogo] = useConfirmacao()
  const status = statusVenda(venda.parcelas)
  const restantes = venda.parcelas.filter((p) => restante(p) > 0).length
  const valorParcela = (proximaAberta(venda.parcelas) ?? venda.parcelas[0])?.valor
  const l = lucro(venda)

  async function remover() {
    const ok = await confirmar({
      titulo: 'Excluir venda',
      mensagem: `Excluir a venda de ${venda.produto} para ${venda.cliente.nome}? As parcelas também serão apagadas. Esta ação não pode ser desfeita.`,
      acao: 'Excluir',
      tom: 'danger',
    })
    if (!ok) return
    try {
      await excluir.mutateAsync(venda.id)
    } catch {
      // o erro aparece no ErrorBox abaixo
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-3 border-b border-line-soft pb-4">
        <Avatar nome={venda.cliente.nome} />
        <div className="min-w-0 flex-1">
          <Link to={`/clientes/${venda.cliente_id}`} className="block truncate text-lg font-bold leading-6 hover:underline">
            {venda.cliente.nome}
          </Link>
          <div className="truncate text-sm text-ink-muted">{venda.produto}</div>
        </div>
        <StatusBadge status={status} />
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-field bg-surface-sunken/60 p-4">
        <Info label="Data">{dataBR(venda.data_venda)}</Info>
        <Info label="Forma">{FORMAS[venda.forma_pagamento]}</Info>
        <Info label="Capital próprio">{brl(venda.capital_proprio)}</Info>
        <Info label="Venda" className="font-bold">
          {brl(venda.valor_venda)}
        </Info>
        <Info label="Lucro" className={clsx('font-bold', l >= 0 ? 'text-success' : 'text-danger')}>
          {brl(l)}
        </Info>
        <Info label="Entrada">{brl(venda.entrada)}</Info>
        <Info label="Parcelas">{venda.num_parcelas > 0 ? `${venda.num_parcelas}x de ${brl(valorParcela)}` : 'À vista'}</Info>
        <Info label="Restantes">{restantes === 1 ? '1 parcela' : `${restantes} parcelas`}</Info>
      </div>
      <ErrorBox error={excluir.error} />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Link to={`/vendas/${venda.id}`} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
          <Eye size={16} strokeWidth={1.5} aria-hidden="true" />
          Detalhes
        </Link>
        <Link to={`/vendas/${venda.id}/editar`} className={buttonClass({ variant: 'secondary', size: 'sm' })}>
          <Pencil size={16} strokeWidth={1.5} aria-hidden="true" />
          Editar
        </Link>
        <Button size="sm" onClick={onPagar} disabled={restantes === 0}>
          <CircleDollarSign size={16} strokeWidth={1.8} aria-hidden="true" className={restantes === 0 ? undefined : 'text-gold dark:text-on-brand'} />
          {restantes === 0 ? 'Quitada' : 'Pagar'}
        </Button>
        <Button size="sm" variant="danger" onClick={remover} disabled={excluir.isPending}>
          <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
          Excluir
        </Button>
      </div>
      {dialogo}
    </Card>
  )
}
