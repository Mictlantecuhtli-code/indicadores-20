/**
 * Sistema de puentes entre Vanilla JS y React
 * Permite montar componentes React desde código vanilla
 */

import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Importar modales React (por ahora solo Fauna como POC)
import FaunaCaptureModal from '../components/modals/sms/FaunaCaptureModal';

// QueryClient para React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

// Registro de modales disponibles
const MODAL_COMPONENTS = {
  'fauna-capture': FaunaCaptureModal
  // Más modales se agregarán en fases posteriores
};

let currentRoot = null;
let currentContainer = null;

/**
 * Monta un modal React desde vanilla
 * @param {string} modalType - Tipo de modal ('fauna-capture', etc)
 * @param {object} props - Props para el modal React
 */
export function mountReactModal(modalType, props = {}) {
  // Crear contenedor si no existe
  if (!currentContainer) {
    currentContainer = document.createElement('div');
    currentContainer.id = 'react-modal-root';
    currentContainer.style.position = 'fixed';
    currentContainer.style.top = '0';
    currentContainer.style.left = '0';
    currentContainer.style.width = '100%';
    currentContainer.style.height = '100%';
    currentContainer.style.zIndex = '9999';
    document.body.appendChild(currentContainer);
  }

  // Obtener componente
  const ModalComponent = MODAL_COMPONENTS[modalType];
  
  if (!ModalComponent) {
    console.error(`Modal type "${modalType}" not found in registry`);
    console.log('Available modals:', Object.keys(MODAL_COMPONENTS));
    return;
  }

  // Agregar onClose al props si no existe
  const finalProps = {
    ...props,
    onClose: props.onClose || unmountReactModal
  };

  // Crear root y renderizar
  try {
    currentRoot = createRoot(currentContainer);
    currentRoot.render(
      <QueryClientProvider client={queryClient}>
        <ModalComponent {...finalProps} />
      </QueryClientProvider>
    );
    console.log(`✅ Modal "${modalType}" montado correctamente`);
  } catch (error) {
    console.error('Error al montar modal React:', error);
  }
}

/**
 * Desmonta el modal React actual
 */
export function unmountReactModal() {
  if (currentRoot) {
    try {
      currentRoot.unmount();
      currentRoot = null;
      console.log('✅ Modal React desmontado');
    } catch (error) {
      console.error('Error al desmontar modal:', error);
    }
  }
  
  if (currentContainer) {
    currentContainer.remove();
    currentContainer = null;
  }
}

/**
 * Verifica si un modal está actualmente montado
 */
export function isModalMounted() {
  return currentRoot !== null && currentContainer !== null;
}

/**
 * Obtiene la lista de modales disponibles
 */
export function getAvailableModals() {
  return Object.keys(MODAL_COMPONENTS);
}

// Exportar para debugging
if (import.meta.env.DEV) {
  window.__reactBridge = {
    mountReactModal,
    unmountReactModal,
    isModalMounted,
    getAvailableModals
  };
  console.log('🔌 React Bridge cargado en modo desarrollo');
  console.log('Modales disponibles:', getAvailableModals());
}
