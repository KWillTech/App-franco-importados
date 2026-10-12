import { ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ClienteForm } from '@/components/ClienteForm'
import { Button, Empty, ErrorBox, Loading, PageHeader, SearchInput, StatusBadge } from '@/components/ui'
import { useClientes, useVendas } from '@/lib/api'
import { clientesComAtraso, saldoPorCliente } from '@/lib/domain'
import { brl, combina } from '@/lib/format'

export default function Clientes() {
  const clientes = useClientes()
  const vendas = useVendas()
  const navigate = useNavigate()
  const [busca, setBusca] = useState('')
  const [novo, setNovo] = useState(false)
  const atrasados = useMemo(() => clientesComAtraso(vendas.data ?? []), [vendas.data])
  const saldos = useMemo(() => saldoPorCliente(vendas.data ?? []), [vendas.data])
  const lista = (clientes.data ?? []).filter((c) => combina(busca, c.nome, c.telefone, c.cpf))

  return (
    <>
      <PageHeader
        title="Clientes"
        subtitle={`${clientes.data?.length ?? 0} cadastrados`}
        action={
          <Button size="sm" onClick={() => setNovo(true)}>
            <Plus size={16} strokeWidth={1.5} />
            Novo
          </Button>
        }
      />
      <div className="mb-4">
        <SearchInput placeholder="Nome, telefone ou CPF" aria-label="Buscar clientes" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      <ErrorBox error={clientes.error ?? vendas.error} />
      {clientes.isLoading ? (
        <Loading />
      ) : lista.length === 0 ? (
        <Empty>{busca ? 'Nenhum cliente encontrado.' : 'Nenhum cliente ainda. Toque em Novo para cadastrar.'}</Empty>
      ) : (
        <ul className="divide-y divide-line border border-line bg-surface-raised">
          {lista.map((c) => {
            const saldo = saldos.get(c.id) ?? 0
            return (
              <li key={c.id}>
                <Link to={`/clientes/${c.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-surface">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{c.nome}</div>
                    <div className="tabular truncate text-sm text-ink-muted">{c.telefone || 'Sem telefone'}{saldo > 0 && ` · ${brl(saldo)} em aberto`}</div>
                  </div>
                  {atrasados.has(c.id) && <StatusBadge status="atrasada" />}
                  <ChevronRight size={18} strokeWidth={1.5} className="shrink-0 text-ink-subtle" aria-hidden="true" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {novo && <ClienteForm onClose={() => setNovo(false)} onSaved={(c) => navigate(`/clientes/${c.id}`)} />}
    </>
  )
}
