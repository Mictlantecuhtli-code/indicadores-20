/**
 * Componente Comparativo PCI
 * Compara índices PCI entre pistas 01L y 01R
 * SMS-05A y SMS-05B
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
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { getPCIMediciones, getYearsAvailablePCI } from '../../lib/supabaseClient';
import { formatNumber, MONTH_LABELS } from '../../utils/shared';
import { calculateAverage } from '../../utils/sms/chartHelpers';

export default function SMSComparativoPCI({ indicadorA, indicadorB, meta = 70 }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Query años disponibles
  const { data: availableYears } = useQuery({
    queryKey: ['pci-years'],
    queryFn: getYearsAvailablePCI,
    staleTime: 10 * 60 * 1000
  });

  // Query PCI pista 01L
  const { data: pci01L, isLoading: loading01L } = useQuery({
    queryKey: ['pci-01L', selectedYear],
    queryFn: () => getPCIMediciones({ anio: selectedYear, pista: '01L' }),
    enabled: Boolean(selectedYear),
    staleTime: 5 * 60 * 1000
  });

  // Query PCI pista 01R
  const { data: pci01R, isLoading: loading01R } = useQuery({
    queryKey: ['pci-01R', selectedYear],
    queryFn: () => getPCIMediciones({ anio: selectedYear, pista: '01R' }),
    enabled: Boolean(selectedYear),
    staleTime: 5 * 60 * 1000
  });

  const isLoading = loading01L || loading01R;

  // Procesar datos para gráfico
  const chartData = useMemo(() => {
    if (!pci01L?.length && !pci01R?.length) return [];

    return MONTH_LABELS.map((monthLabel, index) => {
      const month = index + 1;

      const record01L = pci01L?.find(p => p.mes === month);
      const record01R = pci01R?.find(p => p.mes === month);

      return {
        month: monthLabel,
        monthNumber: month,
        pci01L: record01L?.valor_pci ?? null,
        pci01R: record01R?.valor_pci ?? null,
        meta
      };
    });
  }, [pci01L, pci01R, meta]);

  // Estadísticas
  const stats = useMemo(() => {
    if (!chartData.length) return null;

    const valores01L = chartData.map(d => d.pci01L).filter(value => value != null);
    const valores01R = chartData.map(d => d.pci01R).filter(value => value != null);

    const promedio01L = calculateAverage(valores01L);
    const promedio01R = calculateAverage(valores01R);
    const ultimo01L = valores01L.length > 0 ? valores01L[valores01L.length - 1] : null;
    const ultimo01R = valores01R.length > 0 ? valores01R[valores01R.length - 1] : null;

    return { promedio01L, promedio01R, ultimo01L, ultimo01R };
  }, [chartData]);

  // Determinar tendencia
  const getTrendIcon = (value, threshold) => {
    if (value == null) return <Minus className="h-5 w-5 text-slate-400" />;
    if (value >= threshold) return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (value >= threshold * 0.8) return <Minus className="h-5 w-5 text-amber-600" />;
    return <TrendingDown className="h-5 w-5 text-red-600" />;
  };

  const getValueColor = (value, threshold) => {
    if (value == null) return 'text-slate-400';
    if (value >= threshold) return 'text-green-600';
    if (value >= threshold * 0.8) return 'text-amber-600';
    return 'text-red-600';
  };

  if (isLoading) {
    return (
      <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6">
        <div className="h-8 w-64 rounded bg-slate-200" />
        <div className="mt-4 h-64 rounded bg-slate-100" />
      </div>
    );
  }

  if (!chartData.length || (!pci01L?.length && !pci01R?.length)) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6">
        <p className="text-sm text-slate-500">
          No hay datos de PCI disponibles para {selectedYear}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header con selector */}
      <div className="flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">
          Comparativo PCI - Índice de Condiciones del Pavimento
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {indicadorA?.nombre || 'SMS-05A'} vs. {indicadorB?.nombre || 'SMS-05B'}
        </p>
      </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Año
          </label>
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
      </div>

      {/* Cards de resumen */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Pista 01L */}
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50 to-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Pista 01L
              </p>
              <p className={`mt-2 text-4xl font-bold ${getValueColor(stats?.ultimo01L, meta)}`}>
                {stats?.ultimo01L != null ? formatNumber(stats.ultimo01L) : '—'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Promedio: {stats?.promedio01L != null ? formatNumber(stats.promedio01L) : '—'}
              </p>
            </div>
            {getTrendIcon(stats?.ultimo01L, meta)}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <span>Meta: {meta}</span>
            {stats?.ultimo01L != null && stats.ultimo01L >= meta && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">
                ✓ Cumpliendo
              </span>
            )}
          </div>
        </div>

        {/* Pista 01R */}
        <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-indigo-50 to-white p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Pista 01R
              </p>
              <p className={`mt-2 text-4xl font-bold ${getValueColor(stats?.ultimo01R, meta)}`}>
                {stats?.ultimo01R != null ? formatNumber(stats.ultimo01R) : '—'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Promedio: {stats?.promedio01R != null ? formatNumber(stats.promedio01R) : '—'}
              </p>
            </div>
            {getTrendIcon(stats?.ultimo01R, meta)}
          </div>
          <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
            <span>Meta: {meta}</span>
            {stats?.ultimo01R != null && stats.ultimo01R >= meta && (
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">
                ✓ Cumpliendo
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Gráfico comparativo */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h4 className="mb-4 text-sm font-semibold uppercase tracking-widest text-slate-500">
          Evolución mensual
        </h4>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <ReferenceLine
                y={meta}
                stroke="#ef4444"
                strokeDasharray="3 3"
                label={{ value: `Meta ${meta}`, position: 'right' }}
              />
              <Line
                type="monotone"
                dataKey="pci01L"
                stroke="#3b82f6"
                strokeWidth={3}
                name="Pista 01L"
                dot={{ r: 5 }}
                connectNulls
              />
              <Line
                type="monotone"
                dataKey="pci01R"
                stroke="#6366f1"
                strokeWidth={3}
                name="Pista 01R"
                dot={{ r: 5 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Interpretación */}
      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
        <h4 className="text-sm font-semibold text-blue-900">
          Interpretación del PCI
        </h4>
        <ul className="mt-2 space-y-1 text-sm text-blue-700">
          <li>• <strong>85-100:</strong> Excelente - No requiere mantenimiento</li>
          <li>• <strong>70-85:</strong> Muy bueno - Mantenimiento preventivo</li>
          <li>• <strong>55-70:</strong> Bueno - Mantenimiento correctivo menor</li>
          <li>• <strong>40-55:</strong> Regular - Mantenimiento correctivo mayor</li>
          <li>• <strong>&lt;40:</strong> Deficiente - Rehabilitación o reconstrucción</li>
        </ul>
      </div>
    </div>
  );
}
