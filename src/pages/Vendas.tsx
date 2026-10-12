import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PagarModal } from '@/components/PagarModal'
import { VendaCard } from '@/components/VendaCard'
import { Chips, Empty, ErrorBox, Loading, PageHeader, SearchInput, buttonClass } from '@/components/ui'
import { useVendas } from '@/lib/api'
import { statusVenda, type StatusVenda, type VendaCompleta } from '@/lib/domain'
import { combina } from '@/lib/format'

type Filtro = 'todas' | StatusVenda

export default function Vendas() {
  const vendas = useVendas()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [pagando, setPagando] = useState<VendaCompleta | null>(null)
  const lista = (vendas.data ?? []).filter(
    (v) => combina(busca, v.cliente.nome, v.produto) && (filtro === 'todas' || statusVenda(v.parcelas) === filtro),
  )

  return (
    <>
      <PageHeader
        title="Vendas"
        action={
          <Link to="/vendas/nova" className={buttonClass({ size: 'sm' })}>
            <Plus size={16} strokeWidth={1.5} aria-hidden="true" />
            Nova venda
          </Link>
        }
      />
      <div className="mb-4 flex flex-col gap-3">
        <SearchInput placeholder="Cliente ou produto" aria-label="Buscar vendas" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <Chips
          label="Filtrar por situação"
          value={filtro}
          onChange={setFiltro}
          options={[
            ['todas', 'Todas'],
            ['atrasada', 'Atrasadas'],
            ['em_dia', 'Em dia'],
            ['quitada', 'Quitadas'],
          ]}
        />
      </div>
      <ErrorBox error={vendas.error} />
      {vendas.isLoading ? (
        <Loading />
      ) : lista.length === 0 ? (
        <Empty>{busca || filtro !== 'todas' ? 'Nenhuma venda encontrada.' : 'Nenhuma venda ainda. Toque em Nova venda.'}</Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {lista.map((v) => (
            <VendaCard key={v.id} venda={v} onPagar={() => setPagando(v)} />
          ))}
        </div>
      )}
      {pagando && <PagarModal venda={pagando} onClose={() => setPagando(null)} />}
    </>
  )
}
