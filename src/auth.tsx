import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Loading } from './components/ui'
import { supabase } from './lib/supabase'

const Ctx = createContext<{ session: Session | null; carregando: boolean }>({ session: null, carregando: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCarregando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      setSession(s)
      // Não deixa dados de uma sessão aparecerem na próxima.
      if (evento === 'SIGNED_OUT') qc.clear()
    })
    return () => data.subscription.unsubscribe()
  }, [qc])
  return <Ctx.Provider value={{ session, carregando }}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, carregando } = useAuth()
  if (carregando) return <Loading />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}
