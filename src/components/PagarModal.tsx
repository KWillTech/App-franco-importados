import { useState, type FormEvent } from 'react'
import { useAtualizarParcelas } from '@/lib/api'
import { distribuirPagamento, hoje, proximaAberta, restante, saldoDevedor, type Parcela, type VendaCompleta } from '@/lib/domain'
import { brl, parseValor, valorInput } from '@/lib/format'
import { Button, ErrorBox, Field, Info, Input, Modal } from './ui'

export function PagarModal({ venda, parcela, onClose }: { venda: VendaCompleta; parcela?: Parcela; onClose: () => void }) {
  const atualizar = useAtualizarParcelas()
  const alvo = parcela ? [parcela] : venda.parcelas
  const primeira = parcela ?? proximaAberta(venda.parcelas)
  const saldo = parcela ? restante(parcela) : saldoDevedor(venda.parcelas)
  const [valor, setValor] = useState(valorInput(primeira ? restante(primeira) : 0))
  const [dataPagamento, setDataPagamento] = useState(hoje())
  const [erro, setErro] = useState<string>()
  const v = parseValor(valor)
  const { updates, troco } = distribuirPagamento(alvo, v, dataPagamento)

  async function confirmar(e: FormEvent) {
    e.preventDefault()
    if (v <= 0) return setErro('Informe um valor maior que zero.')
    if (troco > 0) return setErro(`O valor passa do saldo de ${brl(saldo)}.`)
    if (!dataPagamento) return setErro('Informe a data do pagamento.')
    try {
      await atualizar.mutateAsync(updates)
      onClose()
    } catch {
      // o erro aparece no ErrorBox abaixo
    }
  }

  if (!primeira || saldo === 0) {
    return (
      <Modal open onClose={onClose} title="Registrar pagamento">
        <p className="text-sm text-ink-muted">Não há valor em aberto nesta {parcela ? 'parcela' : 'venda'}.</p>
      </Modal>
    )
  }

  return (
    <Modal open onClose={onClose} title="Registrar pagamento">
      <form onSubmit={confirmar} className="flex flex-col gap-4" noValidate>
        <p className="text-sm text-ink-muted">
          {venda.cliente.nome} · {venda.produto}
        </p>
        <div className="grid grid-cols-2 gap-px border border-line bg-line">
          <div className="bg-surface-raised p-3">
            <Info label={`Parcela ${primeira.numero}`}>{brl(restante(primeira))}</Info>
          </div>
          <div className="bg-surface-raised p-3">
            <Info label={parcela ? 'Valor da parcela' : 'Saldo da venda'}>{brl(parcela ? parcela.valor : saldo)}</Info>
          </div>
        </div>
        <Field
          label="Valor pago"
          error={erro}
          hint={parcela ? 'Valor menor fica como pagamento parcial.' : 'Valor menor fica como pagamento parcial; maior abate as próximas parcelas.'}
        >
          <Input
            value={valor}
            onChange={(e) => {
              setValor(e.target.value)
              setErro(undefined)
            }}
            inputMode="decimal"
            autoComplete="off"
            autoFocus
          />
        </Field>
        <Field label="Data do pagamento">
          <Input type="date" value={dataPagamento} max={hoje()} onChange={(e) => setDataPagamento(e.target.value)} />
        </Field>
        {v > 0 && troco === 0 && updates.length > 0 && (
          <ul className="tabular flex flex-col gap-1 text-sm text-ink-muted">
            {updates.map((u) => {
              const p = alvo.find((x) => x.id === u.id)!
              return (
                <li key={u.id}>
                  Parcela {p.numero}: {u.valor_pago >= p.valor ? 'quitada' : `${brl(u.valor_pago)} de ${brl(p.valor)}`}
                </li>
              )
            })}
          </ul>
        )}
        <ErrorBox error={atualizar.error} />
        <Button full disabled={atualizar.isPending}>
          {atualizar.isPending ? 'Salvando…' : 'Confirmar pagamento'}
        </Button>
      </form>
    </Modal>
  )
}
