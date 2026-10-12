import { ChevronRight } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Empty, ErrorBox, Loading, PageHeader, SearchInput, StatusBadge } from '@/components/ui'
import { useClientes, useVendas } from '@/lib/api'
import { statusVenda } from '@/lib/domain'
import { combina, dataBR, normalizar } from '@/lib/format'

const LIMITE = 20

export default function Pesquisa() {
  const [params, setParams] = useSearchParams()
  const busca = params.get('q') ?? ''
  const clientes = useClientes()
  const vendas = useVendas()
  const ativa = normalizar(busca).length >= 2
  const achadosClientes = ativa ? (clientes.data ?? []).filter((c) => combina(busca, c.nome, c.telefone, c.cpf, c.observacao)).slice(0, LIMITE) : []
  const achadosVendas = ativa ? (vendas.data ?? []).filter((v) => combina(busca, v.produto, v.cliente.nome, v.observacao)).slice(0, LIMITE) : []
  const carregando = clientes.isLoading || vendas.isLoading

  return (
    <>
      <PageHeader title="Pesquisa" />
      <div className="mb-6">
        <SearchInput
          autoFocus
          value={busca}
          onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })}
          placeholder="Cliente, telefone, CPF ou produto"
          aria-label="Pesquisar"
        />
      </div>
      <ErrorBox error={clientes.error ?? vendas.error} />
      {!ativa ? (
        <Empty>Digite pelo menos 2 letras.</Empty>
      ) : carregando ? (
        <Loading />
      ) : achadosClientes.length === 0 && achadosVendas.length === 0 ? (
        <Empty>Nada encontrado para "{busca}".</Empty>
      ) : (
        <div className="flex flex-col gap-8">
          {achadosClientes.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3">Clientes</h2>
              <ul className="divide-y divide-line border border-line bg-surface-raised">
                {achadosClientes.map((c) => (
                  <li key={c.id}>
                    <Link to={`/clientes/${c.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-surface">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{c.nome}</div>
                        <div className="truncate text-sm text-ink-muted">{c.telefone || 'Sem telefone'}</div>
                      </div>
                      <ChevronRight size={18} strokeWidth={1.5} className="shrink-0 text-ink-subtle" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {achadosVendas.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3">Vendas</h2>
              <ul className="divide-y divide-line border border-line bg-surface-raised">
                {achadosVendas.map((v) => (
                  <li key={v.id}>
                    <Link to={`/vendas/${v.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-surface">
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{v.produto}</div>
                        <div className="truncate text-sm text-ink-muted">
                          {v.cliente.nome} · {dataBR(v.data_venda)}
                        </div>
                      </div>
                      <StatusBadge status={statusVenda(v.parcelas)} />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  )
}
