import clsx from 'clsx'
import { addMonths, format } from 'date-fns'
import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ClienteForm } from '@/components/ClienteForm'
import { Alert, Button, Empty, ErrorBox, Field, Info, Input, Loading, PageHeader, Select, Textarea } from '@/components/ui'
import { useClientes, useSalvarVenda, useVendas } from '@/lib/api'
import {
  FORMAS,
  hoje,
  recalcularParcelas,
  validarVenda,
  type Cliente,
  type FormaPagamento,
  type NovaParcela,
  type VendaCompleta,
} from '@/lib/domain'
import { brl, dataBR, parseValor, valorInput } from '@/lib/format'

export default function VendaForm() {
  const { id } = useParams()
  const [params] = useSearchParams()
  const vendas = useVendas()
  const clientes = useClientes()
  if (vendas.isLoading || clientes.isLoading) return <Loading />
  const erro = vendas.error ?? clientes.error
  if (erro) return <ErrorBox error={erro} />
  const venda = id ? vendas.data?.find((v) => v.id === id) : undefined
  if (id && !venda) return <Empty>Venda não encontrada.</Empty>
  return <Formulario key={id ?? 'nova'} venda={venda} clientes={clientes.data ?? []} clienteInicial={params.get('cliente') ?? ''} />
}

