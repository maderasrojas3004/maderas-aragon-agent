import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Procesa un cobro y genera contexto para el agente.
 */
export async function processCobro(
  supabase: SupabaseClient,
  data: Record<string, unknown>
): Promise<string> {
  const { cliente_id, monto, metodo } = data as {
    cliente_id: string;
    monto: number;
    metodo: string;
  };

  // Obtener cliente
  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', cliente_id)
    .single();

  if (!cliente) return 'Error: cliente no encontrado';

  const saldoAnterior = cliente.saldo_pendiente;
  const saldoNuevo = Math.max(0, saldoAnterior - monto);

  // Registrar cobro
  await supabase.from('cobros').insert({
    cliente_id,
    monto,
    metodo,
    registrado_por: (data.registrado_por as string) || 'campo',
  });

  // Actualizar saldo del cliente
  await supabase
    .from('clientes')
    .update({
      saldo_pendiente: saldoNuevo,
      dias_mora: saldoNuevo === 0 ? 0 : cliente.dias_mora,
    })
    .eq('id', cliente_id);

  // Contexto para el agente
  return [
    `Cobro registrado: $${monto.toLocaleString('es-CO')}`,
    `Cliente: ${cliente.nombre}`,
    `Metodo: ${metodo}`,
    `Saldo anterior: $${saldoAnterior.toLocaleString('es-CO')}`,
    `Saldo nuevo: $${saldoNuevo.toLocaleString('es-CO')}`,
    saldoNuevo === 0
      ? 'Cliente quedo al dia. Sugerir mensaje de agradecimiento.'
      : `Saldo pendiente: $${saldoNuevo.toLocaleString('es-CO')}`,
  ].join('\n');
}
