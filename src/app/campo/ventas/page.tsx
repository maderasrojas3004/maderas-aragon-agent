'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { formatCOP } from '@/lib/utils/format';

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  precio_2025: number | null;
  stock_actual: number;
}

interface Cliente {
  id: string;
  nombre: string;
  saldo_pendiente: number;
}

export default function VentasPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [clienteId, setClienteId] = useState('');
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [pagado, setPagado] = useState(true);
  const [responsable, setResponsable] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [busquedaProducto, setBusquedaProducto] = useState('');

  useEffect(() => {
    async function fetchData() {
      const [{ data: prods }, { data: clis }] = await Promise.all([
        supabase
          .from('productos')
          .select('id, codigo, nombre, categoria, precio_2025, stock_actual')
          .eq('activo', true)
          .order('nombre'),
        supabase
          .from('clientes')
          .select('id, nombre, saldo_pendiente')
          .eq('activo', true)
          .order('nombre'),
      ]);
      if (prods) setProductos(prods);
      if (clis) setClientes(clis);
      setLoading(false);
    }
    fetchData();
  }, []);

  const productosFiltrados = useMemo(() => {
    if (!busquedaProducto) return productos;
    const q = busquedaProducto.toLowerCase();
    return productos.filter(
      (p) => p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
    );
  }, [productos, busquedaProducto]);

  const producto = productos.find((p) => p.id === productoId);
  const precio = producto?.precio_2025 || 0;
  const total = producto && cantidad ? precio * Number(cantidad) : 0;

  const handleRegistrar = async () => {
    if (!clienteId || !productoId || !cantidad || !producto || !responsable.trim()) return;

    const cant = Number(cantidad);

    if (cant > producto.stock_actual) {
      setMensaje(`Stock insuficiente. Disponible: ${producto.stock_actual} unid.`);
      setTimeout(() => setMensaje(''), 3000);
      return;
    }

    // Registrar venta
    const { error: ventaError } = await supabase.from('ventas').insert({
      cliente_id: clienteId,
      producto_id: productoId,
      cantidad: cant,
      precio_unitario: precio,
      total,
      pagado,
      metodo_pago: pagado ? 'efectivo' : 'credito',
      registrado_por: responsable.trim(),
    });

    if (ventaError) {
      setMensaje('Error al registrar venta');
      setTimeout(() => setMensaje(''), 3000);
      return;
    }

    // Descontar stock automaticamente
    const nuevoStock = producto.stock_actual - cant;
    await supabase
      .from('productos')
      .update({ stock_actual: nuevoStock })
      .eq('id', productoId);

    // Registrar movimiento de salida en inventario
    await supabase.from('movimientos_inventario').insert({
      producto_id: productoId,
      tipo: 'salida',
      cantidad: cant,
      stock_anterior: producto.stock_actual,
      stock_nuevo: nuevoStock,
      motivo: 'venta',
      registrado_por: responsable.trim(),
    });

    // Si es credito, actualizar saldo del cliente
    if (!pagado) {
      const cliente = clientes.find((c) => c.id === clienteId);
      if (cliente) {
        await supabase
          .from('clientes')
          .update({ saldo_pendiente: cliente.saldo_pendiente + total })
          .eq('id', clienteId);
      }
    }

    const cliente = clientes.find((c) => c.id === clienteId);
    setMensaje(
      `Venta registrada: ${cant} ${producto.nombre} a ${cliente?.nombre} por ${formatCOP(total)}`
    );
    setClienteId('');
    setProductoId('');
    setCantidad('');
    setBusquedaProducto('');

    // Recargar datos
    const [{ data: prods }, { data: clis }] = await Promise.all([
      supabase.from('productos').select('id, codigo, nombre, categoria, precio_2025, stock_actual').eq('activo', true).order('nombre'),
      supabase.from('clientes').select('id, nombre, saldo_pendiente').eq('activo', true).order('nombre'),
    ]);
    if (prods) setProductos(prods);
    if (clis) setClientes(clis);

    setTimeout(() => setMensaje(''), 4000);
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Cargando...</div>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-navy mb-4">Ventas</h1>

      <div className="bg-white rounded-xl p-4 shadow-sm">
        {/* Cliente */}
        <select
          value={clienteId}
          onChange={(e) => setClienteId(e.target.value)}
          className="w-full h-12 px-3 rounded-lg border border-gray-200 bg-white text-navy mb-3"
        >
          <option value="">Seleccionar cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} {c.saldo_pendiente > 0 ? `(debe ${formatCOP(c.saldo_pendiente)})` : ''}
            </option>
          ))}
        </select>

        {/* Busqueda producto */}
        <input
          type="text"
          placeholder="Buscar producto por nombre o codigo..."
          value={busquedaProducto}
          onChange={(e) => setBusquedaProducto(e.target.value)}
          className="w-full h-12 px-3 rounded-lg border border-gray-200 text-navy mb-2"
        />

        {/* Producto */}
        <select
          value={productoId}
          onChange={(e) => {
            setProductoId(e.target.value);
            setBusquedaProducto('');
          }}
          className="w-full h-12 px-3 rounded-lg border border-gray-200 bg-white text-navy mb-3"
        >
          <option value="">Seleccionar producto ({productosFiltrados.length})</option>
          {productosFiltrados.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.codigo}] {p.nombre} {p.precio_2025 ? `- ${formatCOP(p.precio_2025)}` : ''} ({p.stock_actual} unid.)
            </option>
          ))}
        </select>

        {/* Cantidad */}
        <input
          type="number"
          inputMode="numeric"
          placeholder="Cantidad"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          className="w-full h-12 px-3 rounded-lg border border-gray-200 text-navy mb-3"
        />

        {/* Responsable */}
        <input
          type="text"
          placeholder="Responsable (quien registra)"
          value={responsable}
          onChange={(e) => setResponsable(e.target.value)}
          className="w-full h-12 px-3 rounded-lg border border-gray-200 text-navy mb-4"
        />

        {/* Total en tiempo real */}
        {total > 0 && (
          <div className="text-center mb-4">
            <span className="text-sm text-gray-500">Total:</span>
            <p className="text-2xl font-bold text-navy">{formatCOP(total)}</p>
          </div>
        )}

        {/* Toggle pagado/credito */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setPagado(true)}
            className={`flex-1 py-3 rounded-lg text-base font-bold transition-colors ${
              pagado ? 'bg-verde text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            PAGADO
          </button>
          <button
            onClick={() => setPagado(false)}
            className={`flex-1 py-3 rounded-lg text-base font-bold transition-colors ${
              !pagado ? 'bg-amarillo text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            CREDITO
          </button>
        </div>

        <button
          onClick={handleRegistrar}
          disabled={!clienteId || !productoId || !cantidad || !responsable.trim()}
          className="w-full h-14 rounded-xl bg-navy text-white text-lg font-bold disabled:opacity-40 active:opacity-80 transition-opacity"
        >
          REGISTRAR VENTA
        </button>

        {mensaje && (
          <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${
            mensaje.includes('Error') || mensaje.includes('insuficiente')
              ? 'bg-rojo-light text-rojo'
              : 'bg-verde-light text-verde'
          }`}>
            {mensaje}
          </div>
        )}
      </div>
    </div>
  );
}
