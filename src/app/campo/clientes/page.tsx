'use client';

import { useState } from 'react';
import { formatCOP } from '@/lib/utils/format';

// TODO: reemplazar con datos de Supabase
const clientesDemo = [
  { id: '1', nombre: 'Hacienda La Esperanza', saldo: 3200000, diasMora: 28 },
  { id: '2', nombre: 'Finca El Porvenir', saldo: 1800000, diasMora: 15 },
  { id: '3', nombre: 'Constructora Llanos', saldo: 5400000, diasMora: 45 },
  { id: '4', nombre: 'Pedro Martinez', saldo: 450000, diasMora: 5 },
  { id: '5', nombre: 'Cooperativa Ganadera', saldo: 0, diasMora: 0 },
];

function getSemaforoDeuda(saldo: number, diasMora: number) {
  if (saldo === 0) return { color: 'bg-verde', border: 'border-verde' };
  if (diasMora >= 30 || saldo >= 3000000)
    return { color: 'bg-rojo', border: 'border-rojo' };
  if (diasMora >= 15 || saldo >= 1500000)
    return { color: 'bg-amarillo', border: 'border-amarillo' };
  return { color: 'bg-verde', border: 'border-verde' };
}

export default function ClientesPage() {
  const [cobrarId, setCobrarId] = useState<string | null>(null);
  const [montoCobro, setMontoCobro] = useState('');

  const sorted = [...clientesDemo].sort((a, b) => b.saldo - a.saldo);
  const totalCartera = clientesDemo.reduce((sum, c) => sum + c.saldo, 0);

  const handleCobrar = async (clienteId: string) => {
    if (!montoCobro) return;
    // TODO: llamar Server Action para registrar cobro
    setCobrarId(null);
    setMontoCobro('');
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-navy mb-4">Clientes</h1>

      <div className="space-y-3 mb-4">
        {sorted.map((c) => {
          const semaforo = getSemaforoDeuda(c.saldo, c.diasMora);
          return (
            <div
              key={c.id}
              className={`bg-white rounded-xl p-4 shadow-sm border-l-4 ${semaforo.border}`}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-navy">{c.nombre}</h3>
                <span className={`w-3 h-3 rounded-full ${semaforo.color}`} />
              </div>

              {c.saldo > 0 ? (
                <>
                  <p className="text-lg font-bold text-rojo">
                    Debe: {formatCOP(c.saldo)}
                  </p>
                  <p className="text-sm text-gray-500 mb-3">
                    {c.diasMora} dias de mora
                  </p>

                  {cobrarId === c.id ? (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        placeholder="Monto"
                        value={montoCobro}
                        onChange={(e) => setMontoCobro(e.target.value)}
                        className="flex-1 h-12 px-3 rounded-lg border border-gray-200"
                      />
                      <button
                        onClick={() => handleCobrar(c.id)}
                        className="h-12 px-4 rounded-lg bg-verde text-white font-bold"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => setCobrarId(null)}
                        className="h-12 px-4 rounded-lg bg-gray-200 text-gray-600 font-bold"
                      >
                        X
                      </button>
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
        })}
      </div>

      {/* Resumen */}
      <div className="bg-navy rounded-xl p-4 text-white">
        <p className="text-sm text-gray-300">Total cartera</p>
        <p className="text-2xl font-bold">{formatCOP(totalCartera)}</p>
        <p className="text-sm text-gray-300">
          {clientesDemo.filter((c) => c.saldo > 0).length} clientes con deuda
        </p>
      </div>
    </div>
  );
}
