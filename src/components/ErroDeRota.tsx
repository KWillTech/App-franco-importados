import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Alert, Button } from './ui'

const CHAVE = 'franco:recarregou-chunk'

const ehFalhaDeChunk = (e: unknown) =>
  /dynamically imported module|Importing a module script failed|Loading chunk|Failed to fetch/i.test(
    e instanceof Error ? `${e.name} ${e.message}` : String(e),
  )

/**
 * Após um novo deploy, uma aba antiga pede um chunk que não existe mais. Recarrega a página
 * uma única vez; se falhar de novo (ou for outro erro), mostra a mensagem com botão "Recarregar".
 */
export class ErroDeRota extends Component<{ children: ReactNode }, { erro: unknown }> {
  state = { erro: null as unknown }

  static getDerivedStateFromError(erro: unknown) {
    return { erro: erro ?? new Error('erro') }
  }

  componentDidCatch(erro: unknown, info: ErrorInfo) {
    console.error(erro, info.componentStack)
    if (!ehFalhaDeChunk(erro)) return
    try {
      if (sessionStorage.getItem(CHAVE)) return
      sessionStorage.setItem(CHAVE, '1')
      window.location.reload()
    } catch {
      /* sem sessionStorage: cai na mensagem com o botão */
    }
  }

  render() {
    if (!this.state.erro) return this.props.children
    return (
      <div className="flex flex-col gap-4">
        <Alert title="Não foi possível abrir esta tela.">
          <span>Verifique sua conexão e tente novamente.</span>
        </Alert>
        <Button
          full
          onClick={() => {
            try {
              sessionStorage.removeItem(CHAVE)
            } catch {
              /* ignora */
            }
            window.location.reload()
          }}
        >
          Recarregar
        </Button>
      </div>
    )
  }
}
