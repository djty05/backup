import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx';
import Report from './pages/Report.jsx';
import SubmitReport from './pages/SubmitReport';
import TalentUpload from './pages/TalentUpload';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/Home" element={<Home />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/Report" element={<Report />} />
        <Route path="/SubmitReport" element={<SubmitReport />} />
        <Route path="/TalentUpload" element={<TalentUpload />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App