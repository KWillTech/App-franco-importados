import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth'
import { Layout } from './components/Layout'
import Agenda from './pages/Agenda'
import ClienteDetalhe from './pages/ClienteDetalhe'
import Clientes from './pages/Clientes'
import Configuracoes from './pages/Configuracoes'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Parcelas from './pages/Parcelas'
import Pesquisa from './pages/Pesquisa'
import Relatorios from './pages/Relatorios'
import Vendas from './pages/Vendas'
import VendaDetalhe from './pages/VendaDetalhe'
import VendaForm from './pages/VendaForm'

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
