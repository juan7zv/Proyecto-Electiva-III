// ============================================================
// Hook reutilizable para cambiar el título de la pestaña
// ============================================================

import { useEffect } from 'react'

/**
 * Cambia dinámicamente el título de la pestaña del navegador.
 * @param {string} title - Título específico de la pantalla
 */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title
      ? `${title} — SplitEasy`
      : 'SplitEasy — Divide sin dramas'

    // Restaurar el título por defecto al desmontar
    return () => {
      document.title = 'SplitEasy — Divide sin dramas'
    }
  }, [title])
}
