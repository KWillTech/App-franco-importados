import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth'
import { Logo } from '@/components/Logo'
import { Button, ErrorBox, Field, Input } from '@/components/ui'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const { session } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setEnviando(true)
    setErro(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message)
    setEnviando(false)
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-bg px-4 py-12">
      <form onSubmit={entrar} className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-4 border-b border-line pb-8">
          <Logo className="h-24" />
          <p className="eyebrow">Gestão de clientes e recebimentos</p>
        </div>
        <Field label="E-mail">
          <Input type="email" name="email" autoComplete="email" inputMode="email" spellCheck={false} autoCapitalize="none" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Senha">
          <Input type="password" name="password" autoComplete="current-password" required value={senha} onChange={(e) => setSenha(e.target.value)} />
        </Field>
        <ErrorBox error={erro} />
        <Button full disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </Button>
      </form>
    </div>
  )
}
