/**
 * Formatea un numero en pesos colombianos: $1.234.567
 */
export function formatCOP(amount: number): string {
  return (
    '$' +
    amount.toLocaleString('es-CO', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })
  );
}

/**
 * Formatea una fecha en formato colombiano: "9 abr 2026"
 */
export function formatFecha(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Formatea fecha y hora: "9 abr 2026, 3:45 p.m."
 */
export function formatFechaHora(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
