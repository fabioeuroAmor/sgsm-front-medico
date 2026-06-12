import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { Layout } from './components/layout/Layout'
import { ChatbotWidget } from './components/ChatbotWidget'
import HomePage from './pages/HomePage'
import { PacientesPage } from './pages/PacientesPage'
import { MedicosPage } from './pages/MedicosPage'
import { EstabelecimentosPage } from './pages/EstabelecimentosPage'
import { ServicosPage } from './pages/ServicosPage'
import { AgendamentosPage } from './pages/AgendamentosPage'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" richColors />
      <ChatbotWidget />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route element={<Layout />}>
          <Route path="/pacientes" element={<PacientesPage />} />
          <Route path="/medicos" element={<MedicosPage />} />
          <Route path="/estabelecimentos" element={<EstabelecimentosPage />} />
          <Route path="/servicos" element={<ServicosPage />} />
          <Route path="/agendamentos" element={<AgendamentosPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
