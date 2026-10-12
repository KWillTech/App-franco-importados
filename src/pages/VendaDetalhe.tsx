import clsx from 'clsx'
import { MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PagarModal } from '@/components/PagarModal'
import { Button, Card, Empty, ErrorBox, Info, Loading, PageHeader, StatusBadge, buttonClass, useConfirmacao } from '@/components/ui'
import { useAtualizarParcelas, useExcluirVenda, useVendas } from '@/lib/api'
import { FORMAS, lucro, proximaAberta, restante, saldoDevedor, statusParcela, statusVenda, type Parcela } from '@/lib/domain'
import { brl, dataBR, mensagemCobranca, whatsapp } from '@/lib/format'

export default function VendaDetalhe() {
  const { id } = useParams()
  const vendas = useVendas()
  const atualizar = useAtualizarParcelas()
  const excluir = useExcluirVenda()
  const navigate = useNavigate()
  const [confirmar, dialogo] = useConfirmacao()
  const [pagando, setPagando] = useState<{ parcela?: Parcela } | null>(null)

  if (vendas.isLoading) return <Loading />
  if (vendas.error) return <ErrorBox error={vendas.error} />
  const venda = vendas.data?.find((v) => v.id === id)
  if (!venda) return <Empty>Venda não encontrada.</Empty>
  const v = venda

  const status = statusVenda(v.parcelas)
  const saldo = saldoDevedor(v.parcelas)
  const proxima = proximaAberta(v.parcelas)
  const l = lucro(v)
  const link = proxima ? whatsapp(v.cliente.telefone, mensagemCobranca(v.cliente.nome, restante(proxima), proxima.vencimento)) : null

  async function desfazer(p: Parcela) {
    const ok = await confirmar({
      titulo: 'Desfazer pagamento',
      mensagem: `Desfazer o pagamento da parcela ${p.numero}? O valor pago volta a ficar em aberto.`,
      acao: 'Desfazer',
    })
    if (!ok) return
    try {
      await atualizar.mutateAsync([{ id: p.id, valor_pago: 0, data_pagamento: null }])
    } catch {
      // o erro aparece no ErrorBox abaixo
    }
  }

  async function remover() {
    const ok = await confirmar({
      titulo: 'Excluir venda',
      mensagem: `Excluir a venda de ${v.produto} para ${v.cliente.nome}? As parcelas também serão apagadas. Esta ação não pode ser desfeita.`,
      acao: 'Excluir',
      tom: 'danger',
    })
    if (!ok) return
    try {
      await excluir.mutateAsync(v.id)
      navigate('/vendas', { replace: true })
    } catch {
      // o erro aparece no ErrorBox abaixo
    }
  }

  return (
    <>
      <PageHeader eyebrow="Venda" title={v.produto} action={<StatusBadge status={status} />} />
      <Card className="mb-6 grid grid-cols-2 gap-x-4 gap-y-3">
        <Info label="Cliente">
          <Link to={`/clientes/${v.cliente_id}`} className="underline underline-offset-4">
            {v.cliente.nome}
          </Link>
        </Info>
        <Info label="Data">{dataBR(v.data_venda)}</Info>
        <Info label="Forma">{FORMAS[v.forma_pagamento]}</Info>
        <Info label="Venda" className="font-medium">
          {brl(v.valor_venda)}
        </Info>
        <Info label="Capital próprio">{brl(v.capital_proprio)}</Info>
        <Info label="Lucro" className={clsx('font-medium', l >= 0 ? 'text-success' : 'text-danger')}>
          {brl(l)}
        </Info>
        <Info label="Entrada">{brl(v.entrada)}</Info>
        <Info label="Saldo devedor" className="font-medium">
          {brl(saldo)}
        </Info>
        {v.observacao && (
          <div className="col-span-2">
            <Info label="Observação">{v.observacao}</Info>
          </div>
        )}
      </Card>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Button className="col-span-2" onClick={() => setPagando({})} disabled={!proxima}>
          {proxima ? 'Registrar pagamento' : 'Venda quitada'}
        </Button>
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className={clsx(buttonClass({ variant: 'secondary' }), 'col-span-2')}>
            <MessageCircle size={18} strokeWidth={1.5} aria-hidden="true" />
            Cobrar no WhatsApp
          </a>
        )}
        <Link to={`/vendas/${v.id}/editar`} className={buttonClass({ variant: 'secondary' })}>
          Editar
        </Link>
        <Button variant="danger" onClick={remover} disabled={excluir.isPending}>
          Excluir
        </Button>
      </div>
      <div className="mb-6">
        <ErrorBox error={atualizar.error ?? excluir.error} />
      </div>

      <p className="eyebrow mb-3">Parcelas</p>
      {v.parcelas.length === 0 ? (
        <Empty>Venda à vista, sem parcelas.</Empty>
      ) : (
        <ul className="divide-y divide-line border border-line bg-surface-raised">
          {v.parcelas.map((p) => {
            const st = statusParcela(p)
            return (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.numero}ª parcela</span>
                    <StatusBadge status={st} />
                  </div>
                  <div className="tabular text-sm text-ink-muted">
                    Vence {dataBR(p.vencimento)} · {brl(p.valor)}
                  </div>
                  {p.valor_pago > 0 && (
                    <div className="tabular text-sm text-ink-muted">
                      Pago {brl(p.valor_pago)} em {dataBR(p.data_pagamento)}
                    </div>
                  )}
                </div>
                {st !== 'paga' && (
                  <Button size="sm" variant="secondary" onClick={() => setPagando({ parcela: p })}>
                    Pagar
                  </Button>
                )}
                {p.valor_pago > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => desfazer(p)} disabled={atualizar.isPending}>
                    Desfazer
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {pagando && <PagarModal venda={v} parcela={pagando.parcela} onClose={() => setPagando(null)} />}
      {dialogo}
    </>
  )
}
