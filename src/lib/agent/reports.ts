import type { SupabaseClient } from '@supabase/supabase-js';

type TipoReporte = 'diario' | 'inventario' | 'cartera' | 'ventas_mes';

/**
 * Genera contexto de reporte para el agente.
 */
export async function generateReporte(
  supabase: SupabaseClient,
  data: Record<string, unknown>
): Promise<string> {
  const tipo = data.tipo as TipoReporte;

  switch (tipo) {
    case 'diario':
      return await reporteDiario(supabase);
    case 'inventario':
      return await reporteInventario(supabase);
    case 'cartera':
      return await reporteCartera(supabase);
    case 'ventas_mes':
      return await reporteVentasMes(supabase);
    default:
      return 'Tipo de reporte no reconocido';
  }
}

async function reporteDiario(supabase: SupabaseClient): Promise<string> {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const [{ data: ventas }, { data: movimientos }, { data: cobros }] =
    await Promise.all([
      supabase
        .from('ventas')
        .select('*')
        .gte('created_at', hoy.toISOString()),
      supabase
        .from('movimientos_inventario')
        .select('*')
        .gte('created_at', hoy.toISOString()),
      supabase
        .from('cobros')
        .select('*')
        .gte('created_at', hoy.toISOString()),
    ]);

  const totalVentas = (ventas || []).reduce((sum, v) => sum + v.total, 0);
  const totalCobros = (cobros || []).reduce((sum, c) => sum + c.monto, 0);
  const entradas = (movimientos || []).filter((m) => m.tipo === 'entrada');
  const salidas = (movimientos || []).filter((m) => m.tipo === 'salida');

  return [
    `REPORTE DIARIO`,
    `Ventas hoy: ${(ventas || []).length} por $${totalVentas.toLocaleString('es-CO')}`,
    `Cobros hoy: ${(cobros || []).length} por $${totalCobros.toLocaleString('es-CO')}`,
    `Movimientos: ${entradas.length} entradas, ${salidas.length} salidas`,
  ].join('\n');
}

async function reporteInventario(supabase: SupabaseClient): Promise<string> {
  const { data: productos } = await supabase
    .from('productos')
    .select('*')
    .eq('activo', true)
    .order('stock_actual', { ascending: true });

  if (!productos) return 'No hay productos';

  const total = productos.reduce((sum, p) => sum + p.stock_actual, 0);
  const criticos = productos.filter((p) => p.stock_actual <= p.stock_minimo);

  const lines = [
    `INVENTARIO COMPLETO`,
    `Total en bodega: ${total} unidades`,
    `Productos criticos (bajo minimo): ${criticos.length}`,
    '',
  ];

  for (const p of productos) {
    const estado =
      p.stock_actual <= p.stock_minimo * 0.5
        ? '🚨'
        : p.stock_actual <= p.stock_minimo
          ? '⚠️'
          : '✅';
    lines.push(`${estado} ${p.nombre}: ${p.stock_actual} unid (min: ${p.stock_minimo})`);
  }

  return lines.join('\n');
}

async function reporteCartera(supabase: SupabaseClient): Promise<string> {
  const { data: clientes } = await supabase
    .from('clientes')
    .select('*')
    .gt('saldo_pendiente', 0)
    .order('saldo_pendiente', { ascending: false });

  if (!clientes || clientes.length === 0) return 'No hay cartera pendiente';

  const totalCartera = clientes.reduce((sum, c) => sum + c.saldo_pendiente, 0);

  const lines = [
    `REPORTE DE CARTERA`,
    `Total pendiente: $${totalCartera.toLocaleString('es-CO')}`,
    `Clientes con deuda: ${clientes.length}`,
    '',
  ];

  for (const c of clientes) {
    const estado = c.dias_mora >= 30 ? '🚨' : c.dias_mora >= 15 ? '⚠️' : '✅';
    lines.push(
      `${estado} ${c.nombre}: $${c.saldo_pendiente.toLocaleString('es-CO')} (${c.dias_mora} dias)`
    );
  }

  return lines.join('\n');
}

async function reporteVentasMes(supabase: SupabaseClient): Promise<string> {
  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);

  const { data: ventas } = await supabase
    .from('ventas')
    .select('*, productos(nombre), clientes(nombre)')
    .gte('created_at', inicioMes.toISOString());

  if (!ventas || ventas.length === 0) return 'No hay ventas este mes';

  const totalMes = ventas.reduce((sum, v) => sum + v.total, 0);
  const pagadas = ventas.filter((v) => v.pagado);
  const credito = ventas.filter((v) => !v.pagado);

  return [
    `VENTAS DEL MES`,
    `Total: ${ventas.length} ventas por $${totalMes.toLocaleString('es-CO')}`,
    `Pagadas: ${pagadas.length} (${Math.round((pagadas.length / ventas.length) * 100)}%)`,
    `Credito: ${credito.length} (${Math.round((credito.length / ventas.length) * 100)}%)`,
  ].join('\n');
}
