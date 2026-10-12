# App Franco Importados — Gestão de Clientes e Contas a Receber

**Data:** 2026-10-12
**Status:** Design aprovado (brainstorming)
**Referência:** vídeo do app "IDEAL TECH" (feito no Lovable)

## 1. Objetivo

App de celular para um único administrador controlar clientes, vendas parceladas
(boleto, cartão de crédito, Pix, dinheiro) e contas a receber: o que vence, o que
está atrasado, o que já foi pago e o lucro de cada venda.

## 2. Decisões tomadas

| Tema | Decisão |
|---|---|
| Plataforma | PWA (instalável na tela inicial do iPhone/Android, também abre no computador) |
| Cobranças | Apenas registro/controle — o app **não** emite boleto nem cobra cartão. Integração com gateway fica para o futuro. |
| Usuários | Um único administrador (login com e-mail e senha) |
| Dados iniciais | Começar do zero (sem importação de planilha) |
| Arquitetura | React + Vite + TypeScript (PWA) + Supabase (Postgres, Auth, Row Level Security) |

### Stack

- **Front-end:** React 18, Vite, TypeScript, Tailwind CSS, shadcn/ui, React Router,
  TanStack Query, React Hook Form + Zod, `vite-plugin-pwa`, date-fns (pt-BR).
- **Back-end:** Supabase — Postgres, autenticação, RLS (só o usuário logado lê/escreve).
- **Hospedagem:** Vercel ou Netlify (plano gratuito).
- **Testes:** Vitest (regras de negócio: geração de parcelas, status, totais).

## 3. Modelo de dados

### `clientes`
| Campo | Tipo | Obs. |
|---|---|---|
| id | uuid | PK |
| nome | text | obrigatório |
| telefone | text | opcional (WhatsApp) |
| cpf | text | opcional |
| endereco | text | opcional |
| observacao | text | opcional (ex.: "indicado por André") |
| created_at | timestamptz | |

### `vendas`
| Campo | Tipo | Obs. |
|---|---|---|
| id | uuid | PK |
| cliente_id | uuid | FK → clientes |
| produto | text | ex.: "iPhone 16 branco" |
| data_venda | date | |
| forma_pagamento | enum | `boleto`, `cartao_credito`, `pix`, `dinheiro` |
| capital_proprio | numeric(12,2) | custo do produto |
| valor_venda | numeric(12,2) | |
| entrada | numeric(12,2) | default 0 |
| num_parcelas | int | ≥ 0 |
| primeiro_vencimento | date | demais vencimentos mensais a partir desta data |
| observacao | text | opcional |

Campos **calculados** (view ou no front):
- `lucro = valor_venda − capital_proprio`
- `valor_parcela = (valor_venda − entrada) / num_parcelas` (diferença de centavos vai na última parcela)
- `parcelas_restantes = count(parcelas não pagas)`
- `status`: **Quitada** (todas pagas) · **Atrasada** (alguma parcela vencida e não paga) · **Em dia** (demais casos)

### `parcelas`
| Campo | Tipo | Obs. |
|---|---|---|
| id | uuid | PK |
| venda_id | uuid | FK → vendas (cascade delete) |
| numero | int | 1..n |
| vencimento | date | |
| valor | numeric(12,2) | |
| valor_pago | numeric(12,2) | default 0 (permite pagamento parcial) |
| data_pagamento | date | null enquanto não quitada |

Status da parcela (calculado): **Paga** (`valor_pago ≥ valor`) · **Atrasada**
(não paga e `vencimento < hoje`) · **Aberta**.

### Regras
- Ao criar a venda, as parcelas são geradas automaticamente.
- Ao editar valor/nº de parcelas de uma venda, apenas parcelas **não pagas** são regeneradas;
  se já houver pagamentos, o app avisa antes.
- Excluir venda exige confirmação e remove as parcelas.
- Excluir cliente só é permitido se não houver vendas (ou com confirmação explícita).

## 4. Telas

Navegação por menu lateral (como no vídeo), com cabeçalho contendo logo, sino de
notificações (contador de parcelas vencidas/vencendo hoje) e configurações.

1. **Login** — e-mail e senha.
2. **Dashboard** — filtro de período (Hoje, Esta semana, Este mês, Mês passado, Este ano,
   Personalizado). Cartões: total de vendas, valor total vendido, valor total recebido
   (entradas + parcelas pagas), valor total das parcelas, valor recebido de parcelas,
   valor em aberto, valor em atraso, lucro do período.
3. **Clientes** — busca por nome/telefone, lista com destaque vermelho para clientes com
   parcela atrasada. Detalhe do cliente: dados, vendas, total devido, botão WhatsApp.
4. **Vendas** — botão "Nova Venda", busca por cliente, cartões com: cliente, produto,
   data, forma, capital próprio, venda, lucro (verde), entrada, parcelas (ex.: 4x de
   R$ 280,00), restantes e etiqueta de status. Ações: Detalhes, Editar, Pagar, Excluir.
5. **Nova/Editar Venda** — escolher ou cadastrar cliente na hora, prévia das parcelas
   geradas antes de salvar.
6. **Detalhes da Venda** — lista de parcelas com status, baixa individual, desfazer baixa.
7. **Pagar** — dá baixa na próxima parcela em aberto; permite alterar valor (parcial)
   e data do pagamento.
8. **Parcelas** — todas as parcelas com filtros (Abertas, Atrasadas, Pagas, por período).
9. **Agenda de Cobranças** — agrupada em: Atrasadas, Vencem hoje, Próximos 7 dias,
   Este mês. Cada item com botão para ligar/abrir WhatsApp.
10. **Pesquisa** — busca global (cliente, produto, telefone).
11. **Relatórios** — recebimentos por mês, lucro por mês, ranking de devedores,
    exportar CSV.
12. **Configurações** — nome/logo da loja, sair.

## 5. Visual

- Paleta inspirada na referência: branco/cinza claro, vermelho como cor principal
  (botões e destaques), verde para lucro, amarelo para valores de parcelas.
- Mobile-first, cartões arredondados, fonte Inter.
- Valores formatados em `R$ 1.234,56`, datas em `dd/mm/aaaa`.

## 6. Fora do escopo (versões futuras)
- Emissão de boleto/Pix e baixa automática via gateway (Asaas, Mercado Pago, Efí).
- Lembretes automáticos por WhatsApp.
- Múltiplos usuários/vendedores e acesso do cliente final.
- Importação de planilha.
- Publicação nas lojas (App Store / Google Play).

## 7. Plano de implementação (alto nível)
1. Setup do projeto (Vite, Tailwind, shadcn/ui, PWA, Supabase client).
2. Migrações SQL do Supabase (tabelas, RLS, views de status).
3. Regras de negócio puras + testes (geração de parcelas, status, totais).
4. Login e layout (menu lateral, cabeçalho).
5. Clientes → Vendas (CRUD + parcelas) → Pagar.
6. Parcelas, Agenda de Cobranças, Pesquisa.
7. Dashboard e Relatórios.
8. Notificações (contador), ícones PWA, deploy.
