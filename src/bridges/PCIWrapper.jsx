/**
 * Wrapper para montar el comparativo PCI desde vanilla
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SMSComparativoPCI from '../components/indicadores/SMSComparativoPCI';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false
    }
  }
});

export default function PCIWrapper({ indicadorA, indicadorB, meta }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SMSComparativoPCI indicadorA={indicadorA} indicadorB={indicadorB} meta={meta} />
    </QueryClientProvider>
  );
}
