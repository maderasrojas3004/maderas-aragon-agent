'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { formatCOP } from '@/lib/utils/format';

interface Cliente {
  id: string;
  nombre: string;
  telefono: string | null;
  saldo_pendiente: number;
  dias_mora: number;
}

function getSemaforoDeuda(saldo: number, diasMora: number) {
  if (saldo === 0) return { color: 'bg-verde', border: 'border-verde' };
  if (diasMora >= 30 || saldo >= 3000000) return { color: 'bg-rojo', border: 'border-rojo' };
  if (diasMora >= 15 || saldo >= 1500000) return { color: 'bg-amarillo', border: 'border-amarillo' };
  return { color: 'bg-verde', border: 'border-verde' };
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [cobrarId, setCobrarId] = useState<string | null>(null);
  const [montoCobro, setMontoCobro] = useState('');
  const [responsableCobro, setResponsableCobro] = useState('');
  const [mensaje, setMensaje] = useState('');

  const fetchClientes = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('id, nombre, telefono, saldo_pendiente, dias_mora')
      .eq('activo', true)
      .order('saldo_pendiente', { ascending: false });
    if (data) setClientes(data);
  };

  useEffect(() => {
    fetchClientes().then(() => setLoading(false));
    const interval = setInterval(fetchClientes, 30000);
    return () => clearInterval(interval);
  }, []);

  const totalCartera = clientes.reduce((sum, c) => sum + c.saldo_pendiente, 0);

  const handleCobrar = async (clienteId: string) => {
    if (!montoCobro || !responsableCobro.trim()) return;

    const cliente = clientes.find((c) => c.id === clienteId);
    if (!cliente) return;

    const monto = Number(montoCobro);
    if (monto <= 0) return;

    const { error } = await supabase.from('cobros').insert({
      cliente_id: clienteId,
      monto,
      metodo: 'efectivo',
      registrado_por: responsableCobro.trim(),
    });

    if (error) {
      setMensaje('Error al registrar cobro');
      setTimeout(() => setMensaje(''), 3000);
      return;
    }

    const nuevoSaldo = Math.max(0, cliente.saldo_pendiente - monto);
    await supabase
      .from('clientes')
      .update({
        saldo_pendiente: nuevoSaldo,
        dias_mora: nuevoSaldo === 0 ? 0 : cliente.dias_mora,
      })
      .eq('id', clienteId);

    setMensaje(`Cobro de ${formatCOP(monto)} registrado para ${cliente.nombre}`);
    setCobrarId(null);
    setMontoCobro('');
    setResponsableCobro('');
    await fetchClientes();
    setTimeout(() => setMensaje(''), 4000);
  };

  if (loading) {
    return <div className="p-4 text-center text-gray-500">Cargando clientes...</div>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-navy mb-4">Clientes</h1>

      {mensaje && (
        <div className={`mb-3 p-3 rounded-lg text-sm font-medium ${
          mensaje.includes('Error') ? 'bg-rojo-light text-rojo' : 'bg-verde-light text-verde'
        }`}>
          {mensaje}
        </div>
      )}

      <div className="space-y-3 mb-4">
        {clientes.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No hay clientes registrados</p>
        ) : (
          clientes.map((c) => {
            const semaforo = getSemaforoDeuda(c.saldo_pendiente, c.dias_mora);
            return (
              <div key={c.id} className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${semaforo.border}`}>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-bold text-navy">{c.nombre}</h3>
                  <span className={`w-3 h-3 rounded-full ${semaforo.color}`} />
                </div>
                {c.telefono && <p className="text-xs text-gray-400 mb-1">{c.telefono}</p>}

                {c.saldo_pendiente > 0 ? (
                  <>
                    <p className="text-lg font-bold text-rojo">Debe: {formatCOP(c.saldo_pendiente)}</p>
                    <p className="text-sm text-gray-500 mb-3">{c.dias_mora} dias de mora</p>

                    {cobrarId === c.id ? (
                      <div className="space-y-2">
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="Monto a cobrar"
                          value={montoCobro}
                          onChange={(e) => setMontoCobro(e.target.value)}
                          className="w-full h-12 px-3 rounded-lg border border-gray-200"
                        />
                        <input
                          type="text"
                          placeholder="Responsable"
                          value={responsableCobro}
                          onChange={(e) => setResponsableCobro(e.target.value)}
                          className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCobrar(c.id)}
                            disabled={!montoCobro || !responsableCobro.trim()}
                            className="flex-1 h-10 rounded-lg bg-verde text-white font-bold disabled:opacity-40"
                          >
                            CONFIRMAR
                          </button>
                          <button
                            onClick={() => { setCobrarId(null); setMontoCobro(''); setResponsableCobro(''); }}
                            className="h-10 px-4 rounded-lg bg-gray-200 text-gray-600 font-bold"
                          >
                            X
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setCobrarId(c.id)}
                        className="w-full h-12 rounded-lg bg-verde text-white font-bold active:opacity-80 transition-opacity"
                      >
                        COBRAR
                      </button>
                    )}
                  </>
                ) : (
                  <p className="text-verde font-medium">Al dia</p>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="bg-navy rounded-xl p-4 text-white">
        <p className="text-sm text-gray-300">Total cartera</p>
        <p className="text-2xl font-bold">{formatCOP(totalCartera)}</p>
        <p className="text-sm text-gray-300">
          {clientes.filter((c) => c.saldo_pendiente > 0).length} clientes con deuda
        </p>
      </div>
    </div>
  );
}
