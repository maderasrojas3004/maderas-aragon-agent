import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Procesa un movimiento de inventario y genera contexto para el agente.
 */
export async function processInventario(
  supabase: SupabaseClient,
  data: Record<string, unknown>
): Promise<string> {
  const { producto_id, tipo, cantidad } = data as {
    producto_id: string;
    tipo: 'entrada' | 'salida';
    cantidad: number;
  };

  // Obtener producto actual
  const { data: producto } = await supabase
    .from('productos')
    .select('*')
    .eq('id', producto_id)
    .single();

  if (!producto) return 'Error: producto no encontrado';

  const stockAnterior = producto.stock_actual;
  const stockNuevo =
    tipo === 'entrada'
      ? stockAnterior + cantidad
      : stockAnterior - cantidad;

  // Actualizar stock
  await supabase
    .from('productos')
    .update({ stock_actual: stockNuevo })
    .eq('id', producto_id);

  // Registrar movimiento
  await supabase.from('movimientos_inventario').insert({
    producto_id,
    tipo,
    cantidad,
    stock_anterior: stockAnterior,
    stock_nuevo: stockNuevo,
    motivo: tipo === 'entrada' ? 'compra' : 'venta',
    registrado_por: (data.registrado_por as string) || 'campo',
  });

  // Contexto para el agente
  return [
    `Producto: ${producto.nombre}`,
    `Movimiento: ${tipo} de ${cantidad} unidades`,
    `Stock anterior: ${stockAnterior}`,
    `Stock nuevo: ${stockNuevo}`,
    `Stock minimo: ${producto.stock_minimo}`,
    stockNuevo <= producto.stock_minimo
      ? `ALERTA: Stock por debajo del minimo (${producto.stock_minimo})`
      : 'Stock OK',
  ].join('\n');
}
