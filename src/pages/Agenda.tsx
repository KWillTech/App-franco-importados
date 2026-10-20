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
      <PageHeader eyebrow="Contas a receber" title="Agenda de cobranças" subtitle={dataExtenso(hoje())} />
      <ErrorBox error={vendas.error} />
      {vendas.isLoading ? (
        <Loading />
      ) : comItens.length === 0 ? (
        <Empty>Nenhuma cobrança pendente para este mês.</Empty>
      ) : (
        comItens.map(([titulo, itens]) => (
          <section key={titulo} className="mb-8">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-base font-bold">
                {titulo}
                <span className="tabular rounded-pill bg-surface-sunken px-2.5 py-0.5 text-xs font-bold text-ink-muted">{itens.length}</span>
              </h2>
              <span className="tabular text-sm font-semibold text-ink-muted">{brl(round2(itens.reduce((s, i) => s + restante(i.parcela), 0)))}</span>
            </div>
            <ul className="lista">
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
