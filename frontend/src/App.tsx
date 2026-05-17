import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import Dashboard from './pages/Dashboard'
import ReceiveFlow from './pages/ReceiveFlow'
import ConsumeFlow from './pages/ConsumeFlow'

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/receive" element={<ReceiveFlow />} />
          <Route path="/consume" element={<ConsumeFlow />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}
