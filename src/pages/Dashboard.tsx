import clsx from 'clsx'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorBox, Field, Loading, PageHeader, Select } from '@/components/ui'
import { useVendas } from '@/lib/api'
import { resumo } from '@/lib/domain'
import { brl } from '@/lib/format'
import { PERIODOS, periodo, type ChavePeriodo } from '@/lib/periodo'

function Kpi({ label, valor, tom, to }: { label: string; valor: string; tom?: 'success' | 'danger'; to?: string }) {
  const corpo = (
    <>
      <div className="text-xs leading-4 text-ink-muted">{label}</div>
      <div className={clsx('tabular mt-1 text-[22px] font-medium leading-7', tom === 'success' && 'text-success', tom === 'danger' && 'text-danger')}>{valor}</div>
    </>
  )
  const cls = 'block bg-surface-raised p-4'
  return to ? (
    <Link to={to} className={clsx(cls, 'hover:bg-surface')}>
      {corpo}
    </Link>
  ) : (
    <div className={cls}>{corpo}</div>
  )
}

export default function Dashboard() {
  const [chave, setChave] = useState<ChavePeriodo>('mes')
  const { data, isLoading, error } = useVendas()
  const r = useMemo(() => resumo(data ?? [], periodo(chave)), [data, chave])

  return (
    <>
      <PageHeader eyebrow="Atacado e varejo" title="Painel" subtitle="Visão geral das vendas e recebimentos." />
      <div className="mb-6">
        <Field label="Período">
          <Select value={chave} onChange={(e) => setChave(e.target.value as ChavePeriodo)}>
            {Object.entries(PERIODOS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <ErrorBox error={error} />
      {isLoading ? (
        <Loading />
      ) : (
        <>
          <p className="eyebrow mb-3">Vendas no período</p>
          <div className="mb-8 grid grid-cols-2 gap-px border border-line bg-line">
            <Kpi label="Total de vendas" valor={String(r.totalVendas)} to="/vendas" />
            <Kpi label="Valor vendido" valor={brl(r.valorVendido)} />
            <Kpi label="Valor recebido" valor={brl(r.valorRecebido)} />
            <Kpi label="Lucro" valor={brl(r.lucro)} tom={r.lucro < 0 ? 'danger' : 'success'} />
          </div>
          <p className="eyebrow mb-3">Parcelas</p>
          <div className="grid grid-cols-2 gap-px border border-line bg-line">
            <Kpi label="Vencem no período" valor={brl(r.parcelasNoPeriodo)} to="/parcelas" />
            <Kpi label="Recebido de parcelas" valor={brl(r.recebidoParcelas)} />
            <Kpi label="Total em aberto" valor={brl(r.emAberto)} to="/parcelas" />
            <Kpi label="Total em atraso" valor={brl(r.emAtraso)} tom={r.emAtraso > 0 ? 'danger' : undefined} to="/agenda" />
          </div>
          <p className="mt-4 text-xs leading-4 text-ink-subtle">"Em aberto" e "em atraso" consideram todas as vendas, independentemente do período.</p>
        </>
      )}
    </>
  )
}
