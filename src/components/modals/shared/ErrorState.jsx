import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorState({ 
  title = 'Error al cargar datos',
  message = 'Ocurrió un error al cargar la información. Por favor intenta nuevamente.',
  onRetry,
  onClose
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-red-500">
      <AlertCircle className="h-12 w-12" />
      <div className="text-center">
        <p className="text-lg font-semibold text-red-700">{title}</p>
        <p className="mt-1 text-sm text-red-600">{message}</p>
      </div>
      <div className="flex gap-3">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </button>
        )}
        {onClose && (
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cerrar
          </button>
        )}
      </div>
    </div>
  );
}
