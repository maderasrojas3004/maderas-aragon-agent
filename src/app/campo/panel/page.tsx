'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { formatCOP } from '@/lib/utils/format';

interface Metricas {
  ventasHoy: number;
  cantVentasHoy: number;
  ventasMes: number;
  cantVentasMes: number;
  ingresosBrutos: number;
  ingresosNetos: number;
  creditosPendientes: number;
  cobrosRecibidos: number;
  gastosTotales: number;
  gastosActivos: number;
  gastosPasivos: number;
  carteraTotal: number;
  utilidad: number;
  stockCritico: number;
}

export default function PanelPage() {
  const [m, setM] = useState<Metricas | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetricas = async () => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

    const [
      { data: ventasHoy },
      { data: ventasMes },
      { data: cobrosMes },
      { data: gastos },
      { data: clientes },
      { data: productosCriticos },
    ] = await Promise.all([
      supabase.from('ventas').select('total, pagado').gte('created_at', hoy.toISOString()),
      supabase.from('ventas').select('total, pagado').gte('created_at', inicioMes.toISOString()),
      supabase.from('cobros').select('monto').gte('created_at', inicioMes.toISOString()),
      supabase.from('gastos').select('monto, tipo_contable'),
      supabase.from('clientes').select('saldo_pendiente').eq('activo', true),
      supabase.from('productos').select('id').eq('activo', true).gt('stock_minimo', 0).filter('stock_actual', 'lte', 'stock_minimo'),
    ]);

    // Ventas de hoy
    const vHoy = ventasHoy || [];
    const totalVentasHoy = vHoy.reduce((s, v) => s + v.total, 0);

    // Ventas del mes
    const vMes = ventasMes || [];
    const totalVentasMes = vMes.reduce((s, v) => s + v.total, 0);

    // Ingresos brutos = todas las ventas del mes (pagadas + credito)
    const ingresosBrutos = totalVentasMes;

    // Ventas pagadas del mes
    const ventasPagadas = vMes.filter((v) => v.pagado).reduce((s, v) => s + v.total, 0);

    // Cobros recibidos del mes
    const totalCobros = (cobrosMes || []).reduce((s, c) => s + c.monto, 0);

    // Ingresos netos = ventas pagadas + cobros
    const ingresosNetos = ventasPagadas + totalCobros;

    // Creditos pendientes del mes
    const creditosPendientes = vMes.filter((v) => !v.pagado).reduce((s, v) => s + v.total, 0);

    // Gastos
    const g = gastos || [];
    const gastosTotales = g.reduce((s, x) => s + x.monto, 0);
    const gastosActivos = g.filter((x) => x.tipo_contable === 'activo').reduce((s, x) => s + x.monto, 0);
    const gastosPasivos = g.filter((x) => x.tipo_contable === 'pasivo').reduce((s, x) => s + x.monto, 0);

    // Cartera total
    const carteraTotal = (clientes || []).reduce((s, c) => s + c.saldo_pendiente, 0);

    // Utilidad = ingresos netos - gastos totales
    const utilidad = ingresosNetos - gastosTotales;

    setM({
      ventasHoy: totalVentasHoy,
      cantVentasHoy: vHoy.length,
      ventasMes: totalVentasMes,
      cantVentasMes: vMes.length,
      ingresosBrutos,
      ingresosNetos,
      creditosPendientes,
      cobrosRecibidos: totalCobros,
      gastosTotales,
      gastosActivos,
      gastosPasivos,
      carteraTotal,
      utilidad,
      stockCritico: (productosCriticos || []).length,
    });
  };

  useEffect(() => {
    fetchMetricas().then(() => setLoading(false));
    const interval = setInterval(fetchMetricas, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !m) {
    return <div className="p-4 text-center text-gray-500">Cargando panel...</div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-navy">Panel de Control</h1>
        <button onClick={() => { setLoading(true); fetchMetricas().then(() => setLoading(false)); }} className="px-3 py-1 rounded-lg bg-white border border-gray-200 text-sm text-gray-600 active:bg-gray-100">
          Refrescar
        </button>
      </div>

      {/* Ventas */}
      <h2 className="text-sm font-bold text-gray-500 mb-2 uppercase">Ventas</h2>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card label="Ventas hoy" value={formatCOP(m.ventasHoy)} sub={`${m.cantVentasHoy} ventas`} color="navy" />
        <Card label="Ventas del mes" value={formatCOP(m.ventasMes)} sub={`${m.cantVentasMes} ventas`} color="navy" />
      </div>

      {/* Ingresos */}
      <h2 className="text-sm font-bold text-gray-500 mb-2 uppercase">Ingresos</h2>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card label="Ingresos brutos" value={formatCOP(m.ingresosBrutos)} sub="Pagados + credito" color="navy" />
        <Card label="Ingresos netos" value={formatCOP(m.ingresosNetos)} sub="Pagados + cobros" color="verde" />
        <Card label="Creditos pendientes" value={formatCOP(m.creditosPendientes)} sub="Ventas a credito" color="amarillo" />
        <Card label="Cobros recibidos" value={formatCOP(m.cobrosRecibidos)} sub="Pagos de clientes" color="verde" />
      </div>

      {/* Gastos */}
      <h2 className="text-sm font-bold text-gray-500 mb-2 uppercase">Gastos</h2>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card label="Total gastos" value={formatCOP(m.gastosTotales)} color="rojo" />
        <Card label="Activos" value={formatCOP(m.gastosActivos)} sub="Bienes" color="verde" />
        <Card label="Pasivos" value={formatCOP(m.gastosPasivos)} sub="Operativos" color="rojo" />
      </div>

      {/* Resumen */}
      <h2 className="text-sm font-bold text-gray-500 mb-2 uppercase">Resumen</h2>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className={`rounded-xl p-4 shadow-sm ${m.utilidad >= 0 ? 'bg-verde' : 'bg-rojo'}`}>
          <p className="text-sm text-white/80">Utilidad</p>
          <p className="text-xl font-bold text-white">{formatCOP(m.utilidad)}</p>
          <p className="text-xs text-white/60">Ingresos netos - gastos</p>
        </div>
        <Card label="Cartera total" value={formatCOP(m.carteraTotal)} sub="Deudas de clientes" color="amarillo" />
      </div>

      {/* Alertas */}
      {m.stockCritico > 0 && (
        <div className="bg-rojo-light border border-rojo/20 rounded-xl p-4 mb-4">
          <p className="text-sm font-bold text-rojo">{m.stockCritico} productos con stock critico</p>
          <p className="text-xs text-rojo/70">Revisa la seccion de Bodega</p>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  const colorMap: Record<string, string> = {
    navy: 'text-navy',
    verde: 'text-verde',
    rojo: 'text-rojo',
    amarillo: 'text-amarillo',
  };
  return (
    <div className="bg-white rounded-xl p-3 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${colorMap[color] || 'text-navy'}`}>{value}</p>
      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
    </div>
  );
}
