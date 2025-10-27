/**
 * Sistema de puentes entre Vanilla JS y React
 * Actualmente sólo se utiliza para montar componentes embebidos
 * mientras se reconstruyen los módulos SMS.
 */

import { createRoot } from 'react-dom/client';

import PCIWrapper from './PCIWrapper.jsx';

/**
 * Monta un componente React embebido (no modal) en un contenedor
 * @param {string} containerId - ID del elemento DOM donde montar
 * @param {string} componentType - Tipo de componente ('pci-comparativo')
 * @param {object} props - Props del componente
 */
export function mountEmbeddedComponent(containerId, componentType, props = {}) {
  const container = document.getElementById(containerId);

  if (!container) {
    console.error(`Container "${containerId}" not found`);
    return null;
  }

  let Component = null;

  switch (componentType) {
    case 'pci-comparativo':
      Component = PCIWrapper;
      break;
    default:
      console.error(`Unknown component type: ${componentType}`);
      return null;
  }

  const root = createRoot(container);
  root.render(<Component {...props} />);

  console.log(`✅ Component "${componentType}" montado en #${containerId}`);

  return root;
}

// Exportar para debugging
if (import.meta.env.DEV) {
  window.__reactBridge = {
    mountEmbeddedComponent
  };
  console.log('🔌 React Bridge cargado en modo desarrollo');
}
