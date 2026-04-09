'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { formatCOP, formatFechaHora } from '@/lib/utils/format';

interface Gasto {
  id: string;
  descripcion: string;
  motivo: string | null;
  monto: number;
  tipo_contable: 'activo' | 'pasivo';
  registrado_por: string;
  created_at: string;
}

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [descripcion, setDescripcion] = useState('');
  const [motivo, setMotivo] = useState('');
  const [monto, setMonto] = useState('');
  const [tipoContable, setTipoContable] = useState<'activo' | 'pasivo'>('pasivo');
  const [responsable, setResponsable] = useState('');
  const [mensaje, setMensaje] = useState('');

  const fetchGastos = async () => {
    const { data } = await supabase
      .from('gastos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setGastos(data);
  };

  useEffect(() => {
    fetchGastos().then(() => setLoading(false));
  }, []);

  const totalGastos = gastos.reduce((sum, g) => sum + g.monto, 0);
  const totalActivos = gastos.filter((g) => g.tipo_contable === 'activo').reduce((sum, g) => sum + g.monto, 0);
  const totalPasivos = gastos.filter((g) => g.tipo_contable === 'pasivo').reduce((sum, g) => sum + g.monto, 0);

  const handleRegistrar = async () => {
    if (!descripcion.trim() || !monto || !responsable.trim()) return;

    const { error } = await supabase.from('gastos').insert({
      descripcion: descripcion.trim(),
      motivo: motivo.trim() || null,
      monto: Number(monto),
      tipo_contable: tipoContable,
      registrado_por: responsable.trim(),
    });

    if (error) {
      setMensaje('Error al registrar gasto');
      setTimeout(() => setMensaje(''), 3000);
      return;
    }

    setMensaje(`Gasto de ${formatCOP(Number(monto))} registrado`);
    setDescripcion('');
    setMotivo('');
    setMonto('');
    await fetchGastos();
    setTimeout(() => setMensaje(''), 3000);
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Cargando gastos...</div>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-navy mb-4">Gastos</h1>

      {/* Formulario */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <input
          type="text"
          placeholder="En que se gasto *"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="w-full h-12 px-3 rounded-lg border border-gray-200 text-navy mb-3"
        />

        <input
          type="text"
          placeholder="Por que (motivo)"
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          className="w-full h-12 px-3 rounded-lg border border-gray-200 text-navy mb-3"
        />

        <input
          type="number"
          inputMode="numeric"
          placeholder="Valor gastado *"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          className="w-full h-12 px-3 rounded-lg border border-gray-200 text-navy mb-3"
        />

        {/* Tipo contable */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setTipoContable('activo')}
            className={`flex-1 py-3 rounded-lg text-sm font-bold transition-colors ${
              tipoContable === 'activo' ? 'bg-verde text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            ACTIVO
          </button>
          <button
            onClick={() => setTipoContable('pasivo')}
            className={`flex-1 py-3 rounded-lg text-sm font-bold transition-colors ${
              tipoContable === 'pasivo' ? 'bg-rojo text-white' : 'bg-gray-100 text-gray-500'
            }`}
          >
            PASIVO
          </button>
        </div>
        <p className="text-xs text-gray-400 mb-3">
          {tipoContable === 'activo'
            ? 'Activo: compra de bienes que generan valor (maquinaria, vehiculos, terrenos)'
            : 'Pasivo: gastos operativos o deudas (combustible, nomina, servicios, arriendo)'}
        </p>

        <input
          type="text"
          placeholder="Responsable (quien registra) *"
          value={responsable}
          onChange={(e) => setResponsable(e.target.value)}
          className="w-full h-12 px-3 rounded-lg border border-gray-200 text-navy mb-4"
        />

        <button
          onClick={handleRegistrar}
          disabled={!descripcion.trim() || !monto || !responsable.trim()}
          className="w-full h-14 rounded-xl bg-navy text-white text-lg font-bold disabled:opacity-40 active:opacity-80 transition-opacity"
        >
          REGISTRAR GASTO
        </button>

        {mensaje && (
          <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${
            mensaje.includes('Error') ? 'bg-rojo-light text-rojo' : 'bg-verde-light text-verde'
          }`}>
            {mensaje}
          </div>
        )}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-sm font-bold text-navy">{formatCOP(totalGastos)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-xs text-gray-500">Activos</p>
          <p className="text-sm font-bold text-verde">{formatCOP(totalActivos)}</p>
        </div>
        <div className="bg-white rounded-xl p-3 shadow-sm text-center">
          <p className="text-xs text-gray-500">Pasivos</p>
          <p className="text-sm font-bold text-rojo">{formatCOP(totalPasivos)}</p>
        </div>
      </div>

      {/* Lista de gastos recientes */}
      <h2 className="font-bold text-navy mb-2">Gastos recientes</h2>
      <div className="space-y-2">
        {gastos.length === 0 ? (
          <p className="text-center text-gray-400 py-4">No hay gastos registrados</p>
        ) : (
          gastos.map((g) => (
            <div key={g.id} className={`bg-white rounded-xl p-3 shadow-sm border-l-4 ${g.tipo_contable === 'activo' ? 'border-verde' : 'border-rojo'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-navy text-sm">{g.descripcion}</p>
                  {g.motivo && <p className="text-xs text-gray-500">{g.motivo}</p>}
                  <p className="text-xs text-gray-400 mt-1">{g.registrado_por} - {formatFechaHora(g.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className={`font-bold text-sm ${g.tipo_contable === 'activo' ? 'text-verde' : 'text-rojo'}`}>
                    {formatCOP(g.monto)}
                  </p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    g.tipo_contable === 'activo' ? 'bg-verde-light text-verde' : 'bg-rojo-light text-rojo'
                  }`}>
                    {g.tipo_contable === 'activo' ? 'Activo' : 'Pasivo'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
