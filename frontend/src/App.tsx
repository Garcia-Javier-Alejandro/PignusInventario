import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import BottomNav from './components/BottomNav'
import Dashboard from './pages/Dashboard'

export default function App() {
  return (
    <div className="app-shell">
      <Header />
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}
