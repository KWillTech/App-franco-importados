import clsx from 'clsx'

/**
 * Logotipo oficial (design system Franco Importados).
 * `inverse` força a versão branca (fundos pretos); senão troca sozinha no tema escuro.
 */
export function Logo({ className = 'h-9', inverse = false }: { className?: string; inverse?: boolean }) {
  if (inverse) return <img src="/brand/franco-logo-branco.png" alt="Franco Importados" className={clsx('w-auto', className)} />
  return (
    <>
      <img src="/brand/franco-logo-preto.png" alt="Franco Importados" className={clsx('w-auto dark:hidden', className)} />
      <img src="/brand/franco-logo-branco.png" alt="Franco Importados" className={clsx('hidden w-auto dark:block', className)} />
    </>
  )
}
