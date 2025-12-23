import { useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAreas,
  getIndicators,
  getIndicatorHistory,
  getIndicatorTargets,
  saveMeasurement,
  updateMeasurement,
  validateMeasurement,
  upsertTarget,
  getFaunaImpacts,
  createFaunaImpact,
  updateFaunaImpact
} from '../lib/supabaseClient.js';
import { formatDate, formatMonth, formatNumber } from '../utils/formatters.js';
import { isFaunaImpactRateIndicator } from '../utils/smsIndicators.js';
import {
  BadgeCheck,
  CheckCircle2,
  Clock,
  Loader2,
  PencilLine,
  PlusCircle,
  ShieldCheck,
  Target,
  Undo2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

const SCENARIOS = [
  { value: 'BAJO', label: 'Escenario bajo' },
  { value: 'MEDIO', label: 'Escenario medio' },
  { value: 'ALTO', label: 'Escenario alto' }
];

const SUBSISTEMA_REQUIRED_CODES = ['SMS-02', 'SMS-03', 'SMS-04'];

const VALIDATION_LABELS = {
  PENDIENTE: 'Pendiente de validación',
  VALIDADO: 'Validado por subdirección',
  RECHAZADO: 'Rechazado por subdirección'
};

function SectionCard({ title, description, icon: Icon, children }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow">
      <div className="flex items-start gap-4">
        <span className="rounded-xl bg-aifa-blue/10 p-3 text-aifa-blue">
          <Icon className="h-6 w-6" />
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          <div className="mt-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

function normalizeId(value) {
  if (!value) return null;
  if (typeof value === 'object') {
    if ('id' in value && value.id) return value.id;
    if ('value' in value && value.value) return value.value;
  }
  return value;
}

function resolveIndicatorAreaIds(indicator) {
  const ids = new Set();
  if (!indicator || typeof indicator !== 'object') return ids;
  const directCandidates = [
    indicator.area_id,
    indicator.areaId,
    indicator.areaID,
    indicator.areaid,
    indicator.area?.id,
    indicator.area?.area_id
  ];
  const parentCandidates = [
    indicator.parent_area_id,
    indicator.parentAreaId,
    indicator.area_parent_id,
    indicator.area?.parent_area_id,
    indicator.subdireccion_id
  ];

  for (const candidate of [...directCandidates, ...parentCandidates]) {
    const normalized = normalizeId(candidate);
    if (normalized) {
      ids.add(String(normalized));
    }
  }

  return ids;
}

function resolveIndicatorAreaName(indicator) {
  if (!indicator || typeof indicator !== 'object') return 'Área no definida';
  return (
    indicator.area_nombre ??
    indicator.areaName ??
    indicator.area?.nombre ??
    indicator.area_descripcion ??
    indicator.area ??
    'Área no definida'
  );
}

function resolveIndicatorUnit(indicator) {
  if (!indicator || typeof indicator !== 'object') return 'No definida';
  return (
    indicator.unidad_medida ??
    indicator.unidad ??
    indicator.unidadMedida ??
    indicator.unidad_de_medida ??
    'No definida'
  );
}

function isSmsIndicator(indicator) {
  if (!indicator || typeof indicator !== 'object') return false;
  const area = resolveIndicatorAreaName(indicator);
  const code =
    indicator.clave ?? indicator.codigo ?? indicator.indicador_clave ?? indicator.indicador ?? indicator.key;
  const normalizedArea = area?.toString().toLowerCase() ?? '';
  const normalizedCode = code?.toString().toUpperCase() ?? '';
  return normalizedArea.includes('sms') || normalizedCode.startsWith('SMS-');
}

function createCompositeCaptureRow() {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : `capture-${Math.random().toString(16).slice(2)}`,
    valor: ''
  };
}

function computeValidationStatus(record) {
  if (!record || typeof record !== 'object') return 'PENDIENTE';
  const rawStatus =
    record.estatus_validacion ??
    record.estado_validacion ??
    record.estatus ??
    (typeof record.validado === 'boolean'
      ? record.validado
        ? 'VALIDADO'
        : 'PENDIENTE'
      : null);

  if (typeof rawStatus === 'string' && rawStatus.trim().length) {
    return rawStatus.trim().toUpperCase();
  }

  if (record.validado_por) {
    return 'VALIDADO';
  }

  return 'PENDIENTE';
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'VALIDADO':
      return 'bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-200';
    case 'RECHAZADO':
      return 'bg-red-100 text-red-700 ring-1 ring-inset ring-red-200';
    default:
      return 'bg-amber-100 text-amber-700 ring-1 ring-inset ring-amber-200';
  }
}

