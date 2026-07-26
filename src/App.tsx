import { BrowserRouter, Navigate, Outlet, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Layout } from './components/layout/Layout'
import { ChatbotWidget } from './components/ChatbotWidget'
import HomePage from './pages/HomePage'
import WorldPage from './pages/WorldPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { PacientesPage } from './pages/PacientesPage'
import { MedicosPage } from './pages/MedicosPage'
import { EstabelecimentosPage } from './pages/EstabelecimentosPage'
import { ServicosPage } from './pages/ServicosPage'
import { AgendamentosPage } from './pages/AgendamentosPage'
import { FuncionariosPage } from './pages/FuncionariosPage'
import { IaPage } from './pages/IaPage'
import { CrmPage } from './pages/CrmPage'
import { EsqueciSenhaPage } from './pages/EsqueciSenhaPage'
import { ResetarSenhaPage } from './pages/ResetarSenhaPage'
import { useAuth } from './hooks/useAuth'

function PrivateRoute() {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <ChatbotWidget />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/world" element={<WorldPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registrar" element={<RegisterPage />} />
        <Route path="/esqueci-senha" element={<EsqueciSenhaPage />} />
        <Route path="/resetar-senha" element={<ResetarSenhaPage />} />
        <Route element={<PrivateRoute />}>
          <Route element={<Layout />}>
            <Route path="/pacientes" element={<PacientesPage />} />
            <Route path="/medicos" element={<MedicosPage />} />
            <Route path="/estabelecimentos" element={<EstabelecimentosPage />} />
            <Route path="/servicos" element={<ServicosPage />} />
            <Route path="/agendamentos" element={<AgendamentosPage />} />
            <Route path="/funcionarios" element={<FuncionariosPage />} />
            <Route path="/ia" element={<IaPage />} />
            <Route path="/crm" element={<CrmPage />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
