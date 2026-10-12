import clsx from 'clsx'
import { MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ClienteForm } from '@/components/ClienteForm'
import { PagarModal } from '@/components/PagarModal'
import { VendaCard } from '@/components/VendaCard'
import { Button, Card, Empty, ErrorBox, Info, Loading, PageHeader, buttonClass, useConfirmacao } from '@/components/ui'
import { useClientes, useExcluirCliente, useVendas } from '@/lib/api'
import { restante, round2, saldoDevedor, statusParcela, type VendaCompleta } from '@/lib/domain'
import { brl, mensagemCobranca, whatsapp } from '@/lib/format'

export default function ClienteDetalhe() {
  const { id } = useParams()
  const clientes = useClientes()
  const vendas = useVendas()
  const excluir = useExcluirCliente()
  const navigate = useNavigate()
  const [confirmar, dialogo] = useConfirmacao()
  const [editando, setEditando] = useState(false)
  const [pagando, setPagando] = useState<VendaCompleta | null>(null)

  if (clientes.isLoading || vendas.isLoading) return <Loading />
  const erro = clientes.error ?? vendas.error
  if (erro) return <ErrorBox error={erro} />
  const cliente = clientes.data?.find((c) => c.id === id)
  if (!cliente) return <Empty>Cliente não encontrado.</Empty>
  const c = cliente

  const doCliente = (vendas.data ?? []).filter((v) => v.cliente_id === c.id)
  const parcelas = doCliente.flatMap((v) => v.parcelas)
  const devido = saldoDevedor(parcelas)
  const atrasado = round2(parcelas.filter((p) => statusParcela(p) === 'atrasada').reduce((s, p) => s + restante(p), 0))
  const link = whatsapp(c.telefone, atrasado > 0 ? mensagemCobranca(c.nome, atrasado) : undefined)

  async function remover() {
    const ok = await confirmar({
      titulo: 'Excluir cliente',
      mensagem: `Excluir ${c.nome}? Esta ação não pode ser desfeita.`,
      acao: 'Excluir',
      tom: 'danger',
    })
    if (!ok) return
    try {
      await excluir.mutateAsync(c.id)
      navigate('/clientes', { replace: true })
    } catch {
      // o erro aparece no ErrorBox abaixo
    }
  }

  return (
    <>
      <PageHeader eyebrow="Cliente" title={c.nome} subtitle={c.telefone || 'Sem telefone'} />
      <div className="mb-6 grid grid-cols-2 gap-px border border-line bg-line">
        <div className="bg-surface-raised p-4">
          <div className="text-xs leading-4 text-ink-muted">Saldo devedor</div>
          <div className="tabular mt-1 text-[22px] font-medium leading-7">{brl(devido)}</div>
        </div>
        <div className="bg-surface-raised p-4">
          <div className="text-xs leading-4 text-ink-muted">Em atraso</div>
          <div className={clsx('tabular mt-1 text-[22px] font-medium leading-7', atrasado > 0 && 'text-danger')}>{brl(atrasado)}</div>
        </div>
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3">
        {link && (
          <a href={link} target="_blank" rel="noreferrer" className={clsx(buttonClass({ variant: 'secondary' }), 'col-span-2')}>
            <MessageCircle size={18} strokeWidth={1.5} aria-hidden="true" />
            {atrasado > 0 ? 'Cobrar no WhatsApp' : 'Abrir WhatsApp'}
          </a>
        )}
        <Button variant="secondary" onClick={() => setEditando(true)}>
          Editar
        </Button>
        <Button variant="danger" onClick={remover} disabled={excluir.isPending}>
          Excluir
        </Button>
      </div>
      <div className="mb-6">
        <ErrorBox error={excluir.error} />
      </div>
      {(c.cpf || c.endereco || c.observacao) && (
        <Card className="mb-6 grid gap-3 sm:grid-cols-2">
          {c.cpf && <Info label="CPF">{c.cpf}</Info>}
          {c.endereco && <Info label="Endereço">{c.endereco}</Info>}
          {c.observacao && <Info label="Observação">{c.observacao}</Info>}
        </Card>
      )}
      <div className="mb-3 flex items-center justify-between">
        <p className="eyebrow">Vendas</p>
        <Link to={`/vendas/nova?cliente=${c.id}`} className={buttonClass({ variant: 'ghost', size: 'sm' })}>
          Nova venda
        </Link>
      </div>
      {doCliente.length === 0 ? (
        <Empty>Nenhuma venda para este cliente.</Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {doCliente.map((v) => (
            <VendaCard key={v.id} venda={v} onPagar={() => setPagando(v)} />
          ))}
        </div>
      )}
      {editando && <ClienteForm cliente={c} onClose={() => setEditando(false)} />}
      {pagando && <PagarModal venda={pagando} onClose={() => setPagando(null)} />}
      {dialogo}
    </>
  )
}
