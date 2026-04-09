'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';

interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  tipo: string;
  tratamiento: string;
  diametro: string | null;
  largo: string | null;
  stock_actual: number;
  stock_minimo: number;
  precio_2025: number | null;
}

function getSemaforo(stock: number, minimo: number) {
  if (stock <= minimo * 0.5) return { color: 'bg-rojo', text: 'text-rojo' };
  if (stock <= minimo) return { color: 'bg-amarillo', text: 'text-amarillo' };
  return { color: 'bg-verde', text: 'text-verde' };
}

const CATEGORIAS = [
  { value: 'todos', label: 'Todos' },
  { value: 'eucalipto', label: 'Eucalipto' },
  { value: 'pino', label: 'Pino' },
];

const TIPOS = [
  { value: 'todos', label: 'Todos' },
  { value: 'poste_rollizo', label: 'Rollizo' },
  { value: 'poste_cilindrico', label: 'Cilindrico' },
  { value: 'poste_3filos', label: '3 Filos' },
  { value: 'poste_cuadrado', label: 'Cuadrado' },
  { value: 'vara', label: 'Vara' },
  { value: 'vareta', label: 'Vareta' },
];

export default function BodegaPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [tipo, setTipo] = useState<'entrada' | 'salida'>('entrada');
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [responsable, setResponsable] = useState(() => {
    if (typeof window !== 'undefined') {
      const u = localStorage.getItem('usuario');
      return u ? JSON.parse(u).nombre : '';
    }
    return '';
  });
  const [mensaje, setMensaje] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [vistaGrid, setVistaGrid] = useState<'con_stock' | 'todos'>('con_stock');

  // Cargar productos de Supabase
  useEffect(() => {
    async function fetchProductos() {
      const { data, error } = await supabase
        .from('productos')
        .select('id, codigo, nombre, categoria, tipo, tratamiento, diametro, largo, stock_actual, stock_minimo, precio_2025')
        .eq('activo', true)
        .order('categoria')
        .order('nombre');

      if (!error && data) {
        setProductos(data);
      }
      setLoading(false);
    }
    fetchProductos();

    // Auto-refrescar cada 30 segundos
    const interval = setInterval(fetchProductos, 30000);
    return () => clearInterval(interval);
  }, []);

  // Productos filtrados para el grid
  const productosGrid = useMemo(() => {
    let filtered = productos;
    if (vistaGrid === 'con_stock') {
      filtered = filtered.filter((p) => p.stock_actual > 0);
    }
    if (filtroCategoria !== 'todos') {
      filtered = filtered.filter((p) => p.categoria === filtroCategoria);
    }
    if (filtroTipo !== 'todos') {
      filtered = filtered.filter((p) => p.tipo === filtroTipo);
    }
    return filtered;
  }, [productos, vistaGrid, filtroCategoria, filtroTipo]);

  // Productos filtrados para el dropdown (busqueda)
  const productosDropdown = useMemo(() => {
    if (!busqueda) return productos;
    const q = busqueda.toLowerCase();
    return productos.filter(
      (p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.codigo.toLowerCase().includes(q)
    );
  }, [productos, busqueda]);

  const reloadProductos = async () => {
    const { data } = await supabase
      .from('productos')
      .select('id, codigo, nombre, categoria, tipo, tratamiento, diametro, largo, stock_actual, stock_minimo, precio_2025')
      .eq('activo', true)
      .order('categoria')
      .order('nombre');
    if (data) setProductos(data);
  };

  const handleRegistrar = async () => {
    if (!productoId || !cantidad || !responsable.trim()) return;

    const producto = productos.find((p) => p.id === productoId);
    if (!producto) return;

    const cant = Number(cantidad);
    if (tipo === 'salida' && cant > producto.stock_actual) {
      setMensaje(`No hay suficiente stock. Disponible: ${producto.stock_actual} unid.`);
      setTimeout(() => setMensaje(''), 3000);
      return;
    }

    const stockAnterior = producto.stock_actual;
    const stockNuevo = tipo === 'entrada' ? stockAnterior + cant : stockAnterior - cant;

    // Registrar movimiento en Supabase
    const { error: movError } = await supabase.from('movimientos_inventario').insert({
      producto_id: productoId,
      tipo,
      cantidad: cant,
      stock_anterior: stockAnterior,
      stock_nuevo: stockNuevo,
      motivo: tipo === 'entrada' ? 'compra' : 'venta',
      registrado_por: responsable.trim(),
    });

    if (movError) {
      setMensaje('Error al registrar movimiento');
      setTimeout(() => setMensaje(''), 3000);
      return;
    }

    // Actualizar stock del producto
    await supabase
      .from('productos')
      .update({ stock_actual: stockNuevo })
      .eq('id', productoId);

    setMensaje(
      `${tipo === 'entrada' ? 'Entrada' : 'Salida'} de ${cant} unid. de ${producto.nombre}. Stock: ${stockNuevo}`
    );
    setCantidad('');
    setProductoId('');
    setBusqueda('');
    await reloadProductos();
    setTimeout(() => setMensaje(''), 4000);
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Cargando productos...</div>;
  }

  const conStock = productos.filter((p) => p.stock_actual > 0).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-xl font-bold text-navy">Bodega</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={reloadProductos}
            className="px-3 py-1 rounded-lg bg-white border border-gray-200 text-sm text-gray-600 active:bg-gray-100"
          >
            Refrescar
          </button>
          <span className="text-sm text-gray-500">{productos.length} productos</span>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-3 overflow-x-auto">
        {CATEGORIAS.map((c) => (
          <button
            key={c.value}
            onClick={() => setFiltroCategoria(c.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filtroCategoria === c.value
                ? 'bg-navy text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {c.label}
          </button>
        ))}
        <div className="w-px bg-gray-200 mx-1" />
        {TIPOS.map((t) => (
          <button
            key={t.value}
            onClick={() => setFiltroTipo(t.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              filtroTipo === t.value
                ? 'bg-navy text-white'
                : 'bg-white text-gray-600 border border-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Toggle vista */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setVistaGrid('con_stock')}
          className={`text-xs px-3 py-1 rounded-full ${
            vistaGrid === 'con_stock' ? 'bg-verde text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Con stock ({conStock})
        </button>
        <button
          onClick={() => setVistaGrid('todos')}
          className={`text-xs px-3 py-1 rounded-full ${
            vistaGrid === 'todos' ? 'bg-verde text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          Todos ({productos.length})
        </button>
      </div>

      {/* Grid de productos */}
      <div className="grid grid-cols-2 gap-2 mb-6 max-h-[40vh] overflow-y-auto">
        {productosGrid.length === 0 ? (
          <p className="col-span-2 text-center text-gray-400 py-4">Sin productos para mostrar</p>
        ) : (
          productosGrid.map((p) => {
            const semaforo = getSemaforo(p.stock_actual, p.stock_minimo);
            return (
              <div
                key={p.id}
                className="bg-white rounded-xl p-3 shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`w-3 h-3 rounded-full ${semaforo.color}`} />
                  <span className={`text-sm font-bold ${semaforo.text}`}>
                    {p.stock_actual}
                  </span>
                </div>
                <p className="text-xs font-medium text-navy leading-tight">{p.nombre}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{p.codigo}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Formulario de movimiento */}
      <div className="bg-white rounded-xl p-4 shadow-sm">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setTipo('entrada')}
            className={`flex-1 py-3 rounded-lg text-base font-bold transition-colors ${
              tipo === 'entrada'
                ? 'bg-verde text-white'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            ENTRADA
          </button>
          <button
            onClick={() => setTipo('salida')}
            className={`flex-1 py-3 rounded-lg text-base font-bold transition-colors ${
              tipo === 'salida'
                ? 'bg-rojo text-white'
                : 'bg-gray-100 text-gray-500'
            }`}
          >
            SALIDA
          </button>
        </div>

        {/* Busqueda de producto */}
        <input
          type="text"
          placeholder="Buscar por nombre o codigo..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full h-12 px-3 rounded-lg border border-gray-200 text-navy mb-2"
        />

        <select
          value={productoId}
          onChange={(e) => {
            setProductoId(e.target.value);
            setBusqueda('');
          }}
          className="w-full h-12 px-3 rounded-lg border border-gray-200 bg-white text-navy mb-3"
        >
          <option value="">Seleccionar producto ({productosDropdown.length})</option>
          {productosDropdown.map((p) => (
            <option key={p.id} value={p.id}>
              [{p.codigo}] {p.nombre} ({p.stock_actual} unid.)
            </option>
          ))}
        </select>

        <input
          type="number"
          inputMode="numeric"
          placeholder="Cantidad"
          value={cantidad}
          onChange={(e) => setCantidad(e.target.value)}
          className="w-full h-12 px-3 rounded-lg border border-gray-200 text-navy mb-3"
        />

        <input
          type="text"
          placeholder="Responsable (quien registra)"
          value={responsable}
          onChange={(e) => setResponsable(e.target.value)}
          className="w-full h-12 px-3 rounded-lg border border-gray-200 text-navy mb-4"
        />

        <button
          onClick={handleRegistrar}
          disabled={!productoId || !cantidad || !responsable.trim()}
          className="w-full h-14 rounded-xl bg-navy text-white text-lg font-bold disabled:opacity-40 active:opacity-80 transition-opacity"
        >
          REGISTRAR
        </button>

        {mensaje && (
          <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${
            mensaje.includes('Error') || mensaje.includes('No hay')
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
