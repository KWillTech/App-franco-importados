import { Lock, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { deveTrocarSenha, useAuth } from '@/auth'
import { Logo } from '@/components/Logo'
import { Button, ErrorBox, Field, Input } from '@/components/ui'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (session) return <Navigate to={deveTrocarSenha(session) ? '/trocar-senha' : '/'} replace />

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
    setEnviando(false)
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-surface px-4 py-12">
      <form onSubmit={entrar} className="flex w-full max-w-sm flex-col gap-5 rounded-sheet border border-line bg-surface-raised p-6 shadow-card sm:p-8">
        <div className="flex flex-col items-center gap-3 border-b border-line-soft pb-6 text-center">
          <Logo className="h-20" />
          <span className="rounded-pill bg-[rgb(14_23_51)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gold dark:bg-surface-sunken">
            Gestão
          </span>
          <h1 className="mt-1 text-[22px] font-bold leading-7">Entrar no app</h1>
          <p className="text-sm text-ink-muted">Clientes, vendas e recebimentos.</p>
        </div>
        <Field label="E-mail">
          <Input icon={Mail} type="email" name="email" autoComplete="email" inputMode="email" spellCheck={false} autoCapitalize="none" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Senha">
          <Input icon={Lock} type="password" name="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </Field>
        <ErrorBox error={erro} />
        <Button full disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </div>
  )
}
