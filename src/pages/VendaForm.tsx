import clsx from 'clsx'
import { addMonths, format } from 'date-fns'
import { Hash, Package, Plus, Wallet, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ClienteForm } from '@/components/ClienteForm'
import { Alert, Button, Empty, ErrorBox, Field, Input, Loading, PageHeader, Secao, Select, Textarea, useConfirmacao } from '@/components/ui'
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
  const [confirmar, dialogo] = useConfirmacao()
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
  const erroData = dataVenda ? null : 'Informe a data da venda.'
  const problema = erroData ?? invalido ?? erroParcelas
  const lucro = dados.valorVenda - dados.capitalProprio

  async function enviar(e: FormEvent) {
    e.preventDefault()
    setTentou(true)
    if (problema) return
    if (
      mantidas.length > 0 &&
      !(await confirmar({
        titulo: 'Recalcular parcelas',
        mensagem: `${mantidas.length} parcela(s) com pagamento serão mantidas e as demais recalculadas. Continuar?`,
        acao: 'Continuar',
      }))
    )
      return
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
      <PageHeader
        eyebrow={venda ? 'Editar venda' : 'Nova venda'}
        title={venda ? venda.produto : 'Registrar venda'}
        subtitle="As parcelas são calculadas sozinhas a partir dos valores."
      />
      <form onSubmit={enviar} className="flex flex-col gap-5 pb-4" noValidate>
        <Secao passo="01" titulo="Cliente e produto" descricao="Quem comprou, o quê e como vai pagar.">
        <div className="flex flex-col gap-4">
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
            <Button type="button" variant="secondary" size="icon" onClick={() => setNovoCliente(true)} aria-label="Cadastrar novo cliente">
              <Plus size={18} strokeWidth={1.5} aria-hidden="true" />
            </Button>
          </div>
          <Field label="Produto">
            <Input icon={Package} value={produto} onChange={(e) => setProduto(e.target.value)} placeholder="Ex.: iPhone 16 branco" autoComplete="off" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Data da venda" error={tentou && erroData ? erroData : undefined}>
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
        </div>
        </Secao>

        <Secao passo="02" titulo="Valores e parcelas" descricao="Quanto custou, por quanto vendeu e em quantas vezes.">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Valor da venda">
            <Input icon={Wallet} inputMode="decimal" value={valorVenda} onChange={(e) => setValorVenda(e.target.value)} placeholder="0,00" autoComplete="off" />
          </Field>
          <Field label="Capital próprio" hint="Quanto o produto custou">
            <Input inputMode="decimal" value={capital} onChange={(e) => setCapital(e.target.value)} placeholder="0,00" autoComplete="off" />
          </Field>
          <Field label="Entrada">
            <Input inputMode="decimal" value={entrada} onChange={(e) => setEntrada(e.target.value)} placeholder="0,00" autoComplete="off" />
          </Field>
          <Field label="Nº de parcelas" hint="0 = à vista">
            <Input icon={Hash} type="number" inputMode="numeric" min={0} max={120} value={numParcelas} onChange={(e) => setNumParcelas(e.target.value)} />
          </Field>
          {dados.numParcelas > 0 && (
            <Field label="1º vencimento">
              <Input type="date" value={primeiroVencimento} onChange={(e) => setPrimeiroVencimento(e.target.value)} />
            </Field>
          )}
          <div className={clsx('flex flex-col justify-center rounded-field px-4 py-2', dados.numParcelas > 0 ? 'self-end' : 'col-span-2', lucro >= 0 ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger')}>
            <span className="text-xs font-medium">Lucro</span>
            <span className="tabular text-lg font-bold leading-7">{brl(lucro)}</span>
          </div>
        </div>
        {previa.length > 0 && (
          <div className="mt-5 rounded-field bg-[repeating-linear-gradient(45deg,rgb(var(--surface-field)),rgb(var(--surface-field))_10px,rgb(var(--surface-sunken))_10px,rgb(var(--surface-sunken))_20px)] p-4">
            <span className="mb-2.5 block text-[10.5px] font-bold uppercase tracking-eyebrow text-ink-subtle">Prévia das parcelas</span>
            <ul className="lista tabular text-sm">
              {previa.map((p) => (
                <li key={p.numero} className="flex justify-between gap-3 px-4 py-2.5">
                  <span>
                    <span className="font-semibold">{p.numero}ª</span> · {dataBR(p.vencimento)}
                  </span>
                  <span className="font-semibold">
                    {brl(p.valor)}
                    {p.comPagamento && <span className="font-normal text-ink-muted"> · com pagamento</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        </Secao>

        <Secao passo="03" titulo="Observação" descricao="Opcional. Só aparece para você.">
          <Field label="Observação">
            <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} />
          </Field>
        </Secao>

        {tentou && problema && <Alert title="Confira os dados">{problema}</Alert>}
        <ErrorBox error={salvar.error} />
        <div className="sticky bottom-[max(1rem,env(safe-area-inset-bottom))] z-10 flex items-center gap-2 rounded-[18px] bg-[rgb(14_23_51/0.96)] p-2.5 pl-4 text-white shadow-[0_12px_30px_rgb(14_23_51/0.28)] backdrop-blur-sm sm:rounded-pill">
          <span className="min-w-0 flex-1" role="status">
            {tentou && problema ? (
              <span className="text-sm font-medium text-[rgb(255_180_171)]">Confira os dados</span>
            ) : (
              <span className="flex items-center gap-2.5">
                <i className="h-2 w-2 shrink-0 rounded-pill bg-gold shadow-[0_0_0_4px_rgb(216_178_106/0.2)]" />
                <span className="min-w-0 leading-4">
                  <span className="block text-[11px] text-[rgb(207_213_226)]">Lucro</span>
                  <span className="tabular block truncate text-sm font-semibold">{brl(lucro)}</span>
                </span>
              </span>
            )}
          </span>
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Cancelar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-pill text-white transition-colors hover:bg-white/10"
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          <Button variant="gold" size="sm" disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando…' : 'Salvar venda'}
          </Button>
        </div>
      </form>
      {novoCliente && <ClienteForm onClose={() => setNovoCliente(false)} onSaved={(c) => setClienteId(c.id)} />}
      {dialogo}
    </>
  )
}