function SubsistemaSelect({ visible, value, onChange }) {
  return (
    <div className={`mt-4 ${visible ? 'block' : 'hidden'}`}>
      <label className="block">
        <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Subsistema</span>
        <select
          value={value ?? ''}
          onChange={event => onChange?.(event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-aifa-blue focus:outline-none focus:ring-2 focus:ring-aifa-blue/30"
        >
          <option value="">Selecciona un subsistema</option>
        </select>
        <p className="mt-1 text-[11px] text-slate-400">
          Este campo aparecerá automáticamente cuando el indicador requiera subsistemas.
        </p>
      </label>
    </div>
  );
}

export default function CapturePage() {
  const { profile } = useAuth();
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedIndicator, setSelectedIndicator] = useState(null);
  const [selectedSubsistema, setSelectedSubsistema] = useState(null);
  const [editingMeasurement, setEditingMeasurement] = useState(null);
  const [validatingMeasurementId, setValidatingMeasurementId] = useState(null);
  const [compositeCaptureEnabled, setCompositeCaptureEnabled] = useState(false);
  const [compositeCaptures, setCompositeCaptures] = useState([createCompositeCaptureRow()]);
  const [compositeAggregation, setCompositeAggregation] = useState('sum');
  const [compositeError, setCompositeError] = useState(null);
  const [localMeasurementError, setLocalMeasurementError] = useState(null);
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const queryClient = useQueryClient();
  const areasQuery = useQuery({ queryKey: ['areas'], queryFn: getAreas });
  const indicatorsQuery = useQuery({ queryKey: ['indicators'], queryFn: getIndicators });

  const roleLabel = (
    profile?.rol_principal ?? profile?.rol ?? profile?.puesto ?? ''
  )
    .toString()
    .toLowerCase();
  const normalizedRoleLabel =
    typeof roleLabel.normalize === 'function'
      ? roleLabel.normalize('nfd').replace(/[\u0300-\u036f]/g, '')
      : roleLabel;
  const isAdmin = normalizedRoleLabel.includes('admin');
  const isSubdirector = /subdirector|director/.test(normalizedRoleLabel);
  const canValidate = isAdmin || isSubdirector;
  const canManageTargets = isAdmin || isSubdirector;

  const allowedAreaIds = useMemo(() => {
    const ids = new Set();
    if (profile?.area_id) ids.add(String(profile.area_id));
    if (profile?.area?.id) ids.add(String(profile.area.id));
    if (profile?.subdireccion_id) ids.add(String(profile.subdireccion_id));
    return ids;
  }, [profile]);

  const availableAreas = useMemo(() => {
    const data = areasQuery.data ?? [];
    if (!data.length) return [];

    const filtered = data.filter(area => {
      const isActive = !area.estado || area.estado?.toString().toUpperCase() === 'ACTIVO';
      const isAllowed = !allowedAreaIds.size || allowedAreaIds.has(String(area.id));
      return isActive && isAllowed;
    });

    return filtered.sort((a, b) => {
      const orderA = a.orden_visualizacion ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.orden_visualizacion ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return (a.nombre ?? '').localeCompare(b.nombre ?? '');
    });
  }, [areasQuery.data, allowedAreaIds]);

  const filteredIndicators = useMemo(() => {
    const data = indicatorsQuery.data ?? [];
    if (!data.length) return [];
    if (isAdmin) return data;
    if (!allowedAreaIds.size) return data;
    return data.filter(indicator => {
      const ids = resolveIndicatorAreaIds(indicator);
      if (!ids.size) return false;
      return Array.from(ids).some(id => allowedAreaIds.has(id));
    });
  }, [indicatorsQuery.data, isAdmin, allowedAreaIds]);

  useEffect(() => {
    if (!availableAreas.length) {
      setSelectedArea(null);
      return;
    }

    const areaExists = selectedArea && availableAreas.some(area => String(area.id) === String(selectedArea));
    if (!areaExists) {
      setSelectedArea(String(availableAreas[0].id));
    }
  }, [availableAreas, selectedArea]);

  const areaFilteredIndicators = useMemo(() => {
    const list = filteredIndicators.filter(indicator => {
      if (!selectedArea) return true;
      const ids = resolveIndicatorAreaIds(indicator);
      return Array.from(ids).some(id => String(id) === String(selectedArea));
    });

    const activeIndicators = list.filter(indicator => {
      const status = indicator.estado ?? indicator.estatus ?? indicator.status ?? null;
      if (!status) return true;
      return status.toString().toUpperCase() === 'ACTIVO';
    });

    return activeIndicators.sort((a, b) => {
      const orderA = a.orden_visualizacion ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.orden_visualizacion ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return (a.nombre ?? '').localeCompare(b.nombre ?? '');
    });
  }, [filteredIndicators, selectedArea]);

  const indicatorsOptions = useMemo(
    () =>
      areaFilteredIndicators.map(item => ({
        value: item.id,
        label: item.nombre,
        area: resolveIndicatorAreaName(item),
        unidad: resolveIndicatorUnit(item),
        clave: item.clave ?? item.indicador_clave ?? null
      })),
    [areaFilteredIndicators]
  );

  useEffect(() => {
    if (!indicatorsOptions.length) {
      setSelectedIndicator(null);
      return;
    }
    if (!selectedIndicator || !indicatorsOptions.some(option => option.value === selectedIndicator)) {
      setSelectedIndicator(indicatorsOptions[0].value);
    }
  }, [indicatorsOptions, selectedIndicator]);

  const historyQuery = useQuery({
    queryKey: ['indicator-history', selectedIndicator, isFaunaCapture],
    queryFn: () =>
      isFaunaCapture
        ? getFaunaImpacts(selectedIndicator)
        : getIndicatorHistory(selectedIndicator, { limit: 12 }),
    enabled: Boolean(selectedIndicator)
  });

  const targetsQuery = useQuery({
    queryKey: ['indicator-targets', selectedIndicator, currentYear],
    queryFn: () => getIndicatorTargets(selectedIndicator, { year: currentYear }),
    enabled: Boolean(selectedIndicator)
  });

  const measurementForm = useForm({
    defaultValues: {
      anio: currentYear,
      mes: currentMonth,
      valor: '',
      escenario: 'REAL',
      total_operaciones: '',
      impactos: ''
    }
  });

  const targetForm = useForm({
    defaultValues: {
      anio: currentYear,
      mes: currentMonth,
      escenario: 'MEDIO',
      valor: ''
    }
  });

  const resetMeasurementForm = useCallback(() => {
    measurementForm.reset({
      anio: currentYear,
      mes: new Date().getMonth() + 1,
      valor: '',
      escenario: 'REAL',
      total_operaciones: '',
      impactos: ''
    });
    setCompositeCaptureEnabled(false);
    setCompositeCaptures([createCompositeCaptureRow()]);
    setCompositeAggregation('sum');
    setCompositeError(null);
    setLocalMeasurementError(null);
  }, [measurementForm, currentYear]);

  const resetTargetForm = useCallback(() => {
    targetForm.reset({
      anio: currentYear,
      mes: new Date().getMonth() + 1,
      escenario: 'MEDIO',
      valor: ''
    });
  }, [targetForm, currentYear]);

  useEffect(() => {
    setEditingMeasurement(null);
    resetMeasurementForm();
    resetTargetForm();
  }, [selectedIndicator, resetMeasurementForm, resetTargetForm]);

  const selectedIndicatorRecord = useMemo(() => {
    return areaFilteredIndicators.find(indicator => String(indicator.id) === String(selectedIndicator)) ?? null;
  }, [areaFilteredIndicators, selectedIndicator]);

  const isSmsCapture = useMemo(() => isSmsIndicator(selectedIndicatorRecord), [selectedIndicatorRecord]);
  const isFaunaCapture = useMemo(
    () => isFaunaImpactRateIndicator(selectedIndicatorRecord),
    [selectedIndicatorRecord]
  );
  const showSubsistemaCombo = useMemo(() => {
    if (!selectedIndicatorRecord) return false;
    if (selectedIndicatorRecord.requiere_subsistema === true) return true;
    const code =
      selectedIndicatorRecord.clave ??
      selectedIndicatorRecord.codigo ??
      selectedIndicatorRecord.indicador_clave ??
      selectedIndicatorRecord.indicador;
    return SUBSISTEMA_REQUIRED_CODES.includes((code ?? '').toString().toUpperCase());
  }, [selectedIndicatorRecord]);

  const compositeNumericValues = useMemo(
    () =>
      compositeCaptures
        .map(item => Number(item.valor))
        .filter(value => Number.isFinite(value)),
    [compositeCaptures]
  );

  const compositeResult = useMemo(() => {
    if (!compositeNumericValues.length) return null;
    const total = compositeNumericValues.reduce((sum, value) => sum + value, 0);
    return compositeAggregation === 'average' ? total / compositeNumericValues.length : total;
  }, [compositeNumericValues, compositeAggregation]);

  useEffect(() => {
    if (!showSubsistemaCombo) {
      setSelectedSubsistema(null);
    }
  }, [showSubsistemaCombo]);

  const watchedTotalOperations = measurementForm.watch('total_operaciones');
  const watchedImpactos = measurementForm.watch('impactos');
  const faunaPreview = useMemo(() => {
    const totalOps = Number(watchedTotalOperations);
    const impactos = Number(watchedImpactos);
    const hasTotals = Number.isFinite(totalOps) && totalOps >= 0;
    const hasImpactos = Number.isFinite(impactos) && impactos >= 0;
    const tasa =
      hasTotals && hasImpactos
        ? totalOps > 0
          ? (impactos / totalOps) * 100
          : 0
        : null;

    return {
      totalOps: hasTotals ? totalOps : null,
      impactos: hasImpactos ? impactos : null,
      tasa
    };
  }, [watchedTotalOperations, watchedImpactos]);

  const faunaCalculatedRate = useMemo(() => {
    if (faunaPreview.tasa !== null && faunaPreview.tasa !== undefined) return faunaPreview.tasa;
    if (editingMeasurement?.tasa !== null && editingMeasurement?.tasa !== undefined) {
      return Number(editingMeasurement.tasa);
    }
    return null;
  }, [faunaPreview.tasa, editingMeasurement]);

  const createMeasurementMutation = useMutation({
    mutationFn: payload => saveMeasurement(payload),
    onSuccess: (_data, variables) => {
      resetMeasurementForm();
      queryClient.invalidateQueries({
        queryKey: ['indicator-history', variables?.indicador_id ?? selectedIndicator, false]
      });
    }
  });

  const updateMeasurementMutation = useMutation({
    mutationFn: ({ id, payload }) => updateMeasurement(id, payload),
    onSuccess: (_data, variables) => {
      setEditingMeasurement(null);
      resetMeasurementForm();
      queryClient.invalidateQueries({
        queryKey: ['indicator-history', variables?.payload?.indicador_id ?? selectedIndicator, false]
      });
    }
  });

  const createFaunaImpactMutation = useMutation({
    mutationFn: payload => createFaunaImpact(payload),
    onSuccess: (_data, variables) => {
      resetMeasurementForm();
      queryClient.invalidateQueries({
        queryKey: ['indicator-history', variables?.indicador_id ?? selectedIndicator, true]
      });
    }
  });

  const updateFaunaImpactMutation = useMutation({
    mutationFn: ({ id, payload }) => updateFaunaImpact(id, payload),
    onSuccess: (_data, variables) => {
      setEditingMeasurement(null);
      resetMeasurementForm();
      queryClient.invalidateQueries({
        queryKey: ['indicator-history', variables?.payload?.indicador_id ?? selectedIndicator, true]
      });
    }
  });

  const validateMeasurementMutation = useMutation({
    mutationFn: ({ id, validado_por }) =>
      validateMeasurement(id, { validado_por: validado_por ?? profile?.id ?? null }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['indicator-history', variables?.indicador_id ?? selectedIndicator, false]
      });
    }
  });

  const targetMutation = useMutation({
    mutationFn: payload => upsertTarget(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['indicator-targets', variables?.indicador_id ?? selectedIndicator, currentYear]
      });
    }
  });

  const handleEditMeasurement = item => {
    setEditingMeasurement(item);
    const baseReset = {
      anio: item.anio ?? currentYear,
      mes: item.mes ?? currentMonth,
      valor: item.valor ?? '',
      escenario: item.escenario ?? 'REAL',
      total_operaciones: item.total_operaciones ?? item.total_ops ?? item.total ?? '',
      impactos: item.impactos ?? item.total_impactos ?? ''
    };
    measurementForm.reset(baseReset);
    setCompositeCaptureEnabled(false);
    setCompositeCaptures([createCompositeCaptureRow()]);
    setCompositeAggregation('sum');
    setCompositeError(null);
    setLocalMeasurementError(null);
  };

  const handleCancelEdit = () => {
    setEditingMeasurement(null);
    resetMeasurementForm();
    setLocalMeasurementError(null);
  };

  const handleValidateMeasurement = item => {
    if (!item?.id || !canValidate) return;
    setValidatingMeasurementId(item.id);
    validateMeasurementMutation.mutate(
      { id: item.id, indicador_id: selectedIndicator, validado_por: profile?.id ?? null },
      {
        onSettled: () => {
          setValidatingMeasurementId(null);
        }
      }
    );
  };

  const onSubmitMeasurement = measurementForm.handleSubmit(values => {
    if (!selectedIndicator) return;
    setLocalMeasurementError(null);
    setCompositeError(null);
    measurementForm.clearErrors('valor');

    if (isFaunaCapture) {
      const year = Number(values.anio);
      const month = Number(values.mes);
      const totalOps = Number(values.total_operaciones);
      const impactos = Number(values.impactos);

      const existingRecord = (historyQuery.data ?? []).find(
        item => Number(item.anio) === year && Number(item.mes) === month
      );

      if (!editingMeasurement && existingRecord) {
        setLocalMeasurementError(
          'Ya existe un registro para este periodo. Se cargó para edición.'
        );
        handleEditMeasurement(existingRecord);
        return;
      }

      const basePayload = {
        indicador_id: selectedIndicator,
        anio: year,
        mes: month,
        total_operaciones: totalOps,
        impactos: impactos
      };

      if (editingMeasurement) {
        updateFaunaImpactMutation.mutate({
          id: editingMeasurement.id,
          payload: {
            ...basePayload,
            editado_por: profile?.id ?? null,
            fecha_ultima_edicion: new Date().toISOString(),
            numero_ediciones: (editingMeasurement.numero_ediciones ?? 0) + 1
          }
        });
        return;
      }

      createFaunaImpactMutation.mutate({
        ...basePayload,
        capturado_por: profile?.id ?? null
      });
      return;
    }

    let derivedValue = Number(values.valor);

    if (isSmsCapture && compositeCaptureEnabled) {
      if (compositeNumericValues.length < 2) {
        setCompositeError('Agrega al menos dos capturas válidas para calcular el indicador compuesto.');
        return;
      }
      const total = compositeNumericValues.reduce((sum, value) => sum + value, 0);
      derivedValue = compositeAggregation === 'average' ? total / compositeNumericValues.length : total;
    }

    const basePayload = {
      indicador_id: selectedIndicator,
      anio: Number(values.anio),
      mes: Number(values.mes),
      valor: derivedValue,
      escenario: values.escenario
    };

    if (editingMeasurement) {
      if (!canValidate) return;
      updateMeasurementMutation.mutate({
        id: editingMeasurement.id,
        payload: {
          ...basePayload,
          editado_por: profile?.id ?? null,
          estatus_validacion: 'PENDIENTE',
          validado_por: null,
          fecha_validacion: null
        }
      });
      return;
    }

    createMeasurementMutation.mutate({
      ...basePayload,
      capturado_por: profile?.id ?? null,
      estatus_validacion: 'PENDIENTE'
    });
  });

  const onSubmitTarget = targetForm.handleSubmit(values => {
    if (!selectedIndicator || !canManageTargets) return;
    const year = Number(values.anio);
    const month = Number(values.mes);
    const scenario = values.escenario;
    const existing = (targetsQuery.data ?? []).find(target => {
      return (
        Number(target.anio) === year &&
        Number(target.mes) === month &&
        (target.escenario ?? '').toString().toUpperCase() === scenario
      );
    });

    const payload = {
      indicador_id: selectedIndicator,
      anio: year,
      mes: month,
      escenario: scenario,
      valor: Number(values.valor)
    };

    if (existing?.id) {
      payload.id = existing.id;
      payload.editado_por = profile?.id ?? null;
    } else {
      payload.capturado_por = profile?.id ?? null;
    }

    targetMutation.mutate(payload);
  });

  const measurementIsSubmitting =
    createMeasurementMutation.isPending ||
    updateMeasurementMutation.isPending ||
    createFaunaImpactMutation.isPending ||
    updateFaunaImpactMutation.isPending;
  const measurementMutationError =
    createMeasurementMutation.error ??
    updateMeasurementMutation.error ??
    createFaunaImpactMutation.error ??
    updateFaunaImpactMutation.error;
  const measurementError = localMeasurementError ?? measurementMutationError;
  const measurementSuccessMessage = useMemo(() => {
    if (createFaunaImpactMutation.isSuccess) {
      return 'Impacto de fauna registrado correctamente.';
    }
    if (updateFaunaImpactMutation.isSuccess) {
      return 'Impacto de fauna actualizado correctamente.';
    }
    if (createMeasurementMutation.isSuccess) {
      return 'Medición registrada correctamente y enviada a validación.';
    }
    if (updateMeasurementMutation.isSuccess) {
      return 'Medición actualizada; se requiere una nueva validación.';
    }
    return null;
  }, [
    createMeasurementMutation.isSuccess,
    updateMeasurementMutation.isSuccess,
    createFaunaImpactMutation.isSuccess,
    updateFaunaImpactMutation.isSuccess
  ]);

  const validationError = validateMeasurementMutation.error;
  const validationSuccessMessage = validateMeasurementMutation.isSuccess
    ? 'Medición validada correctamente.'
    : null;

  const targetError = targetMutation.error;
  const targetSuccessMessage = targetMutation.isSuccess ? 'Meta registrada correctamente.' : null;

  const indicatorsLoading = indicatorsQuery.isLoading;
  const indicatorsError = indicatorsQuery.isError;
  const noIndicatorsAssigned = indicatorsQuery.isSuccess && !indicatorsOptions.length;

  const assignedAreaName =
    profile?.area?.nombre ??
    profile?.area_nombre ??
    (profile?.area_id ? `Área ${profile.area_id}` : null);

  const historyData = historyQuery.data ?? [];
  const targetsData = targetsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Captura de indicadores</h1>
          <p className="text-sm text-slate-500">
            Actualice mediciones reales y metas estratégicas para mantener el panel de directivos siempre vigente.
          </p>
          {assignedAreaName && (
            <p className="text-xs text-slate-400">Área asignada: {assignedAreaName}</p>
          )}
        </div>
      </header>

      {indicatorsLoading && (
        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando indicadores disponibles...
          </div>
        </section>
      )}

      {indicatorsError && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow">
          No fue posible obtener los indicadores configurados para el sistema.
        </section>
      )}

      {!indicatorsLoading && !indicatorsError && (
        <section className="rounded-2xl bg-white p-6 shadow">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Área</span>
              <select
                value={selectedArea ?? ''}
                onChange={event => setSelectedArea(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-aifa-blue focus:outline-none focus:ring-2 focus:ring-aifa-blue/30"
                disabled={!availableAreas.length}
              >
                {availableAreas.map(area => (
                  <option key={area.id} value={area.id}>
                    {area.nombre} {area.clave ? `— ${area.clave}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">Indicador</span>
              <select
                value={selectedIndicator ?? ''}
                onChange={event => setSelectedIndicator(event.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-aifa-blue focus:outline-none focus:ring-2 focus:ring-aifa-blue/30"
                disabled={!indicatorsOptions.length}
              >
                {indicatorsOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label} — {option.area}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <SubsistemaSelect
            visible={showSubsistemaCombo}
            value={selectedSubsistema}
            onChange={setSelectedSubsistema}
          />

          {selectedIndicator && (
            <p className="mt-2 text-xs text-slate-500">
              Unidad de medida:{' '}
              <span className="font-semibold text-slate-700">
                {indicatorsOptions.find(option => option.value === selectedIndicator)?.unidad ?? 'No definida'}
              </span>
            </p>
          )}
          {noIndicatorsAssigned && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              No cuentas con indicadores asignados para captura en tu área. Solicita apoyo a tu administrador.
            </div>
          )}
        </section>
      )}

      {!selectedIndicator && !indicatorsLoading && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-700 shadow">
          Selecciona un indicador para comenzar la captura. Si no tienes permisos, contacta al administrador del sistema.
        </section>
      )}

      {selectedIndicator && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <SectionCard
              title={editingMeasurement ? 'Editar medición' : 'Registrar medición'}
              description={
                editingMeasurement
                  ? 'Actualiza el valor registrado. Una vez guardado, la medición deberá ser validada nuevamente.'
                  : 'Capture el valor real observado para el periodo seleccionado. La medición quedará pendiente de validación.'
              }
              icon={PlusCircle}
            >
              <form onSubmit={onSubmitMeasurement} className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  Año
                  <input
                    type="number"
                    min="2000"
                    max="2100"
                    {...measurementForm.register('anio', { required: true, valueAsNumber: true })}
                    className="rounded-lg border border-slate-200 px-3 py-2 shadow-sm focus:border-aifa-blue focus:outline-none focus:ring-2 focus:ring-aifa-blue/30"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Mes
                  <select
                    {...measurementForm.register('mes', { required: true, valueAsNumber: true })}
                    className="rounded-lg border border-slate-200 px-3 py-2 shadow-sm focus:border-aifa-blue focus:outline-none focus:ring-2 focus:ring-aifa-blue/30"
                  >
                    {Array.from({ length: 12 }, (_, index) => index + 1).map(month => (
                      <option key={month} value={month}>
                        {formatMonth(currentYear, month)}
                      </option>
                    ))}
                  </select>
                </label>
                {!isFaunaCapture && (
                  <label className="flex flex-col gap-1 text-sm">
                    Escenario
                    <select
                      {...measurementForm.register('escenario', { required: !isFaunaCapture })}
                      className="rounded-lg border border-slate-200 px-3 py-2 shadow-sm focus:border-aifa-blue focus:outline-none focus:ring-2 focus:ring-aifa-blue/30"
                    >
                      <option value="REAL">Valor real</option>
                      {SCENARIOS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {isFaunaCapture ? (
                  <>
                    <label className="flex flex-col gap-1 text-sm">
                      Total de operaciones
                      <input
                        type="number"
                        min="0"
                        step="1"
                        {...measurementForm.register('total_operaciones', { required: true, min: 0, valueAsNumber: true })}
                        className="rounded-lg border border-slate-200 px-3 py-2 shadow-sm focus:border-aifa-blue focus:outline-none focus:ring-2 focus:ring-aifa-blue/30"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      Impactos
                      <input
                        type="number"
                        min="0"
                        step="1"
                        {...measurementForm.register('impactos', { required: true, min: 0, valueAsNumber: true })}
                        className="rounded-lg border border-slate-200 px-3 py-2 shadow-sm focus:border-aifa-blue focus:outline-none focus:ring-2 focus:ring-aifa-blue/30"
                      />
                    </label>
                  </>
                ) : (
                  <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                    <div className="flex items-center gap-2">
                      <span>Valor</span>
                      {isSmsCapture && (
                        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                          Indicador SMS
                        </span>
                      )}
                    </div>
                    {!isSmsCapture || !compositeCaptureEnabled ? (
                      <input
                        type="number"
                        step="0.0001"
                        {...measurementForm.register('valor', { required: !compositeCaptureEnabled, min: 0 })}
                        className="rounded-lg border border-slate-200 px-3 py-2 shadow-sm focus:border-aifa-blue focus:outline-none focus:ring-2 focus:ring-aifa-blue/30"
                        disabled={isSmsCapture && compositeCaptureEnabled}
                      />
                    ) : null}
                    {isSmsCapture && (
                      <div className="mt-2 space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <label className="flex items-start gap-2 text-sm font-medium text-slate-700">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-aifa-blue focus:ring-aifa-blue"
                            checked={compositeCaptureEnabled}
                            onChange={event => {
                              setCompositeCaptureEnabled(event.target.checked);
                              setCompositeError(null);
                            }}
                          />
                          <div>
                            Usar captura compuesta
                            <p className="text-xs font-normal text-slate-500">
                              Activa esta opción cuando el indicador se calcula a partir de dos o más capturas en el mismo periodo.
                            </p>
                          </div>
                        </label>

                        {compositeCaptureEnabled && (
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-3">
                              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                Cómo combinar los valores
                              </span>
                              <div className="inline-flex rounded-lg border border-slate-200 bg-white shadow-sm" role="group">
                                <button
                                  type="button"
                                  className={`px-3 py-1.5 text-xs font-semibold transition first:rounded-l-lg last:rounded-r-lg ${
                                    compositeAggregation === 'sum'
                                      ? 'bg-aifa-blue text-white shadow'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                  onClick={() => setCompositeAggregation('sum')}
                                >
                                  Sumar capturas
                                </button>
                                <button
                                  type="button"
                                  className={`px-3 py-1.5 text-xs font-semibold transition first:rounded-l-lg last:rounded-r-lg ${
                                    compositeAggregation === 'average'
                                      ? 'bg-aifa-blue text-white shadow'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                  onClick={() => setCompositeAggregation('average')}
                                >
                                  Promediar capturas
                                </button>
                              </div>
                            </div>

                            <div className="space-y-2">
                              {compositeCaptures.map((capture, index) => (
                                <div key={capture.id} className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <label className="flex flex-col gap-1 text-xs text-slate-500">
                                      Captura {index + 1}
                                      <input
                                        type="number"
                                        step="0.0001"
                                        value={capture.valor}
                                        onChange={event =>
                                          setCompositeCaptures(prev =>
                                            prev.map(item =>
                                              item.id === capture.id ? { ...item, valor: event.target.value } : item
                                            )
                                          )
                                        }
                                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm shadow-sm focus:border-aifa-blue focus:outline-none focus:ring-2 focus:ring-aifa-blue/30"
                                      />
                                    </label>
                                  </div>
                                  {compositeCaptures.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setCompositeCaptures(prev =>
                                          prev.filter(item => item.id !== capture.id || prev.length === 1)
                                        )
                                      }
                                      className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm transition hover:border-rose-200 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-200/60"
                                      aria-label={`Eliminar captura ${index + 1}`}
                                    >
                                      Eliminar
                                    </button>
                                  )}
                                </div>
                              ))}

                              <div className="flex flex-wrap items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() => setCompositeCaptures(prev => [...prev, createCompositeCaptureRow()])}
                                  className="inline-flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-aifa-blue hover:text-aifa-blue focus:outline-none focus:ring-2 focus:ring-aifa-blue/30"
                                >
                                  <PlusCircle className="h-3.5 w-3.5" />
                                  Agregar otra captura
                                </button>
                                <p className="text-xs text-slate-500">
                                  Registra al menos dos valores para generar el indicador.
                                </p>
                              </div>
                            </div>

                            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                  Resultado calculado
                                </span>
                                <span className="text-lg font-bold text-slate-900">
                                  {compositeResult !== null ? formatNumber(compositeResult) : '—'}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">
                                Se aplicará automáticamente al guardar la medición.
                              </p>
                              {compositeError && <p className="mt-1 text-xs text-rose-600">{compositeError}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </label>
                )}
                {isFaunaCapture && (
                  <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Resultado (solo lectura)</p>
                        <p className="text-sm text-slate-600">La tasa se calcula automáticamente al guardar.</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Tasa preliminar</p>
                        <p className="text-xl font-bold text-slate-900">
                          {faunaCalculatedRate !== null ? `${faunaCalculatedRate.toFixed(4)}%` : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Total de operaciones</p>
                        <p className="text-base font-semibold text-slate-800">
                          {faunaPreview.totalOps !== null ? formatNumber(faunaPreview.totalOps) : '—'}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Impactos</p>
                        <p className="text-base font-semibold text-slate-800">
                          {faunaPreview.impactos !== null ? formatNumber(faunaPreview.impactos) : '—'}
                        </p>
                      </div>
                      <div className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm">
                        <p className="text-[11px] uppercase tracking-wide text-slate-500">Estatus de validación</p>
                        <p className="text-base font-semibold text-slate-800">
                          {editingMeasurement?.estatus_validacion ?? 'PENDIENTE'}
                        </p>
                      </div>
                    </div>
                    {faunaPreview.totalOps === 0 && (
                      <p className="mt-2 text-xs text-amber-600">
                        Con 0 operaciones, la tasa se guardará como 0 (el cálculo definitivo se realiza en base de datos).
                      </p>
                    )}
                  </div>
                )}
                <div className="flex flex-col gap-3 sm:col-span-2">
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="submit"
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-aifa-blue px-4 py-2 text-sm font-semibold text-white shadow hover:bg-aifa-light focus:outline-none focus:ring-2 focus:ring-aifa-blue/30 disabled:cursor-not-allowed disabled:opacity-70"
                      disabled={measurementIsSubmitting}
                    >
                      {measurementIsSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4" />
                      )}
                      {editingMeasurement ? 'Actualizar medición' : 'Guardar medición'}
                    </button>
                    {editingMeasurement && (
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm hover:border-aifa-blue hover:text-aifa-blue focus:outline-none focus:ring-2 focus:ring-aifa-blue/30"
                        disabled={measurementIsSubmitting}
                      >
                        <Undo2 className="h-4 w-4" /> Cancelar edición
                      </button>
                    )}
                  </div>
                  {measurementError && (
                    <p className="text-xs text-red-500">
                      No fue posible guardar la medición: {measurementError.message ?? measurementError.toString()}
                    </p>
                  )}
                  {measurementSuccessMessage && (
                    <p className="text-xs text-emerald-600">{measurementSuccessMessage}</p>
                  )}
                </div>
              </form>
            </SectionCard>

            <SectionCard
              title="Actualizar meta"
              description={
                canManageTargets
                  ? 'Registre la meta del indicador para el periodo seleccionado en el escenario deseado.'
                  : 'Solo el subdirector del área o un administrador pueden actualizar las metas por escenario.'
              }
              icon={Target}
            >
              <form onSubmit={onSubmitTarget} className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  Año
                  <input
                    type="number"
                    min="2020"
                    max="2100"
                    {...targetForm.register('anio', { required: true })}
                    className="rounded-lg border border-slate-200 px-3 py-2 shadow-sm focus:border-aifa-blue focus:outline-none focus:ring-2 focus:ring-aifa-blue/30"
                    disabled={!canManageTargets}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Mes
                  <select
                    {...targetForm.register('mes', { required: true })}
                    className="rounded-lg border border-slate-200 px-3 py-2 shadow-sm focus:border-aifa-blue focus:outline-none focus:ring-2 focus:ring-aifa-blue/30"
                    disabled={!canManageTargets}
                  >
                    {Array.from({ length: 12 }, (_, index) => index + 1).map(month => (
                      <option key={month} value={month}>
                        {formatMonth(currentYear, month)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  Escenario
                  <select
                    {...targetForm.register('escenario', { required: true })}
                    className="rounded-lg border border-slate-200 px-3 py-2 shadow-sm focus:border-aifa-blue focus:outline-none focus:ring-2 focus:ring-aifa-blue/30"
                    disabled={!canManageTargets}
                  >
                    {SCENARIOS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-sm sm:col-span-2">
                  Valor meta
                  <input
                    type="number"
                    step="0.0001"
                    {...targetForm.register('valor', { required: true, min: 0 })}
                    className="rounded-lg border border-slate-200 px-3 py-2 shadow-sm focus:border-aifa-blue focus:outline-none focus:ring-2 focus:ring-aifa-blue/30"
                    disabled={!canManageTargets}
                  />
                </label>
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-aifa-green px-4 py-2 text-sm font-semibold text-white shadow hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-aifa-green/30 disabled:cursor-not-allowed disabled:opacity-70"
                    disabled={targetMutation.isPending || !canManageTargets}
                  >
                    {targetMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <BadgeCheck className="h-4 w-4" />
                    )}
                    Guardar meta
                  </button>
                  {!canManageTargets && (
                    <p className="text-xs text-slate-500">
                      Solo los subdirectores de área y administradores pueden editar metas por escenario.
                    </p>
                  )}
                  {targetError && (
                    <p className="text-xs text-red-500">
                      No fue posible guardar la meta: {targetError.message ?? targetError.toString()}
                    </p>
                  )}
                  {targetSuccessMessage && (
                    <p className="text-xs text-emerald-600">{targetSuccessMessage}</p>
                  )}
                </div>
              </form>
            </SectionCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <section className="rounded-2xl bg-white p-6 shadow">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Mediciones recientes</h3>
                {validationSuccessMessage && (
                  <span className="text-xs font-semibold text-emerald-600">{validationSuccessMessage}</span>
                )}
              </div>
              {validationError && (
                <p className="mt-2 text-xs text-red-500">
                  No fue posible validar la medición: {validationError.message ?? validationError.toString()}
                </p>
              )}
              {historyQuery.isError && (
                <p className="mt-2 text-xs text-red-500">No fue posible cargar el histórico de mediciones.</p>
              )}
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
                {historyQuery.isLoading ? (
                  <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Consultando mediciones...
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                      {isFaunaCapture ? (
                        <tr>
                          <th className="px-4 py-2 text-left">Periodo</th>
                          <th className="px-4 py-2 text-right">Operaciones</th>
                          <th className="px-4 py-2 text-right">Impactos</th>
                          <th className="px-4 py-2 text-right">Tasa</th>
                          <th className="px-4 py-2 text-left">Estado</th>
                          <th className="px-4 py-2 text-left">Acciones</th>
                        </tr>
                      ) : (
                        <tr>
                          <th className="px-4 py-2 text-left">Periodo</th>
                          <th className="px-4 py-2 text-left">Escenario</th>
                          <th className="px-4 py-2 text-right">Valor</th>
                          <th className="px-4 py-2 text-left">Estado</th>
                          {canValidate && <th className="px-4 py-2 text-left">Acciones</th>}
                        </tr>
                      )}
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {historyData.map(item => {
                        const status = computeValidationStatus(item);
                        const statusLabel = VALIDATION_LABELS[status] ?? status;
                        const isValidated = status === 'VALIDADO';

                        if (isFaunaCapture) {
                          const totalOps = item.total_operaciones ?? item.total_ops ?? item.total ?? 0;
                          const impactos = item.impactos ?? item.total_impactos ?? 0;
                          return (
                            <tr
                              key={item.id ?? `${item.anio}-${item.mes}`}
                              className={`transition hover:bg-slate-50/80 ${
                                editingMeasurement?.id === item.id ? 'bg-slate-50' : ''
                              }`}
                            >
                              <td className="px-4 py-2 text-slate-600">{formatMonth(item.anio, item.mes ?? 1)}</td>
                              <td className="px-4 py-2 text-right font-medium text-slate-800">
                                {formatNumber(totalOps)}
                              </td>
                              <td className="px-4 py-2 text-right font-medium text-slate-800">
                                {formatNumber(impactos)}
                              </td>
                              <td className="px-4 py-2 text-right font-medium text-slate-800">
                                {item.tasa !== null && item.tasa !== undefined ? `${Number(item.tasa).toFixed(4)}%` : '—'}
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex flex-col gap-1">
                                  <span
                                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${getStatusBadgeClass(
                                      status
                                    )}`}
                                  >
                                    {isValidated ? (
                                      <BadgeCheck className="h-3.5 w-3.5" />
                                    ) : (
                                      <Clock className="h-3.5 w-3.5" />
                                    )}
                                    {statusLabel}
                                  </span>
                                  <p className="text-xs text-slate-400">
                                    {isValidated && item.fecha_validacion
                                      ? `Validado el ${formatDate(item.fecha_validacion)}`
                                      : `Actualizado el ${formatDate(item.fecha_actualizacion ?? item.fecha_captura)}`}
                                  </p>
                                </div>
                              </td>
                              <td className="px-4 py-2">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditMeasurement(item)}
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-aifa-blue hover:text-aifa-blue focus:outline-none focus:ring-2 focus:ring-aifa-blue/30 disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={
                                      measurementIsSubmitting ||
                                      (editingMeasurement?.id === item.id && updateFaunaImpactMutation.isPending)
                                    }
                                  >
                                    <PencilLine className="h-3.5 w-3.5" /> Editar
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr
                            key={item.id ?? `${item.anio}-${item.mes}-${item.escenario ?? 'REAL'}`}
                            className={`transition hover:bg-slate-50/80 ${
                              editingMeasurement?.id === item.id ? 'bg-slate-50' : ''
                            }`}
                          >
                            <td className="px-4 py-2 text-slate-600">{formatMonth(item.anio, item.mes ?? 1)}</td>
                            <td className="px-4 py-2 text-slate-500">{item.escenario ?? 'REAL'}</td>
                            <td className="px-4 py-2 text-right font-medium text-slate-800">{formatNumber(item.valor)}</td>
                            <td className="px-4 py-2">
                              <div className="flex flex-col gap-1">
                                <span
                                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold ${getStatusBadgeClass(
                                    status
                                  )}`}
                                >
                                  {isValidated ? (
                                    <BadgeCheck className="h-3.5 w-3.5" />
                                  ) : (
                                    <Clock className="h-3.5 w-3.5" />
                                  )}
                                  {statusLabel}
                                </span>
                                <p className="text-xs text-slate-400">
                                  {isValidated && item.fecha_validacion
                                    ? `Validado el ${formatDate(item.fecha_validacion)}`
                                    : `Actualizado el ${formatDate(item.fecha_actualizacion ?? item.fecha_captura)}`}
                                </p>
                                {item.capturado_por && (
                                  <p className="text-[11px] text-slate-300">Capturado por: {item.capturado_por}</p>
                                )}
                                {item.editado_por && !isValidated && (
                                  <p className="text-[11px] text-slate-300">Última edición por: {item.editado_por}</p>
                                )}
                              </div>
                            </td>
                            {canValidate && (
                              <td className="px-4 py-2">
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleEditMeasurement(item)}
                                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-aifa-blue hover:text-aifa-blue focus:outline-none focus:ring-2 focus:ring-aifa-blue/30 disabled:cursor-not-allowed disabled:opacity-60"
                                    disabled={
                                      measurementIsSubmitting ||
                                      (editingMeasurement?.id === item.id && updateMeasurementMutation.isPending)
                                    }
                                  >
                                    <PencilLine className="h-3.5 w-3.5" /> Editar
                                  </button>
                                  {!isValidated && (
                                    <button
                                      type="button"
                                      onClick={() => handleValidateMeasurement(item)}
                                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-400 hover:text-emerald-800 focus:outline-none focus:ring-2 focus:ring-emerald-200/60 disabled:cursor-not-allowed disabled:opacity-60"
                                      disabled={validateMeasurementMutation.isPending}
                                    >
                                      {validateMeasurementMutation.isPending && validatingMeasurementId === item.id ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <ShieldCheck className="h-3.5 w-3.5" />
                                      )}
                                      Validar
                                    </button>
                                  )}
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                      {!historyData.length && !historyQuery.isLoading && (
                        <tr>
                          <td
                            colSpan={isFaunaCapture ? 6 : canValidate ? 5 : 4}
                            className="px-4 py-6 text-center text-slate-400"
                          >
                            Sin mediciones registradas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Metas del año</h3>
              {targetsQuery.isError && (
                <p className="mt-2 text-xs text-red-500">No fue posible consultar las metas registradas.</p>
              )}
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
                {targetsQuery.isLoading ? (
                  <div className="flex items-center gap-2 px-4 py-6 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" /> Cargando metas...
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-widest text-slate-500">
                      <tr>
                        <th className="px-4 py-2 text-left">Periodo</th>
                        <th className="px-4 py-2 text-left">Escenario</th>
                        <th className="px-4 py-2 text-right">Meta</th>
                        <th className="px-4 py-2 text-left">Actualización</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {targetsData.map(item => (
                        <tr key={item.id ?? `${item.anio}-${item.mes}-${item.escenario}`} className="hover:bg-slate-50/80">
                          <td className="px-4 py-2 text-slate-600">{formatMonth(item.anio, item.mes)}</td>
                          <td className="px-4 py-2 text-slate-500">{item.escenario}</td>
                          <td className="px-4 py-2 text-right font-medium text-slate-800">{formatNumber(item.valor)}</td>
                          <td className="px-4 py-2 text-slate-500">
                            <p className="text-xs text-slate-500">
                              {formatDate(item.fecha_actualizacion ?? item.fecha_captura)}
                            </p>
                            {item.editado_por ? (
                              <p className="text-[11px] text-slate-300">Editado por: {item.editado_por}</p>
                            ) : (
                              item.capturado_por && (
                                <p className="text-[11px] text-slate-300">Capturado por: {item.capturado_por}</p>
                              )
                            )}
                          </td>
                        </tr>
                      ))}
                      {!targetsData.length && !targetsQuery.isLoading && (
                        <tr>
                          <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                            No hay metas registradas para este año.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
