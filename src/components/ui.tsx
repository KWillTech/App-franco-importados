// Componentes base no padrão do design system Franco Importados:
// monocromático, cantos retos, rótulos em caixa alta espaçada, fios de 1px em vez de sombras.
import clsx from 'clsx'
import { X } from 'lucide-react'
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import type { StatusParcela, StatusVenda } from '@/lib/domain'

type Variante = 'primary' | 'secondary' | 'ghost' | 'danger'

const variantes: Record<Variante, string> = {
  primary: 'bg-brand text-on-brand border-transparent hover:bg-brand-hover',
  secondary: 'bg-transparent text-ink border-ink hover:bg-ink hover:text-ink-inverse',
  ghost: 'bg-transparent text-ink border-transparent underline underline-offset-[6px] decoration-1 hover:text-ink-muted px-2',
  danger: 'bg-transparent text-danger border-danger hover:bg-danger-bg',
}

export function Button({
  variant = 'primary',
  size = 'md',
  full,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variante; size?: 'sm' | 'md'; full?: boolean }) {
  return (
    <button
      className={clsx(
        'label inline-flex items-center justify-center gap-2 whitespace-nowrap border transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-ink-subtle',
        size === 'sm' ? 'h-10 px-3 text-[11px]' : 'h-control px-6',
        full && 'w-full',
        variantes[variant],
        className,
      )}
      {...props}
    />
  )
}

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={clsx('border border-line bg-surface-raised p-4', onClick && 'cursor-pointer transition-colors hover:border-line-strong', className)}
    >
      {children}
    </div>
  )
}

export function Field({ label, children, hint, error }: { label: string; children: ReactNode; hint?: string; error?: string }) {
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="text-xs font-medium uppercase leading-4 tracking-label">{label}</span>
      {children}
      {(error || hint) && <span className={clsx('text-xs leading-4', error ? 'text-danger' : 'text-ink-subtle')}>{error || hint}</span>}
    </label>
  )
}

const campo =
  'h-control w-full border border-line-strong bg-surface-raised px-4 text-base text-ink outline-none placeholder:text-ink-subtle hover:border-ink disabled:bg-surface disabled:text-ink-subtle'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={clsx(campo, className)} {...props} />
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx(campo, 'pr-8', className)} {...props} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(campo, 'h-24 py-3')} {...props} />
}

const estilosStatus: Record<StatusVenda | StatusParcela, [string, string]> = {
  em_dia: ['Em dia', 'bg-surface text-ink border border-line'],
  aberta: ['Aberta', 'bg-surface text-ink border border-line'],
  atrasada: ['Atrasada', 'bg-danger-bg text-danger'],
  quitada: ['Quitada', 'bg-success-bg text-success'],
  paga: ['Paga', 'bg-success-bg text-success'],
}

/** Selo de status: a cor é só reforço, o texto sempre diz o estado. */
export function StatusBadge({ status }: { status: StatusVenda | StatusParcela }) {
  const [rotulo, cls] = estilosStatus[status]
  return <span className={clsx('inline-flex rounded-sm px-2 py-1 text-[11px] font-medium uppercase leading-[14px] tracking-label', cls)}>{rotulo}</span>
}

export function Info({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs leading-4 text-ink-subtle">{label}</div>
      <div className={clsx('tabular text-sm leading-5 text-ink', className)}>{children}</div>
    </div>
  )
}

export function PageHeader({ title, eyebrow, subtitle, action }: { title: string; eyebrow?: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 border-b border-line pb-4">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-[32px] font-semibold leading-10">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto bg-surface-raised p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between border-b border-line pb-4">
          <h2 className="text-[22px] font-medium leading-[30px]">{title}</h2>
          <button onClick={onClose} className="-mr-2 flex h-11 w-11 items-center justify-center text-ink" aria-label="Fechar">
            <X size={20} strokeWidth={1.5} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="border border-dashed border-line-strong p-8 text-center text-sm text-ink-muted">{children}</div>
}

export function Loading() {
  return (
    <div className="flex justify-center p-10" role="status" aria-label="Carregando">
      <div className="h-8 w-8 animate-spin rounded-pill border-2 border-ink border-t-transparent" />
    </div>
  )
}

export function Alert({ tone = 'danger', title, children }: { tone?: 'success' | 'warning' | 'danger' | 'info'; title: string; children?: ReactNode }) {
  const tons = {
    success: 'bg-success-bg text-success',
    warning: 'bg-warning-bg text-warning',
    danger: 'bg-danger-bg text-danger',
    info: 'bg-info-bg text-info',
  }
  return (
    <div className={clsx('flex gap-3 border border-current p-4', tons[tone])} role={tone === 'danger' ? 'alert' : 'status'}>
      <div className="flex flex-col gap-0.5 text-sm leading-5 text-ink">
        <span className="font-medium">{title}</span>
        {children}
      </div>
    </div>
  )
}

export function ErrorBox({ error }: { error: unknown }) {
  if (!error) return null
  return <Alert title="Não foi possível concluir">{error instanceof Error ? error.message : String(error)}</Alert>
}

export function SearchInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <svg className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
      <Input className="pl-11" type="search" {...props} />
    </div>
  )
}