function Formulario({ venda, clientes, clienteInicial }: { venda?: VendaCompleta; clientes: Cliente[]; clienteInicial: string }) {
  const navigate = useNavigate()
  const salvar = useSalvarVenda()
  const [clienteId, setClienteId] = useState(venda?.cliente_id ?? clienteInicial)
  const [produto, setProduto] = useState(venda?.produto ?? '')
  const [dataVenda, setDataVenda] = useState(venda?.data_venda ?? hoje())
  const [forma, setForma] = useState<FormaPagamento>(venda?.forma_pagamento ?? 'boleto')
  const [capital, setCapital] = useState(valorInput(venda?.capital_proprio))
  const [valorVenda, setValorVenda] = useState(valorInput(venda?.valor_venda))
  const [entrada, setEntrada] = useState(valorInput(venda?.entrada))
  const [numParcelas, setNumParcelas] = useState(String(venda?.num_parcelas ?? 1))
  const [primeiroVencimento, setPrimeiroVencimento] = useState(
    venda?.primeiro_vencimento ?? format(addMonths(new Date(), 1), 'yyyy-MM-dd'),
  )
  const [observacao, setObservacao] = useState(venda?.observacao ?? '')
  const [novoCliente, setNovoCliente] = useState(false)
  const [tentou, setTentou] = useState(false)

  const dados = {
    clienteId,
    produto,
    valorVenda: parseValor(valorVenda),
    entrada: parseValor(entrada),
    capitalProprio: parseValor(capital),
    numParcelas: numParcelas.trim() === '' ? 0 : Number(numParcelas),
    primeiroVencimento,
  }
  const invalido = validarVenda(dados)
  let novas: NovaParcela[] = []
  let erroParcelas: string | null = null
  if (!invalido) {
    try {
      novas = recalcularParcelas(dados, venda?.parcelas ?? [])
    } catch (e) {
      erroParcelas = (e as Error).message
    }
  }
  const mantidas = (venda?.parcelas ?? []).filter((p) => p.valor_pago > 0)
  const previa = [
    ...mantidas.map((p) => ({ numero: p.numero, vencimento: p.vencimento, valor: p.valor, comPagamento: true })),
    ...novas.map((p) => ({ ...p, comPagamento: false })),
  ].sort((a, b) => a.numero - b.numero)
  const problema = invalido ?? erroParcelas
  const lucro = dados.valorVenda - dados.capitalProprio

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setTentou(true)
    if (problema) return
    if (mantidas.length > 0 && !confirm(`${mantidas.length} parcela(s) com pagamento serão mantidas e as demais recalculadas. Continuar?`)) return
    try {
      const vendaId = await salvar.mutateAsync({
        venda: {
          id: venda?.id,
          cliente_id: clienteId,
          produto: produto.trim(),
          data_venda: dataVenda,
          forma_pagamento: forma,
          capital_proprio: dados.capitalProprio,
          valor_venda: dados.valorVenda,
          entrada: dados.entrada,
          num_parcelas: dados.numParcelas,
          primeiro_vencimento: dados.numParcelas > 0 ? primeiroVencimento : null,
          observacao: observacao.trim() || null,
        },
        parcelas: novas,
      })
      navigate(`/vendas/${vendaId}`, { replace: true })
    } catch {
      // o erro aparece no ErrorBox abaixo
    }
  }

  return (
    <>
      <PageHeader eyebrow={venda ? 'Editar venda' : 'Nova venda'} title={venda ? venda.produto : 'Registrar venda'} />
      <form onSubmit={enviar} className="flex flex-col gap-6" noValidate>
        <section className="flex flex-col gap-4">
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <Field label="Cliente">
                <Select value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  <option value="">Escolha o cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button type="button" variant="secondary" className="px-3" onClick={() => setNovoCliente(true)} aria-label="Cadastrar novo cliente">
              <Plus size={18} strokeWidth={1.5} aria-hidden="true" />
            </Button>
          </div>
          <Field label="Produto">
            <Input value={produto} onChange={(e) => setProduto(e.target.value)} placeholder="Ex.: iPhone 16 branco" autoComplete="off" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Data da venda">
              <Input type="date" value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} />
            </Field>
            <Field label="Forma de pagamento">
              <Select value={forma} onChange={(e) => setForma(e.target.value as FormaPagamento)}>
                {Object.entries(FORMAS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-4">
          <Field label="Valor da venda">
            <Input inputMode="decimal" value={valorVenda} onChange={(e) => setValorVenda(e.target.value)} placeholder="0,00" autoComplete="off" />
          </Field>
          <Field label="Capital próprio" hint="Quanto o produto custou">
            <Input inputMode="decimal" value={capital} onChange={(e) => setCapital(e.target.value)} placeholder="0,00" autoComplete="off" />
          </Field>
          <Field label="Entrada">
            <Input inputMode="decimal" value={entrada} onChange={(e) => setEntrada(e.target.value)} placeholder="0,00" autoComplete="off" />
          </Field>
          <Field label="Nº de parcelas" hint="0 = à vista">
            <Input type="number" inputMode="numeric" min={0} max={120} value={numParcelas} onChange={(e) => setNumParcelas(e.target.value)} />
          </Field>
          {dados.numParcelas > 0 && (
            <Field label="1º vencimento">
              <Input type="date" value={primeiroVencimento} onChange={(e) => setPrimeiroVencimento(e.target.value)} />
            </Field>
          )}
          <div className="flex items-end pb-3">
            <Info label="Lucro" className={clsx('font-medium', lucro >= 0 ? 'text-success' : 'text-danger')}>
              {brl(lucro)}
            </Info>
          </div>
        </section>

        <Field label="Observação">
          <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </Field>

        {previa.length > 0 && (
          <section>
            <p className="eyebrow mb-3">Parcelas</p>
            <ul className="tabular divide-y divide-line border border-line bg-surface-raised text-sm">
              {previa.map((p) => (
                <li key={p.numero} className="flex justify-between gap-3 px-4 py-2">
                  <span>
                    {p.numero}ª · {dataBR(p.vencimento)}
                  </span>
                  <span>
                    {brl(p.valor)}
                    {p.comPagamento && ' · com pagamento'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {tentou && problema && <Alert title="Confira os dados">{problema}</Alert>}
        <ErrorBox error={salvar.error} />
        <div className="flex gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button className="flex-1" disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando…' : 'Salvar venda'}
          </Button>
        </div>
      </form>
      {novoCliente && <ClienteForm onClose={() => setNovoCliente(false)} onSaved={(c) => setClienteId(c.id)} />}
    </>
  )
}
