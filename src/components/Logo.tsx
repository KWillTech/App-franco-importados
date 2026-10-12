import clsx from 'clsx'

/**
 * Logotipo oficial (design system Franco Importados). Troca sozinho conforme o tema.
 * `inverse`: para fundos `surface-inverse` (preto no tema claro, claro no escuro) — usa a versão oposta.
 */
export function Logo({ className = 'h-9', inverse = false }: { className?: string; inverse?: boolean }) {
  const preto = <img src="/brand/franco-logo-preto.png" alt="Franco Importados" width={311} height={179} className={clsx('w-auto', inverse ? 'hidden dark:block' : 'dark:hidden', className)} />
  const branco = <img src="/brand/franco-logo-branco.png" alt="Franco Importados" width={311} height={179} className={clsx('w-auto', inverse ? 'dark:hidden' : 'hidden dark:block', className)} />
  return (
    <>
      {preto}
      {branco}
    </>
  )
}
