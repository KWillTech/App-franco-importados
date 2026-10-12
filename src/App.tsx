import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from './auth'
import { Layout } from './components/Layout'
import Clientes from './pages/Clientes'
import Configuracoes from './pages/Configuracoes'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Vendas from './pages/Vendas'
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
        {/* rotas */}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
