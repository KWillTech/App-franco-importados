import clsx from 'clsx'
import { MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PagarModal } from '@/components/PagarModal'
import { Avatar, Selo, Button, Empty, ErrorBox, Info, Loading, PageHeader, Secao, StatusBadge, buttonClass, useConfirmacao } from '@/components/ui'
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
      <div className="mb-5 rounded-card bg-hero p-5 text-white shadow-elevada">
        <Link to={`/clientes/${v.cliente_id}`} className="flex items-center gap-3">
          <Avatar nome={v.cliente.nome} claro />
          <span className="min-w-0">
            <span className="block text-xs text-white/60">Cliente</span>
            <span className="block truncate font-bold underline-offset-4 hover:underline">{v.cliente.nome}</span>
          </span>
        </Link>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
          <div>
            <div className="text-xs text-white/60">Saldo devedor</div>
            <div className="tabular mt-0.5 text-2xl font-bold text-gold">{brl(saldo)}</div>
          </div>
          <div>
            <div className="text-xs text-white/60">Lucro</div>
            <div className={clsx('tabular mt-0.5 text-2xl font-bold', l < 0 && 'text-[rgb(255_180_171)]')}>{brl(l)}</div>
          </div>
        </div>
      </div>
      <Secao passo="01" titulo="Dados da venda" className="mb-5">
       <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <Info label="Data">{dataBR(v.data_venda)}</Info>
        <Info label="Forma">{FORMAS[v.forma_pagamento]}</Info>
        <Info label="Venda" className="font-bold">
          {brl(v.valor_venda)}
        </Info>
        <Info label="Capital próprio">{brl(v.capital_proprio)}</Info>
        <Info label="Entrada">{brl(v.entrada)}</Info>
        <Info label="Parcelas">{v.num_parcelas > 0 ? `${v.num_parcelas}x` : 'À vista'}</Info>
        {v.observacao && (
          <div className="col-span-2">
            <Info label="Observação">{v.observacao}</Info>
          </div>
        )}
       </div>
      </Secao>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Button className="col-span-2" onClick={() => setPagando({})} disabled={!proxima}>
          {proxima ? 'Registrar pagamento' : 'Venda quitada'}
        </Button>
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className={clsx(buttonClass({ variant: 'secondary' }), 'col-span-2')}>
            <MessageCircle size={18} strokeWidth={1.8} aria-hidden="true" className="text-success" />
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

      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-lg font-bold">Parcelas</h2>
        {v.parcelas.length > 0 && <span className="tabular rounded-pill bg-surface-sunken px-2.5 py-0.5 text-xs font-bold text-ink-muted">{v.parcelas.length}</span>}
      </div>
      {v.parcelas.length === 0 ? (
        <Empty>Venda à vista, sem parcelas.</Empty>
      ) : (
        <ul className="lista">
          {v.parcelas.map((p) => {
            const st = statusParcela(p)
            return (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3.5">
                <Selo size="sm">{String(p.numero).padStart(2, '0')}</Selo>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{p.numero}ª parcela</span>
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
