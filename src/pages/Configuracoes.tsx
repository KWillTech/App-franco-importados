import clsx from 'clsx'
import { LogOut, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/auth'
import { Avatar, Button, PageHeader, Secao } from '@/components/ui'
import { useTema, type Tema } from '@/lib/config'
import { supabase } from '@/lib/supabase'

const TEMAS: [Tema, string, LucideIcon][] = [
  ['sistema', 'Igual ao celular', Monitor],
  ['claro', 'Claro', Sun],
  ['escuro', 'Escuro', Moon],
]

export default function Configuracoes() {
  const [tema, setTema] = useTema()
  const { session } = useAuth()
  return (
    <>
      <PageHeader title="Configurações" subtitle="Preferências deste aparelho e da sua conta." />
      <div className="flex flex-col gap-5">
        <Secao passo="01" titulo="Aparência" descricao="Tema das telas neste aparelho.">
          <div role="group" aria-label="Tema" className="grid grid-cols-3 gap-3">
            {TEMAS.map(([valor, rotulo, Icone]) => {
              const ativo = tema === valor
              return (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setTema(valor)}
                  className={clsx(
                    'flex min-h-24 flex-col items-center justify-center gap-2 rounded-field border px-2 py-3 text-center text-[13px] font-semibold leading-4 transition-colors',
                    ativo ? 'border-brand bg-brand text-on-brand shadow-elevada' : 'border-line-strong bg-surface-field text-ink hover:border-ink-subtle',
                  )}
                >
                  <Icone size={20} strokeWidth={1.7} aria-hidden="true" className={ativo ? 'text-gold dark:text-on-brand' : 'text-ink-subtle'} />
                  {rotulo}
                </button>
              )
            })}
          </div>
        </Secao>
        <Secao passo="02" titulo="Conta" descricao="Usuário conectado neste aparelho.">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3 rounded-field bg-surface-sunken p-3">
              <Avatar nome={session?.user.email ?? 'A'} />
              <div className="min-w-0">
                <div className="eyebrow">Administrador</div>
                <div className="truncate text-sm">{session?.user.email}</div>
              </div>
            </div>
            <Button variant="danger" onClick={() => supabase.auth.signOut()}>
              <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
              Sair
            </Button>
          </div>
        </Secao>
      </div>
    </>
  )
}
