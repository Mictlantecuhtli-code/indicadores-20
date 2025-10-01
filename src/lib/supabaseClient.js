import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://kxjldzcaeayguiqkqqyh.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt4amxkemNhZWF5Z3VpcWtxcXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY3NTQ5ODksImV4cCI6MjA3MjMzMDk4OX0.7c0s4zFimF4TH5_jyJbeTRUuxhGaSvVsCnamwxuKgbw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
});

function isRelationNotFound(error) {
  return error?.code === '42P01' || /relation .+ does not exist/i.test(error?.message ?? '');
}

function isFunctionNotFound(error) {
  return error?.code === '42883' || /function .+ does not exist/i.test(error?.message ?? '');
}

function normalizeStatus(value) {
  const text = value?.toString().toLowerCase() ?? '';
  return typeof text.normalize === 'function'
    ? text.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    : text;
}

function normalizeMeasurement(record) {
  if (!record) return record;
  const status =
    record.estatus_validacion ??
    record.estado_validacion ??
    record.estatus ??
    (typeof record.validado === 'boolean'
      ? record.validado
        ? 'VALIDADO'
        : 'PENDIENTE'
      : null);

  return {
    ...record,
    escenario: record.escenario ? record.escenario.toUpperCase() : null,
    estatus_validacion: typeof status === 'string' ? status.toUpperCase() : status ?? 'PENDIENTE',
    fecha_captura: record.fecha_captura ?? record.creado_en ?? null,
    fecha_actualizacion:
      record.fecha_actualizacion ?? record.fecha_ultima_edicion ?? record.actualizado_en ?? null,
    fecha_validacion: record.fecha_validacion ?? record.validado_en ?? null,
    validado_por: record.validado_por ?? record.subdirector_id ?? null,
    observaciones_validacion:
      record.observaciones_validacion ?? record.validacion_observaciones ?? null,
    capturado_por: record.capturado_por ?? record.creado_por ?? null,
    editado_por: record.editado_por ?? record.actualizado_por ?? null
  };
}

function normalizeTarget(record) {
  if (!record) return record;
  return {
    ...record,
    escenario: record.escenario ? record.escenario.toUpperCase() : null,
    fecha_captura: record.fecha_captura ?? record.creado_en ?? null,
    fecha_actualizacion:
      record.fecha_actualizacion ?? record.fecha_ultima_edicion ?? record.actualizado_en ?? null,
    capturado_por: record.capturado_por ?? record.creado_por ?? null,
    editado_por: record.editado_por ?? record.actualizado_por ?? null
  };
}

function sanitizeScenario(payload) {
  if (!payload) return payload;
  if ('escenario' in payload && payload.escenario) {
    return { ...payload, escenario: payload.escenario.toUpperCase() };
  }
  if ('escenario' in payload) {
    return { ...payload, escenario: null };
  }
  return payload;
}

export async function getDashboardSummary() {
  const relations = [
    'v_dashboard_resumen',
    'v_dashboard_resumen_v2',
    'vw_dashboard_resumen',
    'vw_dashboard_resumen_v2',
    'dashboard_resumen',
    'dashboard_resumen_view',
    'dashboard_resumen_vista',
    'dashboard_resumen_general',
    'resumen_dashboard',
    'vista_dashboard_resumen',
    'vista_dashboard_resumen_v2'
  ];

  for (const relation of relations) {
    const { data, error } = await supabase.from(relation).select('*');

    if (!error) {
      return data ?? [];
    }

    if (!isRelationNotFound(error)) {
      throw error;
    }
  }

  return [];
}

