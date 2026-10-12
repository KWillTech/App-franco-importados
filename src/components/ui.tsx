// Componentes base no padrão do design system Franco Importados:
// monocromático, cantos retos, rótulos em caixa alta espaçada, fios de 1px em vez de sombras.
import clsx from 'clsx'
import { X } from 'lucide-react'
import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactElement,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { ROTULO_STATUS, type StatusParcela, type StatusVenda } from '@/lib/domain'

type Variante = 'primary' | 'secondary' | 'ghost' | 'danger'

const variantes: Record<Variante, string> = {
  primary: 'bg-brand text-on-brand border-transparent hover:bg-brand-hover',
  secondary: 'bg-transparent text-ink border-ink hover:bg-ink hover:text-ink-inverse',
  ghost: 'bg-transparent text-ink border-transparent underline underline-offset-[6px] decoration-1 hover:text-ink-muted',
  danger: 'bg-transparent text-danger border-danger hover:bg-danger-bg',
}

/** Classes de botão; use em <Link>/<a> que precisam parecer botão. */
type Tamanho = 'sm' | 'md' | 'icon'

export function buttonClass({ variant = 'primary', size = 'md', full }: { variant?: Variante; size?: Tamanho; full?: boolean } = {}) {
  return clsx(
    'label inline-flex items-center justify-center gap-2 whitespace-nowrap border transition-colors duration-150',
    'disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-ink-subtle',
    size === 'sm' ? 'h-11 px-3 text-[11px]' : size === 'icon' ? 'h-control w-12 shrink-0' : 'h-control px-6',
    full && 'w-full',
    variantes[variant],
  )
}

export function Button({
  variant,
  size,
  full,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variante; size?: Tamanho; full?: boolean }) {
  return <button className={clsx(buttonClass({ variant, size, full }), className)} {...props} />
}

/** Filtros em chips (únicos elementos, com o contador, que usam radius-pill). */
export function Chips<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (v: T) => void
  options: [T, string][]
}) {
  // Grupo de rádio: Tab entra no item marcado; setas trocam a opção (padrão WAI-ARIA).
  function teclas(e: ReactKeyboardEvent<HTMLDivElement>) {
    const passo = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!passo) return
    e.preventDefault()
    const i = options.findIndex(([v]) => v === value)
    const proximo = (i + passo + options.length) % options.length
    onChange(options[proximo][0])
    const botoes = e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    botoes[proximo]?.focus()
  }
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={teclas} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
      {options.map(([v, rotulo]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          tabIndex={value === v ? 0 : -1}
          onClick={() => onChange(v)}
          className={clsx(
            'h-11 shrink-0 rounded-pill border px-4 text-sm transition-colors duration-150',
            value === v ? 'border-brand bg-brand text-on-brand' : 'border-line-strong bg-surface-raised text-ink hover:border-ink',
          )}
        >
          {rotulo}
        </button>
      ))}
    </div>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('border border-line bg-surface-raised p-4', className)}>{children}</div>
}

type ControleAria = { 'aria-invalid'?: boolean | 'true' | 'false'; 'aria-describedby'?: string }

/**
 * Rótulo + controle + dica/erro. O controle (filho único) recebe `aria-describedby` apontando para a
 * dica ou o erro e, com erro, `aria-invalid="true"`.
 */
export function Field({ label, children, hint, error }: { label: string; children: ReactNode; hint?: string; error?: string }) {
  const msgId = useId()
  const mensagem = error || hint
  const unico = Children.count(children) === 1 && isValidElement(children) ? (children as ReactElement<ControleAria>) : null
  const controle = unico
    ? cloneElement(unico, {
        'aria-invalid': error ? 'true' : unico.props['aria-invalid'],
        'aria-describedby': clsx(unico.props['aria-describedby'], mensagem && msgId) || undefined,
      })
    : children
  return (
    <label className="flex min-w-0 flex-col gap-2">
      <span className="text-xs font-medium uppercase leading-4 tracking-label">{label}</span>
      {controle}
      {mensagem && (
        <span id={msgId} role={error ? 'alert' : undefined} className={clsx('text-xs leading-4', error ? 'text-danger' : 'text-ink-subtle')}>
          {mensagem}
        </span>
      )}
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

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(campo, 'h-24 py-3')} {...props} />
}

const estilosStatus: Record<StatusVenda | StatusParcela, string> = {
  em_dia: 'bg-surface text-ink border border-line',
  aberta: 'bg-surface text-ink border border-line',
  atrasada: 'bg-danger-bg text-danger',
  quitada: 'bg-success-bg text-success',
  paga: 'bg-success-bg text-success',
}

