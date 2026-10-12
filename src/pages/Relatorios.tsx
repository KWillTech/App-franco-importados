import clsx from 'clsx'
import { Download } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Button, Empty, ErrorBox, Loading, PageHeader } from '@/components/ui'
import { useVendas } from '@/lib/api'
import { baixarCsv } from '@/lib/csv'
import { FORMAS, ROTULO_STATUS, hoje, lucro, maioresDevedores, resumoMensal, saldoDevedor, statusParcela, statusVenda } from '@/lib/domain'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { brl, dataBR, mesAno } from '@/lib/format'

// Mês curto ("Out/26") para as quatro colunas caberem num celular de 360–390px.
const mesCurto = (m: string) => {
  const t = format(parseISO(`${m}-01`), 'MMM/yy', { locale: ptBR })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export default function Relatorios() {
  const vendas = useVendas()
  const lista = vendas.data
  const meses = useMemo(() => resumoMensal(lista ?? []), [lista])
  const devedores = useMemo(() => maioresDevedores(lista ?? []), [lista])

  function exportarVendas() {
    baixarCsv(`vendas-${hoje()}.csv`, [
      ['Data', 'Cliente', 'Telefone', 'Produto', 'Forma', 'Capital próprio', 'Valor da venda', 'Lucro', 'Entrada', 'Parcelas', 'Saldo devedor', 'Situação'],
      ...(lista ?? []).map((v) => [
        dataBR(v.data_venda),
        v.cliente.nome,
        v.cliente.telefone,
        v.produto,
        FORMAS[v.forma_pagamento],
        v.capital_proprio,
        v.valor_venda,
        lucro(v),
        v.entrada,
        v.num_parcelas,
        saldoDevedor(v.parcelas),
        ROTULO_STATUS[statusVenda(v.parcelas)],
      ]),
    ])
  }

  function exportarParcelas() {
    baixarCsv(`parcelas-${hoje()}.csv`, [
      ['Cliente', 'Produto', 'Parcela', 'Vencimento', 'Valor', 'Valor pago', 'Data do pagamento', 'Situação'],
      ...(lista ?? []).flatMap((v) =>
        v.parcelas.map((p) => [
          v.cliente.nome,
          v.produto,
          `${p.numero}/${v.num_parcelas}`,
          dataBR(p.vencimento),
          p.valor,
          p.valor_pago,
          p.data_pagamento ? dataBR(p.data_pagamento) : '',
          ROTULO_STATUS[statusParcela(p)],
        ]),
      ),
    ])
  }

  return (
    <>
      <PageHeader title="Relatórios" subtitle="Últimos 12 meses" />
      <ErrorBox error={vendas.error} />
      {vendas.isLoading ? (
        <Loading />
      ) : (
        <div className="flex flex-col gap-8">
          <section>
            <h2 className="eyebrow mb-3">Por mês</h2>
            <div className="overflow-x-auto border border-line bg-surface-raised">
              <table className="tabular w-full text-[13px] leading-5">
                <thead>
                  <tr className="border-b border-line text-left text-xs text-ink-muted">
                    <th scope="col" className="py-3 pl-3 pr-2 font-normal">Mês</th>
                    <th scope="col" className="px-2 py-3 text-right font-normal">Vendido</th>
                    <th scope="col" className="px-2 py-3 text-right font-normal">Recebido</th>
                    <th scope="col" className="py-3 pl-2 pr-3 text-right font-normal">Lucro</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {meses.map((m) => (
                    <tr key={m.mes}>
                      <th scope="row" className="whitespace-nowrap py-3 pl-3 pr-2 text-left font-normal">
                        <abbr title={mesAno(m.mes)} className="no-underline">
                          {mesCurto(m.mes)}
                        </abbr>
                      </th>
                      <td className="whitespace-nowrap px-2 py-3 text-right">{brl(m.vendido)}</td>
                      <td className="whitespace-nowrap px-2 py-3 text-right">{brl(m.recebido)}</td>
                      <td className={clsx('whitespace-nowrap py-3 pl-2 pr-3 text-right', m.lucro < 0 && 'text-danger')}>{brl(m.lucro)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="eyebrow mb-3">Maiores saldos devedores</h2>
            {devedores.length === 0 ? (
              <Empty>Nenhum cliente com saldo em aberto.</Empty>
            ) : (
              <ol className="divide-y divide-line border border-line bg-surface-raised">
                {devedores.map((d) => (
                  <li key={d.cliente.id}>
                    <Link to={`/clientes/${d.cliente.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-surface">
                      <span className="min-w-0 flex-1 truncate font-medium">{d.cliente.nome}</span>
                      <span className="tabular text-right text-sm">
                        <span className="block">{brl(d.saldo)}</span>
                        {d.atrasado > 0 && <span className="block text-danger">{brl(d.atrasado)} em atraso</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section>
            <h2 className="eyebrow mb-3">Exportar planilhas</h2>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="secondary" onClick={exportarVendas} disabled={!lista?.length}>
                <Download size={16} strokeWidth={1.5} aria-hidden="true" />
                Vendas
              </Button>
              <Button variant="secondary" onClick={exportarParcelas} disabled={!lista?.length}>
                <Download size={16} strokeWidth={1.5} aria-hidden="true" />
                Parcelas
              </Button>
            </div>
            <p className="mt-2 text-xs leading-4 text-ink-subtle">Arquivos CSV que abrem no Excel e no Google Planilhas.</p>
          </section>
        </div>
      )}
    </>
  )
}
