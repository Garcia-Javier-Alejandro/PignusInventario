import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import Dashboard from './pages/Dashboard'
import ReceiveFlow from './pages/ReceiveFlow'
import ConsumeFlow from './pages/ConsumeFlow'
import FamilyList from './pages/FamilyList'
import FamilyCreate from './pages/FamilyCreate'
import FamilyDetail from './pages/FamilyDetail'
import MovementHistory from './pages/MovementHistory'

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/receive" element={<ReceiveFlow />} />
          <Route path="/consume" element={<ConsumeFlow />} />
          <Route path="/families" element={<FamilyList />} />
          <Route path="/families/new" element={<FamilyCreate />} />
          <Route path="/families/:id" element={<FamilyDetail />} />
          <Route path="/movements" element={<MovementHistory />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}
