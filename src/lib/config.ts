import { useEffect, useState } from 'react'

export type Tema = 'claro' | 'escuro' | 'sistema'
const CHAVE = 'franco:tema'

function ler(): Tema {
  try {
    return (localStorage.getItem(CHAVE) as Tema) || 'sistema'
  } catch {
    return 'sistema'
  }
}

/** Aplica o tema do design system via data-theme no <html>. */
export function aplicarTema(tema = ler()) {
  const escuro = tema === 'escuro' || (tema === 'sistema' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = escuro ? 'dark' : 'light'
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', escuro ? '#090e1e' : '#ffffff')
}

export function useTema(): [Tema, (t: Tema) => void] {
  const [tema, setTema] = useState(ler)
  useEffect(() => {
    aplicarTema(tema)
    if (tema !== 'sistema') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const ouvir = () => aplicarTema(tema)
    mq.addEventListener('change', ouvir)
    return () => mq.removeEventListener('change', ouvir)
  }, [tema])
  return [
    tema,
    (t) => {
      try {
        localStorage.setItem(CHAVE, t)
      } catch {
        /* armazenamento indisponível */
      }
      setTema(t)
    },
  ]
}
