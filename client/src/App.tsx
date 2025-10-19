import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IdentityProvider } from './contexts/identity-context';
import { MSMProvider } from './contexts/msm-context';
import { Router } from './Router';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <IdentityProvider>
        <MSMProvider>
          <Router />
        </MSMProvider>
      </IdentityProvider>
    </QueryClientProvider>
  );
}

export default App;

