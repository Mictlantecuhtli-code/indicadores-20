/**
 * Wrapper temporal para el comparativo PCI mientras se reconstruyen los componentes SMS.
 */

export default function PCIWrapper() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50 px-6 py-8 text-center text-slate-700">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-inner">
        <svg className="h-7 w-7 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 className="text-lg font-semibold text-slate-900">Módulo en construcción</h3>
      <p className="mt-2 text-sm text-slate-600">
        El comparativo PCI estará disponible nuevamente en breve con mejoras significativas.
      </p>
    </div>
  );
}
