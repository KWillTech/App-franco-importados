import { useAuth } from '@/auth'
import { Button, Card, Field, PageHeader, Select } from '@/components/ui'
import { useTema, type Tema } from '@/lib/config'
import { supabase } from '@/lib/supabase'

export default function Configuracoes() {
  const [tema, setTema] = useTema()
  const { session } = useAuth()
  return (
    <>
      <PageHeader title="Configurações" />
      <div className="flex flex-col gap-6">
        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Aparência</h2>
          <Field label="Tema">
            <Select value={tema} onChange={(e) => setTema(e.target.value as Tema)}>
              <option value="sistema">Igual ao celular</option>
              <option value="claro">Claro</option>
              <option value="escuro">Escuro</option>
            </Select>
          </Field>
        </Card>
        <Card className="flex flex-col gap-4">
          <h2 className="text-lg font-medium">Conta</h2>
          <p className="text-sm text-ink-muted">Conectado como {session?.user.email}</p>
          <Button variant="secondary" onClick={() => supabase.auth.signOut()}>
            Sair
          </Button>
        </Card>
      </div>
    </>
  )
}