export async function getDirectorsHighlights() {
  const highlightRelations = [
    'v_indicadores_criticos',
    'v_indicadores_prioritarios',
    'vw_indicadores_criticos',
    'vw_indicadores_prioritarios',
    'vw_indicadores_alertas',
    'vw_indicadores_alerta',
    'indicadores_criticos',
    'indicadores_prioritarios',
    'indicadores_alertas',
    'indicadores_directivos_resumen',
    'resumen_indicadores_directivos',
    'resumen_indicadores_prioritarios',
    'vista_indicadores_criticos',
    'vista_indicadores_prioritarios'
  ];

  for (const relation of highlightRelations) {
    const { data, error } = await supabase.from(relation).select('*');

    if (!error) {
      return data ?? [];
    }

    if (!isRelationNotFound(error)) {
      throw error;
    }
  }

  const indicatorRelations = [
    'v_indicadores_area',
    'v_indicadores',
    'vw_indicadores_area',
    'vw_indicadores_detalle',
    'vw_indicadores',
    'indicadores_area',
    'indicadores',
    'vista_indicadores_area',
    'vista_indicadores'
  ];

  for (const relation of indicatorRelations) {
    const { data: indicators, error } = await supabase.from(relation).select('*');

    if (error) {
      if (isRelationNotFound(error)) {
        continue;
      }
      throw error;
    }

    if (indicators?.length) {
      const criticalIndicators = indicators.filter(record => {
        if (record == null || typeof record !== 'object') return false;
        if ('es_critico' in record) return Boolean(record.es_critico);
        if ('es_alerta' in record) return Boolean(record.es_alerta);
        if ('critico' in record) return Boolean(record.critico);
        if ('alerta' in record) return Boolean(record.alerta);
        const status =
          record.nivel_alerta ??
          record.estatus ??
          record.estado ??
          record.estatus_alerta ??
          record.color_alerta ??
          '';
        return ['critico', 'alerta', 'rojo'].includes(normalizeStatus(status));
      });

      if (criticalIndicators.length) {
        return criticalIndicators.map(item => ({
          ...item,
          valor_actual: item.valor_actual ?? item.ultima_medicion_valor ?? item.valor ?? null,
          meta: item.meta ?? item.valor_meta ?? item.meta_actual ?? null,
          actualizado_en: item.actualizado_en ?? item.fecha_actualizacion ?? item.ultima_medicion_fecha ?? null,
          area: item.area ?? item.area_nombre ?? null
        }));
      }
    }
  }

  const { data, error } = await supabase.rpc('kpi_resumen_directivos');
  if (error) {
    if (isFunctionNotFound(error)) return [];
    throw error;
  }
  return data ?? [];
}

export async function getIndicators() {
  const relations = [
    'v_indicadores_area',
    'v_indicadores',
    'vw_indicadores_area',
    'vw_indicadores_detalle',
    'vw_indicadores',
    'indicadores_area',
    'indicadores',
    'vista_indicadores_area',
    'vista_indicadores'
  ];

  for (const relation of relations) {
    const { data, error } = await supabase
      .from(relation)
      .select('*')
      .order('area_nombre', { ascending: true })
      .order('nombre', { ascending: true });

    if (!error) {
      return data ?? [];
    }

    if (!isRelationNotFound(error)) {
      throw error;
    }
  }

  return [];
}

export async function getAreas() {
  const { data, error } = await supabase
    .from('areas')
    .select('id,nombre,clave,color_hex,parent_area_id')
    .order('nombre', { ascending: true });

  if (error) {
    if (isRelationNotFound(error)) {
      return [];
    }
    throw error;
  }

  return data ?? [];
}

export async function getIndicatorHistory(indicadorId, { limit = 24 } = {}) {
  if (!indicadorId) return [];
  const relations = [
    'v_mediciones_historico',
    'v_mediciones_historico_v2',
    'mediciones_historico',
    'mediciones_historico_view',
    'vista_mediciones_historico',
    'vw_mediciones_historico',
    'mediciones'
  ];

  for (const relation of relations) {
    const { data, error } = await supabase
      .from(relation)
      .select('*')
      .eq('indicador_id', indicadorId)
      .order('anio', { ascending: true })
      .order('mes', { ascending: true })
      .limit(limit);

    if (!error) {
      return (data ?? []).map(normalizeMeasurement);
    }

    if (!isRelationNotFound(error)) {
      throw error;
    }
  }

  return [];
}

