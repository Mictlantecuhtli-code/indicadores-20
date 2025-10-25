# Estructura Final del Código

## Organización de Archivos

```
src/
├── views/
│   └── dashboard.js              ← Sistema principal VANILLA
│       ├── Router y navegación
│       ├── Estructura base
│       ├── handleIndicatorClick() (router central)
│       └── Handlers que llaman a React
│
├── bridges/
│   ├── reactBridge.jsx           ← Puente principal
│   │   ├── mountReactModal()
│   │   ├── unmountReactModal()
│   │   └── mountEmbeddedComponent()
│   └── PCIWrapper.jsx            ← Wrapper para PCI
│
├── components/
│   ├── modals/
│   │   ├── shared/               ← Componentes base reutilizables
│   │   │   ├── SMSModalContainer.jsx
│   │   │   ├── LoadingState.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   └── ErrorState.jsx
│   │   └── sms/                  ← Modales SMS específicos
│   │       ├── FaunaCaptureModal.jsx
│   │       ├── IluminacionModal.jsx
│   │       ├── MantenimientosModal.jsx
│   │       └── DisponibilidadPistasModal.jsx
│   └── indicadores/
│       └── SMSComparativoPCI.jsx ← Comparativo embebido
│
├── hooks/
│   └── shared/
│       └── useCSVExport.js       ← Hook de export
│
├── utils/
│   ├── index.js                  ← Índice de exports
│   ├── shared.js                 ← Utilities puras
│   ├── constants.js              ← Constantes globales
│   └── sms/
│       └── chartHelpers.js       ← Helpers para gráficos
│
├── lib/
│   └── supabaseClient.js         ← Cliente Supabase ÚNICO
│       ├── Funciones generales
│       ├── Funciones SMS
│       └── Funciones FBO
│
└── pages/
    └── VisualizationPage.jsx    ← Página React de visualización
```

## Flujo de Datos

### Click en Indicador

```
Usuario hace click
         ↓
handleIndicatorClick(indicator) [dashboard.js]
         ↓
   ¿Es SMS? → SÍ → mountReactModal() → Modal React
         ↓
         NO → openIndicatorModal() → Modal Vanilla
```

### Procesamiento de Datos

```
Componente React
         ↓
useQuery (React Query)
         ↓
Función Supabase [lib/supabaseClient.js]
         ↓
Base de datos
         ↓
Datos procesados [chartHelpers.js]
         ↓
Renderizado [Recharts]
```

## Reglas de Código

### ✅ HACER:
- Usar `utils/index.js` para imports
- Un archivo = una responsabilidad
- Componentes React para lo complejo
- Vanilla para estructura base
- Utilities puras sin side effects

### ❌ NO HACER:
- Duplicar código
- Mezclar lógica vanilla con React
- Crear nuevos archivos supabaseClient
- Definir constantes en múltiples lugares
- Procesar datos en componentes de vista

## Guía de Mantenimiento

### Agregar Nuevo Modal SMS

1. Crear modal en `components/modals/sms/MiModal.jsx`
2. Registrar en `bridges/reactBridge.jsx`
3. Agregar handler en `dashboard.js`
4. Actualizar router en `handleIndicatorClick()`

### Agregar Nueva Utility

1. Agregar función en `utils/shared.js` o `utils/constants.js`
2. Exportar en `utils/index.js`
3. Usar con `import { miUtility } from '../utils'`

### Agregar Función Supabase

1. Agregar en `lib/supabaseClient.js`
2. Seguir convención de nombres: `get...`, `create...`, `update...`
3. Incluir manejo de errores
4. Documentar con JSDoc

## Métricas Finales

- **Archivos totales**: ~25
- **Duplicación**: 0%
- **Líneas dashboard.js**: ~450
- **Componentes React**: 9
- **Modales SMS**: 4
- **Utilities**: 3 archivos
- **Cliente Supabase**: 1 archivo único
