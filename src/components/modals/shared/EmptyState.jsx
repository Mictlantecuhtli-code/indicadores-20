import { FileQuestion } from 'lucide-react';

export default function EmptyState({ 
  title = 'Sin datos', 
  message = 'No hay información disponible para mostrar.',
  onClose 
}) {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 text-slate-500">
      <FileQuestion className="h-12 w-12 text-slate-300" />
      <div className="text-center">
        <p className="text-lg font-semibold text-slate-700">{title}</p>
        <p className="mt-1 text-sm">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="mt-4 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Cerrar
        </button>
      )}
    </div>
  );
}
