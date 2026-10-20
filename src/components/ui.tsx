// Componentes base no padrão premium do painel do site Franco Importados:
// azul-marinho + dourado, cartões arredondados com sombra suave, botões em pílula e passos numerados.
import clsx from 'clsx'
import { Search, X, type LucideIcon } from 'lucide-react'
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

type Variante = 'primary' | 'secondary' | 'ghost' | 'danger' | 'gold'

const variantes: Record<Variante, string> = {
  primary: 'bg-brand text-on-brand border-transparent shadow-elevada hover:bg-brand-hover',
  secondary: 'bg-surface-raised text-ink border-line-strong hover:border-ink',
  ghost: 'bg-transparent text-ink border-transparent hover:bg-surface-sunken',
  danger: 'bg-surface-raised text-danger border-line-strong hover:border-danger hover:bg-danger-bg',
  gold: 'bg-gold text-[rgb(14_23_51)] border-transparent hover:brightness-105',
}

/** Classes de botão; use em <Link>/<a> que precisam parecer botão. */
type Tamanho = 'sm' | 'md' | 'icon'

export function buttonClass({ variant = 'primary', size = 'md', full }: { variant?: Variante; size?: Tamanho; full?: boolean } = {}) {
  return clsx(
    'label inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-pill border transition-[color,background-color,border-color,filter] duration-150',
    'disabled:cursor-not-allowed disabled:border-line disabled:bg-surface-sunken disabled:text-ink-subtle disabled:shadow-none',
    size === 'sm' ? 'h-11 px-4 text-[11px]' : size === 'icon' ? 'h-control w-[50px] shrink-0' : 'h-control px-6',
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

/** Filtros em abas de pílula sobre um trilho cinza (como as abas do painel do site). */
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
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={teclas}
      className="flex max-w-full gap-1 overflow-x-auto rounded-pill bg-surface-sunken p-[5px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map(([v, rotulo]) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          tabIndex={value === v ? 0 : -1}
          onClick={() => onChange(v)}
          className={clsx(
            'h-10 flex-1 shrink-0 whitespace-nowrap rounded-pill px-4 text-[13px] font-semibold transition-colors duration-150',
            value === v ? 'bg-brand text-on-brand shadow-elevada' : 'text-ink-muted hover:bg-surface-raised hover:text-ink',
          )}
        >
          {rotulo}
        </button>
      ))}
    </div>
  )
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('rounded-card border border-line bg-surface-raised p-5 shadow-card', className)}>{children}</div>
}

/** Selo quadrado azul-marinho com texto/ícone dourado (número do passo, posição, ícone de indicador). */
export function Selo({ children, size = 'md', className }: { children: ReactNode; size?: 'sm' | 'md'; className?: string }) {
  return (
    <span
      className={clsx(
        'grid shrink-0 place-items-center bg-[rgb(14_23_51)] font-bold tracking-[0.06em] text-gold dark:bg-surface-sunken',
        size === 'sm' ? 'h-9 w-9 rounded-[10px] text-xs' : 'h-10 w-10 rounded-field text-[13px]',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Cartão com cabeçalho numerado ("01", "02"…), título e descrição, no padrão das Configurações do site. */
export function Secao({
  passo,
  titulo,
  descricao,
  acao,
  children,
  className,
}: {
  passo?: string
  titulo: string
  descricao?: string
  acao?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={clsx('rounded-card border border-line bg-surface-raised p-5 shadow-card sm:p-7', className)}>
      <div className="mb-5 flex items-start gap-4 border-b border-line-soft pb-5">
        {passo && <Selo>{passo}</Selo>}
        <div className="min-w-0 flex-1">
          <h2 className="mt-0.5 text-lg font-bold leading-6">{titulo}</h2>
          {descricao && <p className="mt-1 text-sm leading-5 text-ink-muted">{descricao}</p>}
        </div>
        {acao}
      </div>
      {children}
    </section>
  )
}

/** Indicador: ícone em selo, rótulo e valor em destaque. Vira link com `to` (use com <Link>). */
export function Indicador({
  icon: Icone,
  label,
  valor,
  tom,
}: {
  icon: LucideIcon
  label: string
  valor: string
  tom?: 'success' | 'danger'
}) {
  return (
    <>
      <Selo size="sm" className="mb-3">
        <Icone size={17} strokeWidth={1.8} aria-hidden="true" />
      </Selo>
      <div className="text-xs font-medium leading-4 text-ink-muted">{label}</div>
      <div className={clsx('tabular mt-1 break-words text-xl font-bold leading-7', tom === 'success' && 'text-success', tom === 'danger' && 'text-danger')}>
        {valor}
      </div>
    </>
  )
}

/** Classe do cartão de indicador (div ou link). */
export const indicadorClass = (link?: boolean) =>
  clsx(
    'block rounded-card border border-line bg-surface-raised p-4 shadow-card transition-shadow duration-150',
    link && 'hover:shadow-card-hover',
  )

/** Iniciais do nome num círculo azul-marinho com letras douradas. */
export function Avatar({ nome, size = 'md', claro, className }: { nome: string; size?: 'sm' | 'md' | 'lg'; claro?: boolean; className?: string }) {
  const iniciais = nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'grid shrink-0 place-items-center rounded-pill font-bold tracking-[0.04em] text-gold',
        { sm: 'h-9 w-9 text-xs', md: 'h-10 w-10 text-[13px]', lg: 'h-14 w-14 text-base' }[size],
        claro ? 'bg-white/10' : 'bg-[rgb(14_23_51)] dark:bg-surface-sunken',
        className,
      )}
    >
      {iniciais || '?'}
    </span>
  )
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
      <span className="text-[13px] font-semibold leading-4 tracking-[0.02em]">{label}</span>
      {controle}
      {mensagem && (
        <span id={msgId} role={error ? 'alert' : undefined} className={clsx('text-[12.5px] leading-4', error ? 'font-medium text-danger' : 'text-ink-subtle')}>
          {mensagem}
        </span>
      )}
    </label>
  )
}

