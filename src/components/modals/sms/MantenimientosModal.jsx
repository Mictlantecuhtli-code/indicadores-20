/**
 * Modal de Mantenimientos Programados a Pavimentos
 * SMS-06
 */

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Download, Wrench } from 'lucide-react';

import SMSModalContainer from '../shared/SMSModalContainer';
import LoadingState from '../shared/LoadingState';
import EmptyState from '../shared/EmptyState';
import ErrorState from '../shared/ErrorState';
import useCSVExport from '../../../hooks/shared/useCSVExport';

import { getMantenimientosPavimentos, getYearsAvailableMantenimientos } from '../../../lib/supabaseClient';
import { formatNumber, formatPercent } from '../../../utils/shared';
import { calculateAverage, calculateTotal, prepareMonthlyData } from '../../../utils/sms/chartHelpers';

export default function MantenimientosModal({ title, onClose, meta = 100 }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { exportToCSV } = useCSVExport();

  // Query años
  const { data: availableYears } = useQuery({
    queryKey: ['mantenimientos-years'],
    queryFn: getYearsAvailableMantenimientos,
    staleTime: 10 * 60 * 1000
  });

  // Query mantenimientos
  const { data: mantenimientos, isLoading, isError, refetch } = useQuery({
    queryKey: ['mantenimientos-pavimentos', selectedYear],
    queryFn: () => getMantenimientosPavimentos({ anio: selectedYear }),
    enabled: Boolean(selectedYear),
    staleTime: 5 * 60 * 1000
  });

  // Procesar datos para gráfico
  const chartData = useMemo(() => {
    if (!mantenimientos?.length) return [];

    return prepareMonthlyData(mantenimientos, 'mes', [
      'programados',
      'realizados',
      'porcentaje_cumplimiento'
    ]).map(item => ({
      month: item.month,
      monthNumber: item.monthNumber,
      programados: item.programados ?? null,
      realizados: item.realizados ?? null,
      porcentaje: item.porcentaje_cumplimiento ?? null,
      meta
    }));
  }, [mantenimientos, meta]);

  // Estadísticas
  const stats = useMemo(() => {
    if (!chartData.length) return null;

    const totalProgramados = calculateTotal(chartData.map(item => item.programados));
    const totalRealizados = calculateTotal(chartData.map(item => item.realizados));
    const cumplimiento = totalProgramados > 0 ? (totalRealizados / totalProgramados) * 100 : null;

    return {
      totalProgramados,
      totalRealizados,
      cumplimiento,
      promedioPorcentaje: calculateAverage(chartData.map(item => item.porcentaje))
    };
  }, [chartData]);

  // Export CSV
  const handleExport = () => {
    if (!chartData.length) return;

    const headers = ['Mes', 'Programados', 'Realizados', 'Porcentaje (%)', 'Meta (%)'];
    const rows = chartData.map(row => [
      row.month,
      row.programados ?? '',
      row.realizados ?? '',
      row.porcentaje != null ? row.porcentaje.toFixed(2) : '',
      row.meta
    ]);

    const totalsRow = [
      'TOTAL/PROMEDIO',
      stats?.totalProgramados ?? '',
      stats?.totalRealizados ?? '',
      stats?.cumplimiento != null ? stats.cumplimiento.toFixed(2) : '',
      meta
    ];

    exportToCSV([headers, ...rows, [], totalsRow], `mantenimientos-${selectedYear}`);
  };

  // Estados
  if (isLoading) return <LoadingState message="Cargando mantenimientos..." />;
  if (isError) return <ErrorState title="Error al cargar mantenimientos" onClose={onClose} onRetry={refetch} />;
  if (!mantenimientos?.length) {
    return <EmptyState title="Sin datos" message={`No hay mantenimientos para ${selectedYear}.`} onClose={onClose} />;
  }

  return (
    <SMSModalContainer title={title || 'Mantenimientos Programados'} subtitle="SMS-06" onClose={onClose}>
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
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Total Programados</p>
              <p className="mt-2 text-3xl font-bold text-slate-600">{formatNumber(stats.totalProgramados)}</p>
              <p className="mt-1 text-xs text-slate-500">mantenimientos</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Total Realizados</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{formatNumber(stats.totalRealizados)}</p>
              <p className="mt-1 text-xs text-slate-500">mantenimientos</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-aifa-light/10 to-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Cumplimiento</p>
              <p className={`mt-2 text-3xl font-bold ${
                stats.cumplimiento >= meta ? 'text-green-600' : stats.cumplimiento >= 70 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {stats.cumplimiento != null ? formatPercent(stats.cumplimiento, 1) : '—'}
              </p>
              <p className="mt-1 text-xs text-slate-500">del objetivo</p>
            </div>
          </div>
        )}

        {/* Gráfico */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">
            <Wrench className="mr-2 inline h-4 w-4" />
            Cumplimiento mensual
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip />
                <Legend />
                <ReferenceLine y={meta} stroke="#ef4444" strokeDasharray="3 3" label="Meta" />
                <Line
                  type="monotone"
                  dataKey="porcentaje"
                  stroke="#1e3a8a"
                  strokeWidth={3}
                  name="Porcentaje (%)"
                  dot={{ r: 4 }}
                />
              </LineChart>
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
                  <th className="px-4 py-3 text-right font-semibold">Programados</th>
                  <th className="px-4 py-3 text-right font-semibold">Realizados</th>
                  <th className="px-4 py-3 text-right font-semibold">%</th>
                  <th className="px-4 py-3 text-right font-semibold">Meta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chartData.map(row => (
                  <tr key={row.monthNumber} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.month}</td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {row.programados != null ? formatNumber(row.programados) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-green-600 font-semibold">
                      {row.realizados != null ? formatNumber(row.realizados) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {row.porcentaje != null ? formatPercent(row.porcentaje) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">{meta}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100">
                <tr className="font-semibold">
                  <td className="px-4 py-3">TOTAL</td>
                  <td className="px-4 py-3 text-right">{formatNumber(stats.totalProgramados)}</td>
                  <td className="px-4 py-3 text-right text-green-600">{formatNumber(stats.totalRealizados)}</td>
                  <td className="px-4 py-3 text-right">
                    {stats.cumplimiento != null ? formatPercent(stats.cumplimiento) : '—'}
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
