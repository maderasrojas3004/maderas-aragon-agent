'use client';

import { useState } from 'react';

type TipoReporte = 'diario' | 'inventario' | 'cartera' | 'ventas_mes';

const reportes: { tipo: TipoReporte; label: string; desc: string }[] = [
  { tipo: 'diario', label: 'Reporte diario', desc: 'Resumen del dia' },
  { tipo: 'inventario', label: 'Inventario completo', desc: 'Stock de todos los productos' },
  { tipo: 'cartera', label: 'Cartera', desc: 'Deudas y cobros pendientes' },
  { tipo: 'ventas_mes', label: 'Ventas del mes', desc: 'Resumen de ventas' },
];

export default function ReportesPage() {
  const [generando, setGenerando] = useState<TipoReporte | null>(null);
  const [resultado, setResultado] = useState('');

  const handleGenerar = async (tipo: TipoReporte) => {
    setGenerando(tipo);
    setResultado('');

    // TODO: llamar Edge Function con agente IA
    await new Promise((r) => setTimeout(r, 1500));

    // Respuesta demo del agente
    const demos: Record<TipoReporte, string> = {
      diario:
        'Hoy: 3 ventas por $2.850.000. Entrada: 100 postes eucalipto. Stock bajo: Poste pino 3.0m (15 unid). 2 cobros recibidos por $1.200.000.',
      inventario:
        'Total en bodega: 1.100 unidades. Critico: Poste pino 3.0m (15 unid), Poste eucalipto 3.0m (45 unid). Bien: Tabla eucalipto (300), Poste pino 2.5m (200).',
      cartera:
        'Cartera total: $10.850.000. Critico: Constructora Llanos ($5.4M, 45 dias). Medio: Hacienda La Esperanza ($3.2M, 28 dias). 1 cliente al dia.',
      ventas_mes:
        'Abril 2026: 45 ventas, total $18.500.000. Top producto: Poste eucalipto 3.0m (180 unid). Top cliente: Constructora Llanos ($5.4M). Pagado: 60%, Credito: 40%.',
    };

    setResultado(demos[tipo]);
    setGenerando(null);
  };

  return (
    <div>
      <h1 className="text-xl font-bold text-navy mb-4">Reportes</h1>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {reportes.map((r) => (
          <button
            key={r.tipo}
            onClick={() => handleGenerar(r.tipo)}
            disabled={generando !== null}
            className="bg-white rounded-xl p-4 shadow-sm text-left active:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <p className="font-bold text-navy mb-1">{r.label}</p>
            <p className="text-xs text-gray-500">{r.desc}</p>
            {generando === r.tipo && (
              <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-verde rounded-full animate-pulse w-2/3" />
              </div>
            )}
          </button>
        ))}
      </div>

      {resultado && (
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <p className="text-sm text-navy leading-relaxed">{resultado}</p>
          <button className="mt-3 w-full h-12 rounded-lg bg-verde text-white font-bold active:opacity-80 transition-opacity">
            Enviar por WhatsApp
          </button>
        </div>
      )}
    </div>
  );
}
