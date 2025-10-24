import { useCallback } from 'react';

/**
 * Hook para exportar datos a CSV
 */
export default function useCSVExport() {
  const exportToCSV = useCallback((data, filename = 'export') => {
    if (!Array.isArray(data) || data.length === 0) {
      console.warn('No hay datos para exportar');
      return;
    }

    // Convertir array de arrays a CSV
    const csvContent = data.map(row => 
      row.map(cell => {
        // Escapar comillas y agregar comillas si contiene coma o salto de línea
        const cellStr = String(cell ?? '');
        if (cellStr.includes(',') || cellStr.includes('\n') || cellStr.includes('"')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ).join('\n');

    // Crear blob y descargar
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  }, []);

  return { exportToCSV };
}
