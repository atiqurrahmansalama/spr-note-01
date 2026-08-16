// Polyfill crypto.randomUUID for non-secure contexts (HTTP) and older browsers
if (typeof window !== 'undefined') {
  if (!window.crypto) {
    window.crypto = {};
  }
  if (!window.crypto.randomUUID) {
    window.crypto.randomUUID = function () {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
  }
}

import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App'
import './index.css'
import { ToastProvider } from './context/ToastContext'
import { FontProvider } from './context/FontContext'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { TenantProvider } from './context/TenantContext'
import { FeatureControlProvider } from './context/FeatureControlContext'
import ErrorBoundary from './components/ui/ErrorBoundary'

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={googleClientId}>
        <AuthProvider>
          <TenantProvider>
            <FeatureControlProvider>
              <ToastProvider>
                <ThemeProvider>
                  <FontProvider>
                    <App />
                  </FontProvider>
                </ThemeProvider>
              </ToastProvider>
            </FeatureControlProvider>
          </TenantProvider>
        </AuthProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)