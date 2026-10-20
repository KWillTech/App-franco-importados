import clsx from 'clsx'
import { AlarmClock, BadgeDollarSign, CalendarCheck, HandCoins, Receipt, ShoppingBag, TrendingUp, Wallet, type LucideIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Chips, ErrorBox, Indicador, Loading, PageHeader, indicadorClass } from '@/components/ui'
import { useVendas } from '@/lib/api'
import { resumo } from '@/lib/domain'
import { brl } from '@/lib/format'
import { PERIODOS, periodo, type ChavePeriodo } from '@/lib/periodo'

function Kpi({ icon, label, valor, tom, to }: { icon: LucideIcon; label: string; valor: string; tom?: 'success' | 'danger'; to?: string }) {
  const corpo = <Indicador icon={icon} label={label} valor={valor} tom={tom} />
  return to ? (
    <Link to={to} className={indicadorClass(true)}>
      {corpo}
    </Link>
  ) : (
    <div className={indicadorClass()}>{corpo}</div>
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
        <Chips grade label="Período" value={chave} onChange={setChave} options={Object.entries(PERIODOS) as [ChavePeriodo, string][]} />
      </div>
      <ErrorBox error={error} />
      {isLoading ? (
        <Loading />
      ) : (
        <>
          <p className="eyebrow mb-3">Vendas no período</p>
          <div className="mb-8 rounded-card bg-hero p-5 text-white shadow-elevada sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-white/60">Lucro</p>
                <p className={clsx('tabular mt-1 break-words text-[32px] font-bold leading-10', r.lucro < 0 ? 'text-[rgb(255_180_171)]' : 'text-gold')}>
                  {brl(r.lucro)}
                </p>
              </div>
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-field bg-white/10 text-gold">
                <TrendingUp size={19} strokeWidth={1.8} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-3 border-t border-white/10 pt-4">
              <Link to="/vendas" className="-m-1.5 rounded-field p-1.5 transition-colors hover:bg-white/5">
                <div className="flex items-center gap-1 text-xs text-white/60">
                  <ShoppingBag size={13} strokeWidth={1.8} aria-hidden="true" /> Vendas
                </div>
                <div className="tabular mt-0.5 font-bold">{r.totalVendas}</div>
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-xs text-white/60">
                  <BadgeDollarSign size={13} strokeWidth={1.8} aria-hidden="true" /> Vendido
                </div>
                <div className="tabular mt-0.5 break-words text-sm font-bold leading-6">{brl(r.valorVendido)}</div>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1 text-xs text-white/60">
                  <Wallet size={13} strokeWidth={1.8} aria-hidden="true" /> Recebido
                </div>
                <div className="tabular mt-0.5 break-words text-sm font-bold leading-6">{brl(r.valorRecebido)}</div>
              </div>
            </div>
          </div>
          <p className="eyebrow mb-3">Parcelas</p>
          <div className="grid grid-cols-2 gap-3">
            <Kpi icon={CalendarCheck} label="Vencem no período" valor={brl(r.parcelasNoPeriodo)} to="/parcelas" />
            <Kpi icon={HandCoins} label="Recebido de parcelas" valor={brl(r.recebidoParcelas)} />
            <Kpi icon={Receipt} label="Total em aberto" valor={brl(r.emAberto)} to="/parcelas" />
            <Kpi icon={AlarmClock} label="Total em atraso" valor={brl(r.emAtraso)} tom={r.emAtraso > 0 ? 'danger' : undefined} to="/agenda" />
          </div>
          <p className="mt-4 text-xs leading-4 text-ink-subtle">"Em aberto" e "em atraso" consideram todas as vendas, independentemente do período.</p>
        </>
      )}
    </>
  )
}