export async function getIndicatorTargets(indicadorId, { year } = {}) {
  if (!indicadorId) return [];
  let query = supabase
    .from('indicador_metas')
    .select('*')
    .eq('indicador_id', indicadorId)
    .order('anio', { ascending: true })
    .order('mes', { ascending: true });

  if (year) {
    query = query.eq('anio', year);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(normalizeTarget);
}

export async function saveMeasurement(payload) {
  const sanitized = sanitizeScenario(payload ? { ...payload } : payload);
  if (sanitized && !('estatus_validacion' in sanitized)) {
    sanitized.estatus_validacion = 'PENDIENTE';
  }
  if (sanitized && typeof sanitized.estatus_validacion === 'string') {
    sanitized.estatus_validacion = sanitized.estatus_validacion.toUpperCase();
  }
  const { data, error } = await supabase.from('mediciones').insert(sanitized).select().single();
  if (error) throw error;
  return normalizeMeasurement(data);
}

export async function updateMeasurement(id, payload) {
  const sanitized = sanitizeScenario(payload ? { ...payload } : payload);
  if (sanitized && typeof sanitized.estatus_validacion === 'string') {
    sanitized.estatus_validacion = sanitized.estatus_validacion.toUpperCase();
  }
  const { data, error } = await supabase
    .from('mediciones')
    .update(sanitized)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return normalizeMeasurement(data);
}

export async function validateMeasurement(id, { validado_por, observaciones = null } = {}) {
  if (!id) throw new Error('Se requiere un identificador de medición para validar.');
  const payload = {
    estatus_validacion: 'VALIDADO',
    validado_por: validado_por ?? null,
    fecha_validacion: new Date().toISOString()
  };
  if (observaciones !== undefined) {
    payload.observaciones_validacion = observaciones;
  }
  return updateMeasurement(id, payload);
}

export async function upsertTarget(payload) {
  const sanitized = sanitizeScenario(payload);
  const { data, error } = await supabase
    .from('indicador_metas')
    .upsert(sanitized, { onConflict: 'indicador_id,anio,mes,escenario' })
    .select()
    .single();
  if (error) throw error;
  return normalizeTarget(data);
}

function normalizeUser(record) {
  if (!record) return null;
  const email = record.email ?? record.correo ?? record.usuario?.email ?? record.usuario_email ?? null;
  const lastAccess =
    record.ultimo_acceso ?? record.ultima_conexion ?? record.ultimo_login ?? record.actualizado_en ?? null;
  return {
    id:
      record.id ??
      record.usuario_id ??
      email ??
      record.nombre_completo ??
      record.nombre ??
      `usuario-${Math.random().toString(36).slice(2)}`,
    nombre: record.nombre_completo ?? record.nombre ?? record.full_name ?? 'Sin nombre',
    puesto: record.puesto ?? record.cargo ?? null,
    rol: record.rol ?? record.perfil ?? record.tipo ?? null,
    email: email ?? '—',
    direccion: record.direccion ?? record.area ?? record.area_nombre ?? record.subdireccion ?? null,
    ultimo_acceso: lastAccess
  };
}

export async function getUsers() {
  const relationCandidates = [
    { relation: 'v_usuarios_sistema', select: 'id,nombre_completo,nombre,puesto,rol,correo,email,direccion,subdireccion,ultima_conexion,ultimo_acceso,usuario:usuarios(email,ultimo_acceso)' },
    { relation: 'vw_usuarios', select: 'id,nombre_completo,nombre,puesto,rol,correo,email,direccion,ultima_conexion' },
    { relation: 'usuarios_detalle', select: 'id,nombre_completo,nombre,puesto,rol,correo,email,direccion,ultima_conexion' },
    { relation: 'usuarios', select: 'id,nombre,correo,rol,ultimo_acceso' },
    { relation: 'perfiles', select: 'id,nombre_completo,nombre,puesto,rol,usuario:usuarios(email,ultimo_acceso)' }
  ];

  for (const candidate of relationCandidates) {
    const { data, error } = await supabase.from(candidate.relation).select(candidate.select);

    if (!error) {
      return (data ?? []).map(normalizeUser).filter(Boolean);
    }

    if (!isRelationNotFound(error)) {
      throw error;
    }
  }

  return [];
}
// ============================================
// GESTIÓN AVANZADA DE USUARIOS Y ÁREAS
// ============================================

/**
 * Obtiene un usuario por su ID con sus áreas asignadas
 */
export async function getUserById(userId) {
  if (!userId) throw new Error('userId es requerido');

  const { data: profile, error: profileError } = await supabase
    .from('perfiles')
    .select(`
      id,
      email,
      nombre_completo,
      rol_principal,
      telefono,
      puesto,
      estado,
      ultimo_acceso,
      fecha_creacion,
      fecha_actualizacion,
      usuario_areas (
        id,
        area_id,
        rol,
        puede_capturar,
        puede_editar,
        puede_eliminar,
        estado,
        fecha_asignacion,
        areas (
          id,
          nombre,
          clave,
          color_hex,
          parent_area_id,
          nivel,
          path
        )
      )
    `)
    .eq('id', userId)
    .eq('usuario_areas.estado', 'ACTIVO')
    .single();

  if (profileError) {
    throw profileError;
  }

  return profile;
}

/**
 * Obtiene todas las áreas con su jerarquía completa
 */
export async function getAreaHierarchy() {
  const { data, error } = await supabase
    .from('areas')
    .select('id, nombre, clave, color_hex, parent_area_id, nivel, path, orden_visualizacion, estado')
    .eq('estado', 'ACTIVO')
    .order('path', { ascending: true });

  if (error) throw error;

  return data ?? [];
}

/**
 * Obtiene las áreas asignadas a un usuario con permisos
 */
export async function getUserAreas(userId) {
  if (!userId) return [];

  const { data, error } = await supabase
    .from('usuario_areas')
    .select(`
      id,
      area_id,
      rol,
      puede_capturar,
      puede_editar,
      puede_eliminar,
      estado,
      fecha_asignacion,
      areas (
        id,
        nombre,
        clave,
        color_hex,
        parent_area_id,
        nivel,
        path
      )
    `)
    .eq('usuario_id', userId)
    .eq('estado', 'ACTIVO');

  if (error) throw error;

  return data ?? [];
}

/**
 * Obtiene las áreas que el usuario actual puede gestionar según su rol
 */
export async function getEditableAreasForUser(currentUserId) {
  if (!currentUserId) return [];

  const currentUser = await getUserById(currentUserId);
  
  if (!currentUser) return [];

  if (currentUser.rol_principal === 'ADMIN') {
    return getAreaHierarchy();
  }

  const allAreas = await getAreaHierarchy();
  const userAreas = currentUser.usuario_areas || [];

  if (userAreas.length === 0) return [];

  const editableAreaIds = new Set();

  userAreas.forEach(userArea => {
    const area = userArea.areas;
    if (!area) return;

    const rol = userArea.rol || currentUser.rol_principal;

    switch (rol) {
      case 'DIRECTOR':
        editableAreaIds.add(area.id);
        allAreas.forEach(a => {
          if (a.path && area.path && a.path.startsWith(area.path + '.')) {
            editableAreaIds.add(a.id);
          }
        });
        break;

      case 'SUBDIRECTOR':
        editableAreaIds.add(area.id);
        allAreas.forEach(a => {
          if (a.path && area.path && a.path.startsWith(area.path + '.')) {
            editableAreaIds.add(a.id);
          }
        });
        break;

      default:
        break;
    }
  });

  return allAreas.filter(area => editableAreaIds.has(area.id));
}

/**
 * Actualiza los datos básicos de un usuario
 */
export async function updateUser(userId, userData) {
  if (!userId) throw new Error('userId es requerido');

  const allowedFields = {
    nombre_completo: userData.nombre_completo,
    rol_principal: userData.rol_principal,
    telefono: userData.telefono,
    puesto: userData.puesto,
    estado: userData.estado
  };

  const updateData = {};
  Object.keys(allowedFields).forEach(key => {
    if (allowedFields[key] !== undefined) {
      updateData[key] = allowedFields[key];
    }
  });

  const { data, error } = await supabase
    .from('perfiles')
    .update(updateData)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Asigna un área a un usuario con permisos específicos
 */
export async function addUserArea(userId, areaAssignment) {
  if (!userId) throw new Error('userId es requerido');
  if (!areaAssignment.area_id) throw new Error('area_id es requerido');

  const { data: { user } } = await supabase.auth.getUser();
  
  const payload = {
    usuario_id: userId,
    area_id: areaAssignment.area_id,
    rol: areaAssignment.rol || null,
    puede_capturar: areaAssignment.puede_capturar ?? false,
    puede_editar: areaAssignment.puede_editar ?? false,
    puede_eliminar: areaAssignment.puede_eliminar ?? false,
    estado: 'ACTIVO',
    asignado_por: user?.id || null
  };

  const { data, error } = await supabase
    .from('usuario_areas')
    .insert(payload)
    .select(`
      id,
      area_id,
      rol,
      puede_capturar,
      puede_editar,
      puede_eliminar,
      estado,
      areas (
        id,
        nombre,
        clave,
        color_hex,
        nivel
      )
    `)
    .single();

  if (error) {
    if (error.code === '23505') {
      return updateUserArea(userId, areaAssignment.area_id, areaAssignment);
    }
    throw error;
  }

  return data;
}

/**
 * Actualiza los permisos de un área asignada a un usuario
 */
export async function updateUserArea(userId, areaId, updates) {
  if (!userId || !areaId) throw new Error('userId y areaId son requeridos');

  const allowedUpdates = {
    rol: updates.rol,
    puede_capturar: updates.puede_capturar,
    puede_editar: updates.puede_editar,
    puede_eliminar: updates.puede_eliminar,
    estado: updates.estado
  };

  const updateData = {};
  Object.keys(allowedUpdates).forEach(key => {
    if (allowedUpdates[key] !== undefined) {
      updateData[key] = allowedUpdates[key];
    }
  });

  const { data, error } = await supabase
    .from('usuario_areas')
    .update(updateData)
    .eq('usuario_id', userId)
    .eq('area_id', areaId)
    .select(`
      id,
      area_id,
      rol,
      puede_capturar,
      puede_editar,
      puede_eliminar,
      estado,
      areas (
        id,
        nombre,
        clave,
        color_hex,
        nivel
      )
    `)
    .single();

  if (error) throw error;

  return data;
}

/**
 * Elimina la asignación de un área a un usuario (soft delete)
 */
export async function removeUserArea(userId, areaId) {
  if (!userId || !areaId) throw new Error('userId y areaId son requeridos');

  const { data, error } = await supabase
    .from('usuario_areas')
    .update({ estado: 'INACTIVO' })
    .eq('usuario_id', userId)
    .eq('area_id', areaId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

/**
 * Elimina TODAS las áreas asignadas a un usuario (dejar sin asignar)
 */
export async function removeAllUserAreas(userId) {
  if (!userId) throw new Error('userId es requerido');

  const { data, error } = await supabase
    .from('usuario_areas')
    .update({ estado: 'INACTIVO' })
    .eq('usuario_id', userId)
    .eq('estado', 'ACTIVO')
    .select();

  if (error) throw error;

  return data;
}

/**
 * Verifica si el usuario actual puede editar a otro usuario
 */
export async function canUserEditUser(currentUserId, targetUserId) {
  if (!currentUserId || !targetUserId) return false;

  if (currentUserId === targetUserId) return false;

  const currentUser = await getUserById(currentUserId);
  if (!currentUser) return false;

  if (currentUser.rol_principal === 'ADMIN') return true;

  const targetUser = await getUserById(targetUserId);
  if (!targetUser) return false;

  if (targetUser.rol_principal === 'ADMIN') return false;

  const currentUserAreas = currentUser.usuario_areas || [];
  const targetUserAreas = targetUser.usuario_areas || [];

  if (targetUserAreas.length === 0) return false;

  if (currentUser.rol_principal === 'DIRECTOR') {
    return targetUserAreas.some(targetArea => {
      return currentUserAreas.some(currentArea => {
        const currentPath = currentArea.areas?.path || '';
        const targetPath = targetArea.areas?.path || '';
        return targetPath.startsWith(currentPath);
      });
    });
  }

  if (currentUser.rol_principal === 'SUBDIRECTOR') {
    return targetUserAreas.some(targetArea => {
      return currentUserAreas.some(currentArea => {
        const currentPath = currentArea.areas?.path || '';
        const targetPath = targetArea.areas?.path || '';
        return targetPath.startsWith(currentPath);
      });
    });
  }

  return false;
}

/**
 * Obtiene los roles que el usuario actual puede asignar
 */
export async function getAssignableRoles(currentUserId) {
  if (!currentUserId) return [];

  const currentUser = await getUserById(currentUserId);
  if (!currentUser) return [];

  const allRoles = [
    { value: 'ADMIN', label: 'Administrador' },
    { value: 'DIRECTOR', label: 'Director' },
    { value: 'SUBDIRECTOR', label: 'Subdirector' },
    { value: 'CAPTURISTA', label: 'Capturista' }
  ];

  switch (currentUser.rol_principal) {
    case 'ADMIN':
      return allRoles;
    
    case 'DIRECTOR':
      return allRoles.filter(r => ['SUBDIRECTOR', 'CAPTURISTA'].includes(r.value));
    
    case 'SUBDIRECTOR':
      return allRoles.filter(r => r.value === 'CAPTURISTA');
    
    case 'CAPTURISTA':
      return [];
    
    default:
      return [];
  }
}

/**
 * Obtiene las áreas donde un usuario puede capturar según su rol
 */
export async function getCapturableAreasForUser(userId) {
  if (!userId) return [];

  const user = await getUserById(userId);
  if (!user) return [];

  if (user.rol_principal === 'ADMIN') {
    return getAreaHierarchy();
  }

  const allAreas = await getAreaHierarchy();
  const userAreas = user.usuario_areas || [];

  if (userAreas.length === 0) return [];

  const capturableAreaIds = new Set();

  userAreas.forEach(userArea => {
    const area = userArea.areas;
    if (!area) return;

    const rol = userArea.rol || user.rol_principal;

    if (userArea.puede_capturar) {
      capturableAreaIds.add(area.id);
    }

    switch (rol) {
      case 'DIRECTOR':
        capturableAreaIds.add(area.id);
        allAreas.forEach(a => {
          if (a.path && area.path && a.path.startsWith(area.path + '.')) {
            capturableAreaIds.add(a.id);
          }
        });
        break;

      case 'SUBDIRECTOR':
        capturableAreaIds.add(area.id);
        allAreas.forEach(a => {
          if (a.path && area.path && a.path.startsWith(area.path + '.')) {
            capturableAreaIds.add(a.id);
          }
        });
        break;

      case 'CAPTURISTA':
        if (area.nivel >= 3) {
          capturableAreaIds.add(area.id);
        }
        if (userArea.puede_capturar) {
          capturableAreaIds.add(area.id);
        }
        break;

      default:
        break;
    }
  });

  return allAreas.filter(area => capturableAreaIds.has(area.id));
}
