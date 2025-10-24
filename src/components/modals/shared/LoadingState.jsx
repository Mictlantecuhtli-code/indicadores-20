import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Cargando datos...' }) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-slate-500">
      <Loader2 className="h-8 w-8 animate-spin text-aifa-blue" />
      <p className="text-sm">{message}</p>
    </div>
  );
}
