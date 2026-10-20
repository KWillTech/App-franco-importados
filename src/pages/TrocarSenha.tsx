import type { AuthError } from '@supabase/supabase-js'
import { KeyRound, Lock, LogOut } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { deveTrocarSenha, useAuth } from '@/auth'
import { Logo } from '@/components/Logo'
import { Button, ErrorBox, Field, Input, Loading } from '@/components/ui'
import { SENHA_MINIMA, validarNovaSenha } from '@/lib/domain'
import { supabase } from '@/lib/supabase'

function mensagem(erro: AuthError) {
  if (erro.code === 'same_password') return 'A senha nova precisa ser diferente da senha que você recebeu.'
  if (erro.code === 'weak_password') return 'Senha fraca demais. Misture letras e números.'
  if (erro.code === 'reauthentication_needed' || erro.code === 'session_expired' || erro.status === 401)
    return 'Sua sessão expirou. Saia e entre de novo com a senha que você recebeu.'
  return erro.message
}

/** Primeiro acesso: quem recebeu a senha do administrador cria a própria antes de usar o app. */
export default function TrocarSenha() {
  const { session, carregando } = useAuth()
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [tentou, setTentou] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (carregando) return <Loading />
  if (!session) return <Navigate to="/login" replace />
  // Depois da troca, a sessão renovada já vem sem a marca e o app abre normalmente.
  if (!deveTrocarSenha(session)) return <Navigate to="/" replace />

  const erros = validarNovaSenha(senha, confirmacao)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setTentou(true)
    setErro(null)
    if (erros.senha || erros.confirmacao) return
    setEnviando(true)
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) {
      setErro(mensagem(error))
      setEnviando(false)
      return
    }
    // Renova a sessão para trazer o app_metadata atualizado (o banco tira a marca ao mudar a senha).
    const r = await supabase.auth.refreshSession()
    if (r.error) setErro('Senha trocada. Saia e entre de novo com a senha nova.')
    else if (deveTrocarSenha(r.data.session)) setErro('Senha trocada, mas o acesso ainda não foi liberado. Fale com o administrador.')
    setEnviando(false)
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-4 py-12">
      <form onSubmit={salvar} noValidate className="flex w-full max-w-sm flex-col gap-5 rounded-sheet border border-line bg-surface-raised p-6 shadow-card sm:p-8">
        <div className="flex flex-col items-center gap-3 border-b border-line-soft pb-6 text-center">
          <Logo className="h-16" />
          <span className="grid h-12 w-12 place-items-center rounded-pill bg-[rgb(14_23_51)] text-gold dark:bg-surface-sunken">
            <KeyRound size={22} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <h1 className="text-[22px] font-bold leading-7">Crie sua senha</h1>
          <p className="text-sm leading-5 text-ink-muted">
            Este é o seu primeiro acesso. Troque a senha que você recebeu por uma só sua para continuar.
          </p>
        </div>
        <Field label="Senha nova" hint={`Pelo menos ${SENHA_MINIMA} caracteres.`} error={tentou ? erros.senha : undefined}>
          <Input
            icon={Lock}
            type="password"
            name="new-password"
            autoComplete="new-password"
            autoFocus
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </Field>
        <Field label="Repita a senha nova" error={tentou ? erros.confirmacao : undefined}>
          <Input
            icon={Lock}
            type="password"
            name="confirm-password"
            autoComplete="new-password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
          />
        </Field>
        <ErrorBox error={erro} />
        <Button full disabled={enviando}>
          {enviando ? 'Salvando…' : 'Salvar senha e entrar'}
        </Button>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="mx-auto flex min-h-11 items-center gap-2 rounded-pill px-4 text-sm font-semibold text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink"
        >
          <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
          Sair
        </button>
        <p className="text-center text-xs leading-4 text-ink-subtle">Conectado como {session.user.email}</p>
      </form>
    </div>
  )
}
