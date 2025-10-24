/**
 * Modal de Disponibilidad de Pistas
 * SMS-07
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Download, Plane } from 'lucide-react';

import SMSModalContainer from '../shared/SMSModalContainer';
import LoadingState from '../shared/LoadingState';
import EmptyState from '../shared/EmptyState';
import ErrorState from '../shared/ErrorState';
import useCSVExport from '../../../hooks/shared/useCSVExport';

import { getDisponibilidadPistas, getYearsAvailableDisponibilidad } from '../../../lib/supabaseClient';
import { formatPercent, MONTH_LABELS } from '../../../utils/shared';

export default function DisponibilidadPistasModal({ title, onClose, meta = 98 }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { exportToCSV } = useCSVExport();

  // Query años
  const { data: availableYears } = useQuery({
    queryKey: ['disponibilidad-years'],
    queryFn: getYearsAvailableDisponibilidad,
    staleTime: 10 * 60 * 1000
  });

  // Query disponibilidad
  const { data: disponibilidad, isLoading, isError, refetch } = useQuery({
    queryKey: ['disponibilidad-pistas', selectedYear],
    queryFn: () => getDisponibilidadPistas({ anio: selectedYear }),
    enabled: Boolean(selectedYear),
    staleTime: 5 * 60 * 1000
  });

  // Procesar datos para gráfico
  const chartData = useMemo(() => {
    if (!disponibilidad?.length) return [];

    return MONTH_LABELS.map((monthLabel, index) => {
      const month = index + 1;
      const records = disponibilidad.filter(d => d.mes === month);

      const pista01L = records.find(r => r.pista === '01L')?.porcentaje_disponibilidad ?? null;
      const pista01R = records.find(r => r.pista === '01R')?.porcentaje_disponibilidad ?? null;

      return {
        month: monthLabel,
        monthNumber: month,
        pista01L,
        pista01R,
        meta
      };
    });
  }, [disponibilidad, meta]);

  // Estadísticas
  const stats = useMemo(() => {
    if (!disponibilidad?.length) return null;

    const pista01LRecords = disponibilidad.filter(d => d.pista === '01L');
    const pista01RRecords = disponibilidad.filter(d => d.pista === '01R');

    const promedio01L = pista01LRecords.length > 0
      ? pista01LRecords.reduce((sum, d) => sum + (d.porcentaje_disponibilidad || 0), 0) / pista01LRecords.length
      : null;

    const promedio01R = pista01RRecords.length > 0
      ? pista01RRecords.reduce((sum, d) => sum + (d.porcentaje_disponibilidad || 0), 0) / pista01RRecords.length
      : null;

    const promedioGeneral = disponibilidad.reduce((sum, d) => sum + (d.porcentaje_disponibilidad || 0), 0) / disponibilidad.length;

    return { promedio01L, promedio01R, promedioGeneral };
  }, [disponibilidad]);

  // Export CSV
  const handleExport = () => {
    if (!chartData.length) return;

    const headers = ['Mes', 'Pista 01L (%)', 'Pista 01R (%)', 'Meta (%)'];
    const rows = chartData.map(row => [
      row.month,
      row.pista01L != null ? row.pista01L.toFixed(2) : '',
      row.pista01R != null ? row.pista01R.toFixed(2) : '',
      row.meta
    ]);

    const avgRow = [
      'PROMEDIO',
      stats?.promedio01L != null ? stats.promedio01L.toFixed(2) : '',
      stats?.promedio01R != null ? stats.promedio01R.toFixed(2) : '',
      meta
    ];

    exportToCSV([headers, ...rows, [], avgRow], `disponibilidad-pistas-${selectedYear}`);
  };

  // Estados
  if (isLoading) return <LoadingState message="Cargando disponibilidad..." />;
  if (isError) return <ErrorState title="Error al cargar disponibilidad" onClose={onClose} onRetry={refetch} />;
  if (!disponibilidad?.length) {
    return <EmptyState title="Sin datos" message={`No hay datos de disponibilidad para ${selectedYear}.`} onClose={onClose} />;
  }

  return (
    <SMSModalContainer title={title || 'Disponibilidad de Pistas'} subtitle="SMS-07" onClose={onClose}>
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
        {stats && (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Pista 01L</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">
                {stats.promedio01L != null ? formatPercent(stats.promedio01L) : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-500">promedio anual</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Pista 01R</p>
              <p className="mt-2 text-3xl font-bold text-indigo-600">
                {stats.promedio01R != null ? formatPercent(stats.promedio01R) : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-500">promedio anual</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-aifa-light/10 to-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Promedio General</p>
              <p className="mt-2 text-3xl font-bold text-aifa-blue">
                {formatPercent(stats.promedioGeneral)}
              </p>
              <p className="mt-1 text-xs text-slate-500">ambas pistas</p>
            </div>
          </div>
        )}

        {/* Gráfico */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">
            <Plane className="mr-2 inline h-4 w-4" />
            Disponibilidad mensual por pista
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={meta} stroke="#ef4444" strokeDasharray="3 3" label="Meta" />
                <Bar dataKey="pista01L" fill="#3b82f6" name="Pista 01L" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pista01R" fill="#6366f1" name="Pista 01R" radius={[4, 4, 0, 0]} />
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
                  <th className="px-4 py-3 text-right font-semibold">Pista 01L</th>
                  <th className="px-4 py-3 text-right font-semibold">Pista 01R</th>
                  <th className="px-4 py-3 text-right font-semibold">Meta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chartData.map(row => (
                  <tr key={row.monthNumber} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.month}</td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-600">
                      {row.pista01L != null ? formatPercent(row.pista01L) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-indigo-600">
                      {row.pista01R != null ? formatPercent(row.pista01R) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">{meta}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100">
                <tr className="font-semibold">
                  <td className="px-4 py-3">PROMEDIO</td>
                  <td className="px-4 py-3 text-right text-blue-600">
                    {stats.promedio01L != null ? formatPercent(stats.promedio01L) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right text-indigo-600">
                    {stats.promedio01R != null ? formatPercent(stats.promedio01R) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">{meta}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </SMSModalContainer>
  );
}
