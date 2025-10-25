# Sistema Híbrido Vanilla + React

## Arquitectura

```
Sistema Base (Vanilla JS)
├─ Router y navegación
├─ Dashboard estructura base
├─ Listado de indicadores
└─ Handlers que llaman a React

↓ Puente (Bridge)

Componentes React
├─ Modales SMS (complejos)
├─ Gráficos interactivos
├─ Comparativos avanzados
└─ Export CSV
```

## Componentes

### Modales React SMS
- FaunaCaptureModal (SMS-01, SMS-02)
- IluminacionModal (SMS-03, SMS-03A, SMS-03B, SMS-04)
- MantenimientosModal (SMS-06)
- DisponibilidadPistasModal (SMS-07)

### Componentes Embebidos
- SMSComparativoPCI (SMS-05A, SMS-05B)

### Componentes Base Reutilizables
- SMSModalContainer
- LoadingState
- EmptyState
- ErrorState

### Hooks Personalizados
- useCSVExport

### Utilities Compartidas
- formatters (shared.js)
- chartHelpers (chartHelpers.js)

## Cómo Usar

### Abrir Modal desde Vanilla

```javascript
import { mountReactModal, unmountReactModal } from './bridges/reactBridge.js';

function handleIndicatorClick(indicator) {
  mountReactModal('fauna-capture', {
    title: indicator.nombre,
    onClose: () => unmountReactModal()
  });
}
```

### Montar Componente Embebido

```javascript
import { mountEmbeddedComponent } from './bridges/reactBridge.js';

mountEmbeddedComponent('container-id', 'pci-comparativo', {
  indicadorA: sms05A,
  indicadorB: sms05B,
  meta: 70
});
```

### Agregar Nuevo Modal

1. Crear modal en `src/components/modals/sms/MiModal.jsx`
2. Registrar en `src/bridges/reactBridge.js`:
   ```javascript
   import MiModal from '../components/modals/sms/MiModal';
   
   const MODAL_COMPONENTS = {
     // ...otros
     'mi-modal': MiModal
   };
   ```
3. Usar desde vanilla:
   ```javascript
   mountReactModal('mi-modal', { props });
   ```

## Ventajas

✅ Vanilla: rápido para lo simple  
✅ React: poderoso para lo complejo  
✅ Código reutilizable (0% duplicación)  
✅ Fácil mantenimiento  
✅ Migración incremental  
✅ Ambos sistemas conviven sin conflictos

## Estructura de Archivos

```
src/
├── views/
│   └── dashboard.js          (Vanilla - Sistema base)
├── bridges/
│   ├── reactBridge.js        (Puente principal)
│   └── PCIWrapper.jsx        (Wrapper para PCI)
├── components/
│   ├── modals/
│   │   ├── shared/           (Base reutilizable)
│   │   └── sms/              (Modales SMS)
│   └── indicadores/
│       └── SMSComparativoPCI.jsx
├── hooks/
│   └── shared/
│       └── useCSVExport.js
├── utils/
│   ├── shared.js             (Utilities puras)
│   └── sms/
│       └── chartHelpers.js   (Helpers gráficos)
└── lib/
    └── supabaseClient.js     (Cliente compartido)
```

## Mantenimiento

### Agregar Función Supabase
Agregar en `src/lib/supabaseClient.js` siguiendo el patrón existente.

### Agregar Utility
Agregar en `src/utils/shared.js` o `src/utils/sms/chartHelpers.js`.

### Modificar Modal Base
Cambios en `SMSModalContainer` afectan a TODOS los modales automáticamente.

## Debugging

En desarrollo, el bridge está disponible en consola:

```javascript
window.__reactBridge.getAvailableModals()
// ['fauna-capture', 'iluminacion', 'mantenimientos', 'disponibilidad-pistas']

window.__reactBridge.isModalMounted()
// true/false
```
