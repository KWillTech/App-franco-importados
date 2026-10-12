import { useMemo, useState } from 'react'
import { PagarModal } from '@/components/PagarModal'
import { ParcelaItem } from '@/components/ParcelaItem'
import { Empty, ErrorBox, Loading, PageHeader } from '@/components/ui'
import { useVendas } from '@/lib/api'
import { agruparAgenda, hoje, restante, round2, type ItemAgenda } from '@/lib/domain'
import { brl, dataExtenso } from '@/lib/format'

export default function Agenda() {
  const vendas = useVendas()
  const [pagando, setPagando] = useState<ItemAgenda | null>(null)
  const agenda = useMemo(() => agruparAgenda(vendas.data ?? []), [vendas.data])
  const grupos: [string, ItemAgenda[]][] = [
    ['Atrasadas', agenda.atrasadas],
    ['Vencem hoje', agenda.hoje],
    ['Próximos 7 dias', agenda.semana],
    ['Restante do mês', agenda.mes],
  ]
  const comItens = grupos.filter(([, itens]) => itens.length > 0)

  return (
    <>
      <PageHeader title="Agenda de cobranças" subtitle={dataExtenso(hoje())} />
      <ErrorBox error={vendas.error} />
      {vendas.isLoading ? (
        <Loading />
      ) : comItens.length === 0 ? (
        <Empty>Nenhuma cobrança pendente para este mês.</Empty>
      ) : (
        comItens.map(([titulo, itens]) => (
          <section key={titulo} className="mb-8">
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="eyebrow">
                {titulo} · {itens.length}
              </h2>
              <span className="tabular text-sm text-ink-muted">{brl(round2(itens.reduce((s, i) => s + restante(i.parcela), 0)))}</span>
            </div>
            <ul className="divide-y divide-line border border-line bg-surface-raised">
              {itens.map((i) => (
                <ParcelaItem key={i.parcela.id} {...i} onPagar={() => setPagando(i)} />
              ))}
            </ul>
          </section>
        ))
      )}
      {pagando && <PagarModal venda={pagando.venda} parcela={pagando.parcela} onClose={() => setPagando(null)} />}
    </>
  )
}
