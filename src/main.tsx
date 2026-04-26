import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './app/App.tsx';
import { AuthProvider } from './app/context/AuthContext.tsx';
import { ErrorBoundary } from './app/components/ErrorBoundary.tsx';
import { initializeSecurity } from './utils/security.ts';
import './styles/index.css';

initializeSecurity();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </ErrorBoundary>
);
