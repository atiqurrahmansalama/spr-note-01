import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App'
import './index.css'
import { ToastProvider } from './context/ToastContext'
import { FontProvider } from './context/FontContext'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { FeatureControlProvider } from './context/FeatureControlContext'
import ErrorBoundary from './components/ui/ErrorBoundary'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={googleClientId}>
        <AuthProvider>
          <FeatureControlProvider>
            <ToastProvider>
              <ThemeProvider>
                <FontProvider>
                  <App />
                </FontProvider>
              </ThemeProvider>
            </ToastProvider>
          </FeatureControlProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)