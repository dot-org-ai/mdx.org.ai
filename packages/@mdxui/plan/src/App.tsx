import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Dashboard } from './components/Dashboard'
import './styles/globals.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000,
      refetchOnWindowFocus: true,
    },
  },
})

function App() {
  // You can customize the baseUrl based on environment
  const baseUrl = import.meta.env.VITE_API_URL || 'https://agents.do'

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <Dashboard baseUrl={baseUrl} />
      </div>
    </QueryClientProvider>
  )
}

export default App
