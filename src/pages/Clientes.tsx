import { ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ClienteForm } from '@/components/ClienteForm'
import { Avatar, Button, Empty, ErrorBox, Loading, PageHeader, SearchInput, StatusBadge } from '@/components/ui'
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
        eyebrow="Cadastro"
        subtitle={`${clientes.data?.length ?? 0} cadastrados`}
        action={
          <Button size="sm" onClick={() => setNovo(true)}>
            <Plus size={16} strokeWidth={2} aria-hidden="true" className="text-gold dark:text-on-brand" />
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
        <ul className="lista">
          {lista.map((c) => {
            const saldo = saldos.get(c.id) ?? 0
            return (
              <li key={c.id}>
                <Link to={`/clientes/${c.id}`} className="flex min-h-[72px] items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-sunken/60">
                  <Avatar nome={c.nome} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{c.nome}</div>
                    <div className="tabular truncate text-sm text-ink-muted">{c.telefone || 'Sem telefone'}{saldo > 0 && ` · ${brl(saldo)} em aberto`}</div>
                  </div>
                  {atrasados.has(c.id) && <StatusBadge status="atrasada" />}
                  <ChevronRight size={14} strokeWidth={2} className="h-[26px] w-[26px] shrink-0 rounded-pill bg-surface-sunken p-1.5 text-ink-subtle" aria-hidden="true" />
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
