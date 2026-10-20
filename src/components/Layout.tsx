import clsx from 'clsx'
import { Bell, CalendarClock, ChevronRight, FileBarChart, LayoutGrid, LogOut, Menu, Plus, Receipt, Search, Settings, ShoppingBag, Users, X } from 'lucide-react'
import { Suspense, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth'
import { useVendas } from '@/lib/api'
import { hoje, statusParcela } from '@/lib/domain'
import { supabase } from '@/lib/supabase'
import { ErroDeRota } from './ErroDeRota'
import { Logo } from './Logo'
import { Avatar, Loading, buttonClass, usePrenderFoco } from './ui'

const itens = [
  { to: '/', label: 'Painel', icon: LayoutGrid },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/vendas', label: 'Vendas', icon: ShoppingBag },
  { to: '/parcelas', label: 'Parcelas', icon: Receipt },
  { to: '/agenda', label: 'Agenda de cobranças', icon: CalendarClock },
  { to: '/pesquisa', label: 'Pesquisa', icon: Search },
  { to: '/relatorios', label: 'Relatórios', icon: FileBarChart },
]

/** Parcelas atrasadas ou vencendo hoje. */
export function useAlertas() {
  const { data } = useVendas()
  return useMemo(() => {
    const h = hoje()
    return (data ?? [])
      .flatMap((v) => v.parcelas)
      .filter((p) => {
        const s = statusParcela(p, h)
        return s === 'atrasada' || (s === 'aberta' && p.vencimento === h)
      }).length
  }, [data])
}

const icone = 'flex h-11 w-11 items-center justify-center rounded-pill bg-surface-sunken text-ink transition-colors hover:bg-line'

export function Layout() {
  const [aberto, setAberto] = useState(false)
  const { session } = useAuth()
  const alertas = useAlertas()
  const { pathname } = useLocation()
  const gaveta = useRef<HTMLElement>(null)
  usePrenderFoco(gaveta, aberto, () => setAberto(false))

  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-30 border-b border-line-soft bg-bg/90 pt-[env(safe-area-inset-top)] shadow-sm backdrop-blur-md backdrop-saturate-150">
        <div className="mx-auto grid h-16 max-w-3xl grid-cols-[1fr_auto_1fr] items-center px-3">
          <button onClick={() => setAberto(true)} aria-label="Abrir menu" aria-expanded={aberto} aria-controls="menu-principal" className={icone}>
            <Menu size={20} strokeWidth={1.8} aria-hidden="true" />
          </button>
          <Link to="/" aria-label="Início" className="flex items-center gap-2.5">
            <Logo className="h-10" />
            <span className="hidden rounded-pill bg-[rgb(14_23_51)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gold min-[380px]:inline dark:bg-surface-sunken">
              Gestão
            </span>
          </Link>
          <div className="flex justify-end gap-2">
            <Link to="/agenda" className={clsx(icone, 'relative')} aria-label={`Cobranças pendentes: ${alertas}`}>
              <Bell size={19} strokeWidth={1.7} aria-hidden="true" />
              {alertas > 0 && (
                <span className="tabular absolute -right-1 -top-1 h-[20px] min-w-[20px] rounded-pill bg-gold px-[5px] text-center text-[11px] font-bold leading-[20px] text-[rgb(14_23_51)] ring-2 ring-bg">
                  {alertas > 99 ? '99+' : alertas}
                </span>
              )}
            </Link>
            <Link to="/configuracoes" className={icone} aria-label="Configurações">
              <Settings size={19} strokeWidth={1.7} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </header>

      {aberto && <div className="fixed inset-0 z-40 bg-[rgb(14_23_51/0.5)] backdrop-blur-[3px]" onClick={() => setAberto(false)} aria-hidden="true" />}
      {/* visibility entra na transição: ao fechar, a gaveta desliza e só depois some (sai do Tab). */}
      <aside
        ref={gaveta}
        id="menu-principal"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        tabIndex={-1}
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-[min(86vw,340px)] flex-col overflow-y-auto overscroll-contain rounded-r-sheet bg-surface-raised pt-[env(safe-area-inset-top)] text-ink shadow-lg outline-none transition-[transform,visibility] duration-200 motion-reduce:transition-none',
          aberto ? 'visible translate-x-0' : 'invisible -translate-x-full',
        )}
      >
        <div className="sticky top-0 z-[1] flex items-center justify-between border-b border-line-soft bg-surface-raised/95 py-3.5 pl-5 pr-4">
          <Logo className="h-11" />
          <button onClick={() => setAberto(false)} aria-label="Fechar menu" className={icone}>
            <X size={20} strokeWidth={1.7} aria-hidden="true" />
          </button>
        </div>
        <p className="eyebrow px-[22px] pb-2 pt-[18px]">Menu</p>
        <nav aria-label="Seções" className="flex flex-1 flex-col gap-0.5 px-2.5 pb-4">
          {itens.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setAberto(false)}
              className={({ isActive }) =>
                clsx(
                  'group flex min-h-12 items-center gap-3 rounded-field px-3 text-[15px] font-semibold transition-colors',
                  isActive ? 'bg-brand text-on-brand shadow-elevada' : 'text-ink hover:bg-surface-sunken',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={19} strokeWidth={1.7} aria-hidden="true" className={isActive ? 'text-gold dark:text-on-brand' : 'text-ink-subtle'} />
                  <span className="flex-1">{label}</span>
                  <ChevronRight
                    size={14}
                    strokeWidth={2}
                    aria-hidden="true"
                    className={clsx('h-[26px] w-[26px] rounded-pill p-1.5', isActive ? 'bg-white/10' : 'bg-surface-sunken text-ink-subtle')}
                  />
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-col gap-3 border-t border-line-soft p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <Link to="/vendas/nova" onClick={() => setAberto(false)} className={buttonClass({ full: true })}>
            <Plus size={18} strokeWidth={2} aria-hidden="true" className="text-gold dark:text-on-brand" />
            Nova venda
          </Link>
          <div className="flex items-center gap-3 rounded-field bg-surface-sunken p-3">
            <Avatar nome={session?.user.email ?? 'A'} size="sm" />
            <div className="min-w-0 flex-1">
              <div className="eyebrow">Administrador</div>
              <div className="truncate text-sm">{session?.user.email}</div>
            </div>
            <button
              onClick={() => supabase.auth.signOut()}
              aria-label="Sair"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border border-line-strong bg-surface-raised text-ink transition-colors hover:border-danger hover:text-danger"
            >
              <LogOut size={17} strokeWidth={1.8} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      <main key={pathname} className="mx-auto max-w-3xl px-4 pb-[max(3rem,env(safe-area-inset-bottom))] pt-6">
        <ErroDeRota>
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </ErroDeRota>
      </main>
    </div>
  )
}
