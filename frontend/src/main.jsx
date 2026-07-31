import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { ToastProvider } from './context/ToastContext' // 👈 ইমপোর্ট করুন

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider> {/* 👈 পুরো অ্যাপকে র‍্যাপ করুন */}
      <App />
    </ToastProvider>
  </React.StrictMode>,
)