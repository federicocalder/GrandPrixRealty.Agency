import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App'
import ValuationPage from './pages/ValuationPage'
import SellerNetSheetPage from './pages/SellerNetSheetPage'
import ListingConfigPage from './pages/ListingConfigPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter basename="/seller-portal">
      <Routes>
        <Route path="/" element={<App />}>
          {/* Redirect root to Hugo landing page */}
          <Route index element={<Navigate to="/homeseller" replace />} />
          <Route path="valuation/:valuationId" element={<ValuationPage />} />
          <Route path="net-sheet/:valuationId" element={<SellerNetSheetPage />} />
          <Route path="list/:valuationId" element={<ListingConfigPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
