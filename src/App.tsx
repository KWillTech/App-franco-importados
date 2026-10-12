import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth'
import { Layout } from './components/Layout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'

// Login e Painel vêm no pacote principal; as demais telas carregam sob demanda (Suspense no Layout).
const Agenda = lazy(() => import('./pages/Agenda'))
const ClienteDetalhe = lazy(() => import('./pages/ClienteDetalhe'))
const Clientes = lazy(() => import('./pages/Clientes'))
const Configuracoes = lazy(() => import('./pages/Configuracoes'))
const Parcelas = lazy(() => import('./pages/Parcelas'))
const Pesquisa = lazy(() => import('./pages/Pesquisa'))
const Relatorios = lazy(() => import('./pages/Relatorios'))
const Vendas = lazy(() => import('./pages/Vendas'))
const VendaDetalhe = lazy(() => import('./pages/VendaDetalhe'))
const VendaForm = lazy(() => import('./pages/VendaForm'))

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="vendas" element={<Vendas />} />
        <Route path="vendas/nova" element={<VendaForm />} />
        <Route path="vendas/:id/editar" element={<VendaForm />} />
        <Route path="vendas/:id" element={<VendaDetalhe />} />
        <Route path="clientes/:id" element={<ClienteDetalhe />} />
        <Route path="parcelas" element={<Parcelas />} />
        <Route path="agenda" element={<Agenda />} />
        <Route path="pesquisa" element={<Pesquisa />} />
        <Route path="relatorios" element={<Relatorios />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
