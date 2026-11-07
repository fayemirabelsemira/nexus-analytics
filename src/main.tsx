import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';
import { AuthUIProvider } from './contexts/AuthUIContext';
import { FeedbackProvider } from './contexts/FeedbackContext';
import { PreferencesProvider } from './contexts/PreferencesContext';
import { SessionProvider } from './contexts/SessionContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreferencesProvider>
      <AuthProvider>
        <FeedbackProvider>
          <SessionProvider>
            <AuthUIProvider>
              <App />
            </AuthUIProvider>
          </SessionProvider>
        </FeedbackProvider>
      </AuthProvider>
    </PreferencesProvider>
  </StrictMode>,
);
