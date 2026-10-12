import clsx from 'clsx'
import { Bell, CalendarClock, FileBarChart, LayoutGrid, LogOut, Menu, Receipt, Search, Settings, ShoppingBag, Users, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/auth'
import { useVendas } from '@/lib/api'
import { hoje, statusParcela } from '@/lib/domain'
import { supabase } from '@/lib/supabase'
import { Logo } from './Logo'

const itens = [
  { to: '/', label: 'Dashboard', icon: LayoutGrid },
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

const icone = 'flex h-11 w-11 items-center justify-center text-ink'

export function Layout() {
  const [aberto, setAberto] = useState(false)
  const { session } = useAuth()
  const alertas = useAlertas()
  const { pathname } = useLocation()

  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-30 border-b border-line bg-bg pt-[env(safe-area-inset-top)] shadow-sm">
        <div className="mx-auto grid h-14 max-w-3xl grid-cols-[1fr_auto_1fr] items-center px-2">
          <button onClick={() => setAberto(true)} aria-label="Abrir menu" className={icone}>
            <Menu size={22} strokeWidth={1.5} />
          </button>
          <Link to="/" aria-label="Início">
            <Logo className="h-9" />
          </Link>
          <div className="flex justify-end">
            <Link to="/agenda" className={clsx(icone, 'relative')} aria-label={`Cobranças pendentes: ${alertas}`}>
              <Bell size={20} strokeWidth={1.5} />
              {alertas > 0 && (
                <span className="tabular absolute right-0.5 top-1 h-[18px] min-w-[18px] rounded-pill bg-brand px-[5px] text-center text-[11px] font-medium leading-[18px] text-on-brand">
                  {alertas > 99 ? '99+' : alertas}
                </span>
              )}
            </Link>
            <Link to="/configuracoes" className={icone} aria-label="Configurações">
              <Settings size={20} strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </header>

      {aberto && <div className="fixed inset-0 z-40 bg-black/60" onClick={() => setAberto(false)} />}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-surface-inverse pt-[env(safe-area-inset-top)] text-ink-inverse shadow-lg transition-transform duration-200',
          aberto ? 'translate-x-0' : '-translate-x-full',
        )}
        aria-hidden={!aberto}
      >
        <div className="flex items-center justify-between px-4 py-4">
          <Logo inverse className="h-12 dark:hidden" />
          <Logo className="hidden h-12 dark:block" />
          <button onClick={() => setAberto(false)} aria-label="Fechar menu" className="flex h-11 w-11 items-center justify-center">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        <nav className="flex-1 border-t border-ink-inverse/20 px-2 pt-2">
          {itens.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setAberto(false)}
              className={({ isActive }) =>
                clsx(
                  'label flex items-center gap-3 px-3 py-3.5',
                  isActive ? 'bg-bg text-ink' : 'opacity-80 hover:opacity-100',
                )
              }
            >
              <Icon size={18} strokeWidth={1.5} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-ink-inverse/20 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <div className="px-3 py-2">
            <div className="eyebrow text-current opacity-70">Administrador</div>
            <div className="truncate text-sm">{session?.user.email}</div>
          </div>
          <button onClick={() => supabase.auth.signOut()} className="label flex w-full items-center gap-3 px-3 py-3 opacity-80 hover:opacity-100">
            <LogOut size={18} strokeWidth={1.5} /> Sair
          </button>
        </div>
      </aside>

      <main key={pathname} className="mx-auto max-w-3xl px-4 pb-[max(3rem,env(safe-area-inset-bottom))] pt-6">
        <Outlet />
      </main>
    </div>
  )
}
