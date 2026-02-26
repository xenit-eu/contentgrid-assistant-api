import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './App.css'
import { AssistantContainer } from './Assistant/components/AssistantContainer'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ReactQueryDevtools initialIsOpen={false} />

      <AssistantContainer threadContext={{}} />
    </QueryClientProvider>
  )
}

export default App
