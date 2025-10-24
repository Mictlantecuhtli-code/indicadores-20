/**
 * Modal de Capturas de Fauna (Prueba de concepto)
 * SMS-01 y SMS-02
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

import SMSModalContainer from '../shared/SMSModalContainer';
import LoadingState from '../shared/LoadingState';
import EmptyState from '../shared/EmptyState';
import ErrorState from '../shared/ErrorState';
import useCSVExport from '../../../hooks/shared/useCSVExport';

import { getCapturasFauna, getYearsAvailableCapturas } from '../../../lib/supabaseClient';
import { formatNumber, MONTH_LABELS } from '../../../utils/shared';

export default function FaunaCaptureModal({ title, onClose }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { exportToCSV } = useCSVExport();

  // Query años disponibles
  const { data: availableYears } = useQuery({
    queryKey: ['capturas-fauna-years'],
    queryFn: getYearsAvailableCapturas,
    staleTime: 10 * 60 * 1000
  });

  // Query capturas
  const { data: capturas, isLoading, isError, refetch } = useQuery({
    queryKey: ['capturas-fauna', selectedYear],
    queryFn: () => getCapturasFauna({ anio: selectedYear }),
    enabled: Boolean(selectedYear),
    staleTime: 5 * 60 * 1000
  });

  // Procesar datos para gráfico
  const chartData = useMemo(() => {
    if (!capturas?.length) return [];

    return MONTH_LABELS.map((monthLabel, index) => {
      const month = index + 1;
      const records = capturas.filter(c => c.mes === month);
      
      const aves = records.find(r => r.tipo_fauna?.toLowerCase().includes('ave'))?.cantidad ?? 0;
      const mamiferos = records.find(r => r.tipo_fauna?.toLowerCase().includes('mamifero'))?.cantidad ?? 0;
      const reptiles = records.find(r => r.tipo_fauna?.toLowerCase().includes('reptil'))?.cantidad ?? 0;
      
      return {
        month: monthLabel,
        aves,
        mamiferos,
        reptiles,
        total: aves + mamiferos + reptiles
      };
    });
  }, [capturas]);

  // Totales
  const totals = useMemo(() => {
    if (!chartData.length) return null;
    return chartData.reduce((acc, item) => ({
      aves: acc.aves + item.aves,
      mamiferos: acc.mamiferos + item.mamiferos,
      reptiles: acc.reptiles + item.reptiles,
      total: acc.total + item.total
    }), { aves: 0, mamiferos: 0, reptiles: 0, total: 0 });
  }, [chartData]);

  // Export CSV
  const handleExport = () => {
    if (!chartData.length) return;

    const headers = ['Mes', 'Aves', 'Mamíferos', 'Reptiles', 'Total'];
    const rows = chartData.map(row => [
      row.month,
      row.aves,
      row.mamiferos,
      row.reptiles,
      row.total
    ]);
    
    const totalsRow = ['TOTAL', totals.aves, totals.mamiferos, totals.reptiles, totals.total];

    exportToCSV([headers, ...rows, [], totalsRow], `capturas-fauna-${selectedYear}`);
  };

  // Estados
  if (isLoading) return <LoadingState message="Cargando capturas de fauna..." />;
  if (isError) return <ErrorState title="Error al cargar capturas" onClose={onClose} onRetry={refetch} />;
  if (!capturas?.length) {
    return <EmptyState title="Sin datos" message={`No hay capturas de fauna para ${selectedYear}.`} onClose={onClose} />;
  }

  return (
    <SMSModalContainer title={title || 'Capturas de Fauna'} subtitle="SMS-01 y SMS-02" onClose={onClose}>
      {/* Controles */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Año</label>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm shadow-sm focus:border-aifa-light focus:ring-2 focus:ring-aifa-light/30"
          >
            {availableYears?.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      <div className="space-y-6">
        {/* Resumen */}
        {totals && (
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Aves</p>
              <p className="mt-2 text-3xl font-bold text-sky-600">{formatNumber(totals.aves)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Mamíferos</p>
              <p className="mt-2 text-3xl font-bold text-amber-600">{formatNumber(totals.mamiferos)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Reptiles</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{formatNumber(totals.reptiles)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-aifa-light/10 to-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Total</p>
              <p className="mt-2 text-3xl font-bold text-aifa-blue">{formatNumber(totals.total)}</p>
            </div>
          </div>
        )}

        {/* Gráfico */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">Capturas mensuales</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="aves" fill="#0ea5e9" name="Aves" radius={[4, 4, 0, 0]} />
                <Bar dataKey="mamiferos" fill="#f59e0b" name="Mamíferos" radius={[4, 4, 0, 0]} />
                <Bar dataKey="reptiles" fill="#10b981" name="Reptiles" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-500">Detalle mensual</h3>
          </div>
          <div className="max-h-96 overflow-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="sticky top-0 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Mes</th>
                  <th className="px-4 py-3 text-right font-semibold">Aves</th>
                  <th className="px-4 py-3 text-right font-semibold">Mamíferos</th>
                  <th className="px-4 py-3 text-right font-semibold">Reptiles</th>
                  <th className="px-4 py-3 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chartData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.month}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatNumber(row.aves)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatNumber(row.mamiferos)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{formatNumber(row.reptiles)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatNumber(row.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100">
                <tr className="font-semibold">
                  <td className="px-4 py-3">TOTAL</td>
                  <td className="px-4 py-3 text-right">{formatNumber(totals.aves)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(totals.mamiferos)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(totals.reptiles)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(totals.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </SMSModalContainer>
  );
}
