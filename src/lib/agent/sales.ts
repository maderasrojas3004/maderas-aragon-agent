import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Procesa una venta y genera contexto para el agente.
 */
export async function processVenta(
  supabase: SupabaseClient,
  data: Record<string, unknown>
): Promise<string> {
  const { cliente_id, producto_id, cantidad, pagado, metodo_pago } = data as {
    cliente_id: string;
    producto_id: string;
    cantidad: number;
    pagado: boolean;
    metodo_pago: string;
  };

  // Obtener producto y cliente
  const [{ data: producto }, { data: cliente }] = await Promise.all([
    supabase.from('productos').select('*').eq('id', producto_id).single(),
    supabase.from('clientes').select('*').eq('id', cliente_id).single(),
  ]);

  if (!producto || !cliente) return 'Error: producto o cliente no encontrado';

  const total = producto.precio_unitario * cantidad;

  // Registrar venta
  await supabase.from('ventas').insert({
    cliente_id,
    producto_id,
    cantidad,
    precio_unitario: producto.precio_unitario,
    total,
    pagado,
    metodo_pago,
    registrado_por: (data.registrado_por as string) || 'campo',
  });

  // Descontar inventario
  const nuevoStock = producto.stock_actual - cantidad;
  await supabase
    .from('productos')
    .update({ stock_actual: nuevoStock })
    .eq('id', producto_id);

  // Si es credito, actualizar saldo del cliente
  if (!pagado) {
    await supabase
      .from('clientes')
      .update({
        saldo_pendiente: cliente.saldo_pendiente + total,
      })
      .eq('id', cliente_id);
  }

  // Contexto para el agente
  const lines = [
    `Venta: ${cantidad} x ${producto.nombre}`,
    `Precio unitario: $${producto.precio_unitario.toLocaleString('es-CO')}`,
    `Total: $${total.toLocaleString('es-CO')}`,
    `Cliente: ${cliente.nombre}`,
    `Pago: ${pagado ? metodo_pago : 'credito'}`,
    `Stock restante: ${nuevoStock} (minimo: ${producto.stock_minimo})`,
  ];

  if (!pagado) {
    const nuevaDeuda = cliente.saldo_pendiente + total;
    lines.push(`Deuda acumulada del cliente: $${nuevaDeuda.toLocaleString('es-CO')}`);
    if (nuevaDeuda >= 3000000) {
      lines.push(`ALERTA: Cliente con deuda alta (> $3.000.000)`);
    }
  }

  if (nuevoStock <= producto.stock_minimo) {
    lines.push(`ALERTA: Stock bajo del minimo`);
  }

  if (cantidad > 50) {
    lines.push(`ALERTA: Venta grande (${cantidad} unidades). Verificar logistica.`);
  }

  return lines.join('\n');
}
