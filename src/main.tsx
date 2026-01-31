import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import './index.css'
import './i18n' // Initialize i18n
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  // Temporarily disabled StrictMode to fix socket connection issues
  // <StrictMode>
  <Provider store={store}>
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <App />
    </Suspense>
  </Provider>
  // </StrictMode>,
)
