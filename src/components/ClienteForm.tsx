import { useState, type FormEvent } from 'react'
import { useSalvarCliente } from '@/lib/api'
import type { Cliente } from '@/lib/domain'
import { Button, ErrorBox, Field, Input, Modal, Textarea } from './ui'

const vazio = (s: string) => s.trim() || null

export function ClienteForm({ cliente, onClose, onSaved }: { cliente?: Cliente | null; onClose: () => void; onSaved?: (c: Cliente) => void }) {
  const salvar = useSalvarCliente()
  const [nome, setNome] = useState(cliente?.nome ?? '')
  const [telefone, setTelefone] = useState(cliente?.telefone ?? '')
  const [cpf, setCpf] = useState(cliente?.cpf ?? '')
  const [endereco, setEndereco] = useState(cliente?.endereco ?? '')
  const [observacao, setObservacao] = useState(cliente?.observacao ?? '')
  const [erroNome, setErroNome] = useState<string>()

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) return setErroNome('Informe o nome do cliente.')
    try {
      const salvo = await salvar.mutateAsync({
        id: cliente?.id,
        nome: nome.trim(),
        telefone: vazio(telefone),
        cpf: vazio(cpf),
        endereco: vazio(endereco),
        observacao: vazio(observacao),
      })
      onSaved?.(salvo)
      onClose()
    } catch {
      // o erro aparece no ErrorBox abaixo
    }
  }

  return (
    <Modal open onClose={onClose} title={cliente ? 'Editar cliente' : 'Novo cliente'}>
      <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
        <Field label="Nome" error={erroNome}>
          <Input
            value={nome}
            onChange={(e) => {
              setNome(e.target.value)
              setErroNome(undefined)
            }}
            autoComplete="off"
            autoFocus
          />
        </Field>
        <Field label="Telefone / WhatsApp" hint="Com DDD, ex.: (19) 98287-2749">
          <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} inputMode="tel" autoComplete="off" />
        </Field>
        <Field label="CPF">
          <Input value={cpf} onChange={(e) => setCpf(e.target.value)} inputMode="numeric" autoComplete="off" />
        </Field>
        <Field label="Endereço">
          <Input value={endereco} onChange={(e) => setEndereco(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Observação">
          <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </Field>
        <ErrorBox error={salvar.error} />
        <Button full disabled={salvar.isPending}>
          {salvar.isPending ? 'Salvando…' : 'Salvar cliente'}
        </Button>
      </form>
    </Modal>
  )
}
