import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import PageTabs from './components/PageTabs'
import Footer from './components/Footer'
import Dashboard from './pages/Dashboard'
import ReceiveFlow from './pages/ReceiveFlow'
import ConsumeFlow from './pages/ConsumeFlow'
import FamilyList from './pages/FamilyList'
import FamilyCreate from './pages/FamilyCreate'
import FamilyDetail from './pages/FamilyDetail'
import MovementHistory from './pages/MovementHistory'

export default function App() {
  return (
    <div className="pignus-app">
      <Header />
      <PageTabs />
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
      <Footer />
    </div>
  )
}
