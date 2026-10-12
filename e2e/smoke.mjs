// Verificação visual: roda o app de produção (vite preview) contra um Supabase falso.
// Uso: npm run build, depois npx vite preview --port 4173 em segundo plano, depois npm run smoke
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const BASE = process.env.BASE_URL ?? 'http://localhost:4173'
const OUT = 'e2e/screenshots'
mkdirSync(OUT, { recursive: true })

// Espera o vite preview responder (até 30 s).
for (let i = 0; ; i++) {
  try {
    await fetch(BASE)
    break
  } catch {
    if (i >= 60) throw new Error(`O servidor não respondeu em ${BASE}`)
    await new Promise((r) => setTimeout(r, 500))
  }
}

const dia = (offset) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().slice(0, 10)
}

const user = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'admin@francoimportados.com',
  aud: 'authenticated',
  role: 'authenticated',
  app_metadata: { provider: 'email' },
  user_metadata: {},
  created_at: '2026-01-01T00:00:00Z',
}
const clientes = [
  { id: 'c1', nome: 'Cláudia Campo Bello', telefone: '(19) 98287-2749', cpf: null, endereco: 'Rua das Flores, 10', observacao: 'Cliente desde 2025', created_at: '2026-01-01T00:00:00Z' },
  { id: 'c2', nome: 'Andrew Tablet', telefone: null, cpf: null, endereco: null, observacao: null, created_at: '2026-01-01T00:00:00Z' },
]
const p = (id, venda_id, numero, vencimento, valor, valor_pago = 0, data_pagamento = null) => ({ id, venda_id, numero, vencimento, valor, valor_pago, data_pagamento })
const vendas = [
  {
    id: 'v1', cliente_id: 'c1', cliente: clientes[0], produto: 'iPhone 16 branco', data_venda: dia(-40), forma_pagamento: 'boleto',
    capital_proprio: 4310, valor_venda: 5750, entrada: 1550, num_parcelas: 3, primeiro_vencimento: dia(-10), observacao: null, created_at: '2026-01-01T00:00:00Z',
    parcelas: [p('p1', 'v1', 1, dia(-10), 1400, 0), p('p2', 'v1', 2, dia(0), 1400), p('p3', 'v1', 3, dia(20), 1400)],
  },
  {
    id: 'v2', cliente_id: 'c2', cliente: clientes[1], produto: 'Monja', data_venda: dia(-5), forma_pagamento: 'cartao_credito',
    capital_proprio: 420, valor_venda: 1400, entrada: 280, num_parcelas: 4, primeiro_vencimento: dia(3), observacao: null, created_at: '2026-01-01T00:00:00Z',
    parcelas: [p('p4', 'v2', 1, dia(-2), 280, 280, dia(-2)), p('p5', 'v2', 2, dia(3), 280), p('p6', 'v2', 3, dia(33), 280), p('p7', 'v2', 4, dia(63), 280)],
  },
]

async function fakeSupabase(page) {
  await page.route('**/auth/v1/token**', (r) =>
    r.fulfill({ json: { access_token: 'fake', token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'r', user } }),
  )
  await page.route('**/auth/v1/user**', (r) => r.fulfill({ json: user }))
  await page.route('**/auth/v1/logout**', (r) => r.fulfill({ status: 204 }))
  await page.route('**/rest/v1/clientes**', (r) => r.fulfill({ json: r.request().method() === 'GET' ? clientes : clientes[0] }))
  await page.route('**/rest/v1/vendas**', (r) => r.fulfill({ json: r.request().method() === 'GET' ? vendas : [] }))
  await page.route('**/rest/v1/parcelas**', (r) => r.fulfill({ status: 204 }))
  await page.route('**/rest/v1/rpc/salvar_venda', (r) => r.fulfill({ json: 'v1' }))
}

const telas = [
  ['dashboard', '/', 'Painel'],
  ['clientes', '/clientes', 'Cláudia Campo Bello'],
  ['cliente', '/clientes/c1', 'Saldo devedor'],
  ['vendas', '/vendas', 'Atrasada'],
  ['venda', '/vendas/v1', '1ª parcela'],
  ['venda-nova', '/vendas/nova', 'Registrar venda'],
  ['venda-editar', '/vendas/v1/editar', 'Salvar venda'],
  ['parcelas', '/parcelas', 'Parcelas'],
  ['agenda', '/agenda', 'Vencem hoje'],
  ['pesquisa', '/pesquisa?q=claudia', 'Cláudia Campo Bello'],
  ['relatorios', '/relatorios', 'Maiores saldos devedores'],
  ['configuracoes', '/configuracoes', 'Aparência'],
]