const campo = clsx(
  'h-control w-full rounded-field border border-line-strong bg-surface-field px-4 text-base text-ink outline-none transition-[border-color,box-shadow,background-color] duration-150',
  'placeholder:text-ink-subtle/70 hover:border-ink-subtle focus:border-brand focus:bg-surface-raised focus:shadow-[0_0_0_4px_rgb(var(--brand)/0.1)]',
  'aria-[invalid=true]:border-danger aria-[invalid=true]:shadow-[0_0_0_4px_rgb(var(--danger)/0.08)]',
  'disabled:bg-surface-sunken disabled:text-ink-subtle',
)

/** Campo de texto; com `icon`, o ícone fica à esquerda e fica dourado quando o campo recebe o foco. */
export function Input({ className, icon: Icone, ...props }: InputHTMLAttributes<HTMLInputElement> & { icon?: LucideIcon }) {
  if (!Icone) return <input className={clsx(campo, className)} {...props} />
  return (
    <span className="group relative block">
      <Icone
        size={19}
        strokeWidth={1.7}
        aria-hidden="true"
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle transition-colors group-focus-within:text-gold"
      />
      <input className={clsx(campo, 'pl-11', className)} {...props} />
    </span>
  )
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={clsx(campo, 'pr-8', className)} {...props} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={clsx(campo, 'h-24 py-3 leading-6')} {...props} />
}

const estilosStatus: Record<StatusVenda | StatusParcela, string> = {
  em_dia: 'bg-surface-sunken text-ink-muted',
  aberta: 'bg-surface-sunken text-ink-muted',
  atrasada: 'bg-danger-bg text-danger',
  quitada: 'bg-success-bg text-success',
  paga: 'bg-success-bg text-success',
}

/** Selo de status: a cor é só reforço, o texto sempre diz o estado. */
export function StatusBadge({ status }: { status: StatusVenda | StatusParcela }) {
  return (
    <span className={clsx('inline-flex shrink-0 items-center rounded-pill px-2.5 py-1 text-[10.5px] font-bold uppercase leading-[14px] tracking-[0.06em]', estilosStatus[status])}>
      {ROTULO_STATUS[status]}
    </span>
  )
}

export function Info({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-medium leading-4 text-ink-subtle">{label}</div>
      <div className={clsx('tabular text-sm leading-5 text-ink', className)}>{children}</div>
    </div>
  )
}

export function PageHeader({
  title,
  eyebrow,
  subtitle,
  action,
  className = 'mb-6',
}: {
  title: string
  eyebrow?: string
  subtitle?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={clsx('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="break-words text-[28px] font-bold leading-9 tracking-[-0.01em]">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] leading-6 text-ink-muted">{subtitle}</p>}
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgb(14_23_51/0.5)] backdrop-blur-[3px] sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={caixa}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        tabIndex={-1}
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-t-sheet bg-surface-raised p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-lg outline-none sm:rounded-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between gap-3 border-b border-line-soft pb-4">
          <h2 id={tituloId} className="text-xl font-bold leading-7">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill bg-surface-sunken text-ink transition-colors hover:bg-line"
            aria-label="Fechar"
          >
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
  return (
    <div className="rounded-card border-[1.5px] border-dashed border-speckle bg-surface-field px-5 py-10 text-center text-sm leading-5 text-ink-muted">
      {children}
    </div>
  )
}

export function Loading() {
  return (
    <div className="flex justify-center p-10" role="status" aria-label="Carregando">
      <div className="h-8 w-8 animate-spin rounded-pill border-[3px] border-line border-t-gold" />
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
    <div className={clsx('flex gap-3 rounded-field px-4 py-3', tons[tone])} role={tone === 'danger' ? 'alert' : 'status'}>
      <div className="flex flex-col gap-0.5 text-sm leading-5">
        <span className="font-semibold">{title}</span>
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
  return <Input icon={Search} className="!rounded-pill" type="search" {...props} />
}