/** Selo de status: a cor é só reforço, o texto sempre diz o estado. */
export function StatusBadge({ status }: { status: StatusVenda | StatusParcela }) {
  return (
    <span className={clsx('inline-flex shrink-0 rounded-sm px-2 py-1 text-[11px] font-medium uppercase leading-[14px] tracking-label', estilosStatus[status])}>
      {ROTULO_STATUS[status]}
    </span>
  )
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
        <h1 className="mt-1 break-words font-display text-[32px] font-semibold leading-10">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Prende o foco dentro de `ref` enquanto `ativo`: leva o foco para dentro ao abrir (respeitando um
 * `autoFocus` que já esteja lá dentro), mantém Tab/Shift+Tab no contêiner, fecha com Esc e, ao fechar,
 * devolve o foco a quem o tinha antes.
 */
export function usePrenderFoco(ref: { current: HTMLElement | null }, ativo: boolean, onEsc: () => void) {
  const escRef = useRef(onEsc)
  escRef.current = onEsc
  // Guarda quem tinha o foco ainda na renderização: um `autoFocus` lá dentro rouba o foco no commit,
  // antes de qualquer efeito rodar.
  const anteriorRef = useRef<HTMLElement | null>(null)
  const estavaAtivo = useRef(false)
  if (ativo && !estavaAtivo.current) anteriorRef.current = document.activeElement as HTMLElement | null
  estavaAtivo.current = ativo
  useEffect(() => {
    const caixa = ref.current
    if (!ativo || !caixa) return
    const anterior = anteriorRef.current
    if (!caixa.contains(document.activeElement)) (caixa.querySelector<HTMLElement>(FOCAVEIS) ?? caixa).focus()
    function teclas(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        escRef.current()
        return
      }
      if (e.key !== 'Tab' || !caixa) return
      const lista = Array.from(caixa.querySelectorAll<HTMLElement>(FOCAVEIS))
      if (lista.length === 0) return e.preventDefault()
      const primeiro = lista[0]
      const ultimo = lista[lista.length - 1]
      const atual = document.activeElement
      if (e.shiftKey && (atual === primeiro || !caixa.contains(atual))) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && (atual === ultimo || !caixa.contains(atual))) {
        e.preventDefault()
        primeiro.focus()
      }
    }
    document.addEventListener('keydown', teclas)
    return () => {
      document.removeEventListener('keydown', teclas)
      // Só devolve o foco se fechou de verdade (saiu da tela ou `ativo` virou false); no StrictMode o
      // efeito roda duas vezes com o diálogo ainda aberto e o foco deve ficar onde está.
      queueMicrotask(() => {
        if (anterior?.isConnected && (!caixa.isConnected || !estavaAtivo.current)) anterior.focus()
      })
    }
  }, [ativo, ref])
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const caixa = useRef<HTMLDivElement>(null)
  const tituloId = useId()
  usePrenderFoco(caixa, open, onClose)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-contain bg-surface-raised p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-lg outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between border-b border-line pb-4">
          <h2 id={tituloId} className="text-[22px] font-medium leading-[30px]">
            {title}
          </h2>
          <button type="button" onClick={onClose} className="-mr-2 flex h-11 w-11 items-center justify-center text-ink" aria-label="Fechar">
            <X size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export type PedidoConfirmacao = {
  titulo: string
  mensagem: string
  /** Rótulo do botão de ação, no infinitivo (ex.: "Excluir"). */
  acao: string
  tom?: 'primary' | 'danger'
}

/** Confirmação dentro do app (substitui o `confirm()` do navegador). O foco começa em "Cancelar". */
export function ConfirmDialog({ pedido, onResposta }: { pedido: PedidoConfirmacao | null; onResposta: (ok: boolean) => void }) {
  return (
    <Modal open={!!pedido} onClose={() => onResposta(false)} title={pedido?.titulo ?? ''}>
      {pedido && (
        <div className="flex flex-col gap-6">
          <p className="text-base leading-6 text-ink-muted">{pedido.mensagem}</p>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="secondary" onClick={() => onResposta(false)} autoFocus>
              Cancelar
            </Button>
            <Button type="button" variant={pedido.tom ?? 'primary'} onClick={() => onResposta(true)}>
              {pedido.acao}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

/**
 * `const [confirmar, dialogo] = useConfirmacao()`; renderize `dialogo` e use
 * `if (!(await confirmar({ ... }))) return`.
 */
export function useConfirmacao() {
  const [pedido, setPedido] = useState<PedidoConfirmacao | null>(null)
  const resolver = useRef<(ok: boolean) => void>()
  const confirmar = useCallback(
    (p: PedidoConfirmacao) =>
      new Promise<boolean>((resolve) => {
        resolver.current?.(false)
        resolver.current = resolve
        setPedido(p)
      }),
    [],
  )
  const responder = useCallback((ok: boolean) => {
    resolver.current?.(ok)
    resolver.current = undefined
    setPedido(null)
  }, [])
  return [confirmar, <ConfirmDialog pedido={pedido} onResposta={responder} />] as const
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
      <svg
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-subtle"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="square"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
      <Input className="pl-11" type="search" {...props} />
    </div>
  )
}
