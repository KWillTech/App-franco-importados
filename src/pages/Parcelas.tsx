import { useMemo, useState } from 'react'
import { PagarModal } from '@/components/PagarModal'
import { ParcelaItem } from '@/components/ParcelaItem'
import { Chips, Empty, ErrorBox, Loading, PageHeader } from '@/components/ui'
import { useVendas } from '@/lib/api'
import { restante, round2, statusParcela, type ItemAgenda } from '@/lib/domain'
import { brl } from '@/lib/format'

type Filtro = 'abertas' | 'atrasadas' | 'pagas' | 'todas'

export default function Parcelas() {
  const vendas = useVendas()
  const [filtro, setFiltro] = useState<Filtro>('abertas')
  const [pagando, setPagando] = useState<ItemAgenda | null>(null)

  const itens = useMemo(() => {
    const todos: ItemAgenda[] = (vendas.data ?? []).flatMap((venda) => venda.parcelas.map((parcela) => ({ venda, parcela })))
    const filtrados = todos.filter((i) => {
      const st = statusParcela(i.parcela)
      if (filtro === 'abertas') return st !== 'paga'
      if (filtro === 'atrasadas') return st === 'atrasada'
      if (filtro === 'pagas') return st === 'paga'
      return true
    })
    return filtro === 'pagas'
      ? filtrados.sort((a, b) => (b.parcela.data_pagamento ?? '').localeCompare(a.parcela.data_pagamento ?? ''))
      : filtrados.sort((a, b) => a.parcela.vencimento.localeCompare(b.parcela.vencimento))
  }, [vendas.data, filtro])

  const total = round2(
    itens.reduce((s, i) => s + (filtro === 'pagas' ? i.parcela.valor_pago : filtro === 'todas' ? i.parcela.valor : restante(i.parcela)), 0),
  )

  return (
    <>
      <PageHeader title="Parcelas" subtitle={`${itens.length} ${itens.length === 1 ? 'parcela' : 'parcelas'} · ${brl(total)}`} />
      <div className="mb-4">
        <Chips
          label="Filtrar parcelas"
          value={filtro}
          onChange={setFiltro}
          options={[
            ['abertas', 'Abertas'],
            ['atrasadas', 'Atrasadas'],
            ['pagas', 'Pagas'],
            ['todas', 'Todas'],
          ]}
        />
      </div>
      <ErrorBox error={vendas.error} />
      {vendas.isLoading ? (
        <Loading />
      ) : itens.length === 0 ? (
        <Empty>Nenhuma parcela neste filtro.</Empty>
      ) : (
        <ul className="divide-y divide-line border border-line bg-surface-raised">
          {itens.map((i) => (
            <ParcelaItem key={i.parcela.id} {...i} onPagar={() => setPagando(i)} />
          ))}
        </ul>
      )}
      {pagando && <PagarModal venda={pagando.venda} parcela={pagando.parcela} onClose={() => setPagando(null)} />}
    </>
  )
}
