import { Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/Header'
import DomainNav from './components/DomainNav'
import BottomNav from './components/BottomNav'
import Footer from './components/Footer'
import Dashboard from './pages/Dashboard'
import ReceiveFlow from './pages/ReceiveFlow'
import ConsumeFlow from './pages/ConsumeFlow'
import FamilyList from './pages/FamilyList'
import FamilyCreate from './pages/FamilyCreate'
import FamilyDetail from './pages/FamilyDetail'
import MovementHistory from './pages/MovementHistory'
import UnderConstruction from './pages/UnderConstruction'
import { isFilamentoDomain } from './lib/domains'

export default function App() {
  const location = useLocation()
  const onFilamento = isFilamentoDomain(location.pathname)

  return (
    <div className="pignus-app">
      <Header />
      <DomainNav />
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/receive" element={<ReceiveFlow />} />
          <Route path="/consume" element={<ConsumeFlow />} />
          <Route path="/families" element={<FamilyList />} />
          <Route path="/families/new" element={<FamilyCreate />} />
          <Route path="/families/:id" element={<FamilyDetail />} />
          <Route path="/movements" element={<MovementHistory />} />
          <Route path="/packaging" element={<UnderConstruction title="Packaging" />} />
          <Route path="/consumibles" element={<UnderConstruction title="Consumibles" />} />
          <Route path="/productos-terminados" element={<UnderConstruction title="Productos" />} />
        </Routes>
      </main>
      <Footer />
      {onFilamento && <BottomNav />}
    </div>
  )
}