const falhas = []
const browser = await chromium.launch()
for (const tema of ['light', 'dark']) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    colorScheme: tema,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
  })
  const page = await context.newPage()
  page.on('pageerror', (e) => falhas.push(`[${tema}] erro de JS: ${e.message}`))
  await fakeSupabase(page)

  await page.goto(`${BASE}/login`)
  await page.screenshot({ path: `${OUT}/${tema}-login.png` })
  await page.getByLabel('E-mail').fill(user.email)
  await page.getByLabel('Senha').fill('senha-de-teste')
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForURL(`${BASE}/`)

  for (const [nome, rota, texto] of telas) {
    await page.goto(`${BASE}${rota}`)
    try {
      // Só conta texto visível: o menu lateral fechado também tem "Parcelas", "Vendas"... (escondido).
      await page.getByText(texto, { exact: false }).filter({ visible: true }).first().waitFor({ timeout: 5000 })
    } catch {
      falhas.push(`[${tema}] ${rota}: texto "${texto}" não apareceu`)
    }
    // Nada pode ficar cortado em 390px: nem a página nem tabelas com rolagem lateral escondida.
    const cortado = await page.evaluate(() => {
      if (document.documentElement.scrollWidth > window.innerWidth) return 'a página rola para o lado'
      const t = [...document.querySelectorAll('table')].find((el) => el.parentElement && el.scrollWidth > el.parentElement.clientWidth)
      return t ? 'uma tabela passa da largura' : null
    })
    if (cortado) falhas.push(`[${tema}] ${rota}: ${cortado}`)
    await page.screenshot({ path: `${OUT}/${tema}-${nome}.png`, fullPage: true })
  }

  await page.goto(`${BASE}/vendas/v1`)
  await page.getByRole('button', { name: 'Registrar pagamento' }).click()
  await page.getByRole('dialog').waitFor()
  await page.screenshot({ path: `${OUT}/${tema}-pagar.png` })
  await page.getByLabel('Valor pago').fill('0')
  await page.getByRole('button', { name: 'Confirmar pagamento' }).click()
  if (!(await page.getByText('Informe um valor maior que zero.').isVisible())) falhas.push(`[${tema}] pagamento zero não foi recusado`)
  await page.getByLabel('Valor pago').fill('100')
  await page.getByLabel('Data do pagamento').fill(dia(30))
  await page.getByRole('button', { name: 'Confirmar pagamento' }).click()
  if (!(await page.getByText('A data do pagamento não pode ser futura.').isVisible())) falhas.push(`[${tema}] pagamento com data futura não foi recusado`)
  await page.keyboard.press('Escape')

  // Exclusão pede confirmação dentro do app; "Cancelar" fecha e devolve o foco ao botão.
  const excluir = page.getByRole('button', { name: 'Excluir' })
  await excluir.click()
  const confirmacao = page.getByRole('dialog', { name: 'Excluir venda' })
  await confirmacao.waitFor()
  if (!(await confirmacao.getByText('não pode ser desfeita').isVisible())) falhas.push(`[${tema}] confirmação de exclusão sem aviso`)
  if (!(await confirmacao.getByRole('button', { name: 'Cancelar' }).evaluate((b) => b === document.activeElement)))
    falhas.push(`[${tema}] foco não começou em "Cancelar" na confirmação`)
  await page.screenshot({ path: `${OUT}/${tema}-confirmar.png` })
  await confirmacao.getByRole('button', { name: 'Cancelar' }).click()
  await confirmacao.waitFor({ state: 'detached' })
  if (!(await excluir.evaluate((b) => b === document.activeElement))) falhas.push(`[${tema}] foco não voltou para "Excluir"`)

  // Venda sem data é recusada antes de chamar o banco; o botão de novo cliente tem alvo de 44px.
  await page.goto(`${BASE}/vendas/nova`)
  const novoCliente = await page.getByRole('button', { name: 'Cadastrar novo cliente' }).boundingBox()
  if (!novoCliente || novoCliente.width < 44 || novoCliente.height < 44) falhas.push(`[${tema}] botão de novo cliente menor que 44px`)
  const iconeMais = await page.getByRole('button', { name: 'Cadastrar novo cliente' }).locator('svg').boundingBox()
  if (!iconeMais || iconeMais.width < 16) falhas.push(`[${tema}] ícone do botão de novo cliente sumiu`)
  await page.getByLabel('Data da venda').fill('')
  await page.getByRole('button', { name: 'Salvar venda' }).click()
  if (!(await page.getByText('Informe a data da venda.').first().isVisible())) falhas.push(`[${tema}] venda sem data não foi recusada`)

  await page.goto(`${BASE}/`)
  const abrirMenu = page.getByRole('button', { name: 'Abrir menu' })
  await abrirMenu.click()
  await page.getByRole('dialog', { name: 'Menu' }).waitFor()
  await page.waitForFunction(() => document.getAnimations().length === 0)
  await page.screenshot({ path: `${OUT}/${tema}-menu.png` })
  await page.keyboard.press('Escape')
  if (!(await abrirMenu.evaluate((b) => b === document.activeElement))) falhas.push(`[${tema}] foco não voltou para "Abrir menu"`)
  await context.close()
}
await browser.close()

if (falhas.length) {
  console.error(falhas.join('\n'))
  process.exit(1)
}
console.log(`OK — capturas em ${OUT}/`)
