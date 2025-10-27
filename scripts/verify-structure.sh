#!/bin/bash

echo "🔍 Verificando estructura del código..."
echo ""

# Verificar que no haya supabaseClient duplicado
echo "✓ Verificando cliente Supabase único..."
SUPABASE_COUNT=$(find src -name "supabaseClient.js" | wc -l)
if [ "$SUPABASE_COUNT" -eq 1 ]; then
  echo "  ✅ Cliente único en src/lib/supabaseClient.js"
else
  echo "  ❌ Se encontraron $SUPABASE_COUNT archivos supabaseClient.js (debe ser 1)"
  find src -name "supabaseClient.js"
fi

echo ""
echo "✓ Verificando estructura de carpetas..."
REQUIRED_DIRS=(
  "src/bridges"
  "src/components/modals/shared"
  "src/components/modals/sms"
  "src/hooks/shared"
  "src/utils/sms"
  "src/lib"
)

for dir in "${REQUIRED_DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "  ✅ $dir"
  else
    echo "  ❌ $dir (falta)"
  fi
done

echo ""
echo "✓ Verificando archivos clave..."
REQUIRED_FILES=(
  "src/bridges/reactBridge.jsx"
  "src/utils/shared.js"
  "src/utils/constants.js"
  "src/utils/index.js"
  "src/lib/supabaseClient.js"
  "docs/ESTRUCTURA_FINAL.md"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (falta)"
  fi
done

echo ""
echo "✓ Verificando modales SMS eliminados..."
LEGACY_MODALS=(
  "src/components/modals/sms/FaunaCaptureModal.jsx"
  "src/components/modals/sms/IluminacionModal.jsx"
  "src/components/modals/sms/MantenimientosModal.jsx"
  "src/components/modals/sms/DisponibilidadPistasModal.jsx"
)

for modal in "${LEGACY_MODALS[@]}"; do
  if [ -f "$modal" ]; then
    echo "  ⚠️ $(basename "$modal") aún existe (debería eliminarse durante la reconstrucción)"
  else
    echo "  ✅ $(basename "$modal") eliminado (en reconstrucción)"
  fi
done

echo ""
echo "✓ Buscando código potencialmente duplicado..."
echo "  Buscando múltiples definiciones de formatNumber..."
FORMAT_NUM_COUNT=$(grep -r "function formatNumber" src/ | wc -l)
if [ "$FORMAT_NUM_COUNT" -le 1 ]; then
  echo "  ✅ formatNumber definido $FORMAT_NUM_COUNT vez(ces)"
else
  echo "  ⚠️  formatNumber definido $FORMAT_NUM_COUNT veces (verificar duplicación)"
fi

echo "  Buscando múltiples definiciones de CURRENT_YEAR..."
CURRENT_YEAR_COUNT=$(grep -r "const CURRENT_YEAR" src/ | wc -l)
if [ "$CURRENT_YEAR_COUNT" -le 1 ]; then
  echo "  ✅ CURRENT_YEAR definido $CURRENT_YEAR_COUNT vez(ces)"
else
  echo "  ⚠️  CURRENT_YEAR definido $CURRENT_YEAR_COUNT veces (verificar duplicación)"
fi

echo ""
echo "🎉 Verificación completada"
