/**
 * Modal de Sistema de Iluminación
 * SMS-03, SMS-03A, SMS-03B, SMS-04
 */

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Download, Lightbulb } from 'lucide-react';

import SMSModalContainer from '../shared/SMSModalContainer';
import LoadingState from '../shared/LoadingState';
import EmptyState from '../shared/EmptyState';
import ErrorState from '../shared/ErrorState';
import useCSVExport from '../../../hooks/shared/useCSVExport';

import {
  getMedicionesLucesDetalle,
  getYearsAvailableLuces,
  getPistasAvailableLuces
} from '../../../lib/supabaseClient';
import { formatNumber, formatPercent, MONTH_LABELS } from '../../../utils/shared';

export default function IluminacionModal({ title, onClose }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedPista, setSelectedPista] = useState(null);
  const { exportToCSV } = useCSVExport();

  // Query años disponibles
  const { data: availableYears } = useQuery({
    queryKey: ['luces-years'],
    queryFn: getYearsAvailableLuces,
    staleTime: 10 * 60 * 1000
  });

  // Query pistas disponibles
  const { data: availablePistas } = useQuery({
    queryKey: ['luces-pistas'],
    queryFn: getPistasAvailableLuces,
    staleTime: 10 * 60 * 1000
  });

  // Seleccionar primera pista por defecto
  useEffect(() => {
    if (availablePistas?.length && !selectedPista) {
      setSelectedPista(availablePistas[0]);
    }
  }, [availablePistas, selectedPista]);

  // Query mediciones
  const { data: mediciones, isLoading, isError, refetch } = useQuery({
    queryKey: ['mediciones-luces', selectedYear, selectedPista],
    queryFn: () => getMedicionesLucesDetalle({ anio: selectedYear, pista: selectedPista }),
    enabled: Boolean(selectedYear && selectedPista),
    staleTime: 5 * 60 * 1000
  });

  // Procesar datos para gráfico
  const chartData = useMemo(() => {
    if (!mediciones?.length) return [];

    return MONTH_LABELS.map((monthLabel, index) => {
      const month = index + 1;
      const record = mediciones.find(m => m.mes === month);

      return {
        month: monthLabel,
        monthNumber: month,
        operativas: record?.luces_operativas ?? null,
        totales: record?.luces_totales ?? null,
        porcentaje: record?.porcentaje_operativas ?? null
      };
    });
  }, [mediciones]);

  // Estadísticas
  const stats = useMemo(() => {
    if (!mediciones?.length) return null;

    const promedioOperativas = mediciones.reduce((sum, m) => sum + (m.luces_operativas || 0), 0) / mediciones.length;
    const promedioTotales = mediciones.reduce((sum, m) => sum + (m.luces_totales || 0), 0) / mediciones.length;
    const promedioPorcentaje = mediciones.reduce((sum, m) => sum + (m.porcentaje_operativas || 0), 0) / mediciones.length;

    return {
      promedioOperativas: Math.round(promedioOperativas),
      promedioTotales: Math.round(promedioTotales),
      promedioPorcentaje: promedioPorcentaje
    };
  }, [mediciones]);

  // Export CSV
  const handleExport = () => {
    if (!chartData.length) return;

    const headers = ['Mes', 'Luces Operativas', 'Luces Totales', 'Porcentaje (%)'];
    const rows = chartData.map(row => [
      row.month,
      row.operativas ?? '',
      row.totales ?? '',
      row.porcentaje != null ? row.porcentaje.toFixed(2) : ''
    ]);

    const avgRow = [
      'PROMEDIO',
      stats?.promedioOperativas ?? '',
      stats?.promedioTotales ?? '',
      stats?.promedioPorcentaje != null ? stats.promedioPorcentaje.toFixed(2) : ''
    ];

    exportToCSV([headers, ...rows, [], avgRow], `iluminacion-${selectedPista}-${selectedYear}`);
  };

  // Estados
  if (isLoading) return <LoadingState message="Cargando datos de iluminación..." />;
  if (isError) return <ErrorState title="Error al cargar datos" onClose={onClose} onRetry={refetch} />;
  if (!mediciones?.length) {
    return <EmptyState title="Sin datos" message={`No hay datos de iluminación para ${selectedPista} en ${selectedYear}.`} onClose={onClose} />;
  }

  return (
    <SMSModalContainer title={title || 'Sistema de Iluminación'} subtitle="SMS-03, SMS-03A, SMS-03B, SMS-04" onClose={onClose}>
      {/* Controles */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
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

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">Pista</label>
          <select
            value={selectedPista || ''}
            onChange={(e) => setSelectedPista(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm shadow-sm focus:border-aifa-light focus:ring-2 focus:ring-aifa-light/30"
          >
            {availablePistas?.map(pista => (
              <option key={pista} value={pista}>{pista}</option>
            ))}
          </select>
        </div>

        <button
          onClick={handleExport}
          className="ml-auto flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
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
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Promedio Operativas</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{formatNumber(stats.promedioOperativas)}</p>
              <p className="mt-1 text-xs text-slate-500">luces</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Promedio Totales</p>
              <p className="mt-2 text-3xl font-bold text-slate-600">{formatNumber(stats.promedioTotales)}</p>
              <p className="mt-1 text-xs text-slate-500">luces</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-aifa-light/10 to-white p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Disponibilidad</p>
              <p className="mt-2 text-3xl font-bold text-aifa-blue">{formatPercent(stats.promedioPorcentaje)}</p>
              <p className="mt-1 text-xs text-slate-500">promedio anual</p>
            </div>
          </div>
        )}

        {/* Gráfico */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">
            <Lightbulb className="mr-2 inline h-4 w-4" />
            Seguimiento mensual
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="operativas" fill="#10b981" name="Operativas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totales" fill="#94a3b8" name="Totales" radius={[4, 4, 0, 0]} />
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
                  <th className="px-4 py-3 text-right font-semibold">Operativas</th>
                  <th className="px-4 py-3 text-right font-semibold">Totales</th>
                  <th className="px-4 py-3 text-right font-semibold">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {chartData.map(row => (
                  <tr key={row.monthNumber} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{row.month}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-semibold">
                      {row.operativas != null ? formatNumber(row.operativas) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {row.totales != null ? formatNumber(row.totales) : '—'}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {row.porcentaje != null ? formatPercent(row.porcentaje) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-100">
                <tr className="font-semibold">
                  <td className="px-4 py-3">PROMEDIO</td>
                  <td className="px-4 py-3 text-right text-green-600">{formatNumber(stats.promedioOperativas)}</td>
                  <td className="px-4 py-3 text-right">{formatNumber(stats.promedioTotales)}</td>
                  <td className="px-4 py-3 text-right">{formatPercent(stats.promedioPorcentaje)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </SMSModalContainer>
  );
}
