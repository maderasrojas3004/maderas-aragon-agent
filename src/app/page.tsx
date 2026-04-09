'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

const PERMISOS: Record<string, string[]> = {
  bodeguero: ['/campo/bodega'],
  vendedor: ['/campo/ventas', '/campo/clientes'],
  contador: ['/campo/gastos', '/campo/panel'],
  gerente: ['/campo/bodega', '/campo/ventas', '/campo/clientes', '/campo/gastos', '/campo/panel', '/campo/reportes'],
};

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleDigit = async (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        setLoading(true);
        setError('');

        const { data, error: dbError } = await supabase
          .from('usuarios')
          .select('id, nombre, rol')
          .eq('pin', newPin)
          .eq('activo', true)
          .single();

        if (dbError || !data) {
          setError('PIN incorrecto');
          setLoading(false);
          setTimeout(() => {
            setPin('');
            setError('');
          }, 1500);
          return;
        }

        // Guardar sesion
        localStorage.setItem('usuario', JSON.stringify({
          id: data.id,
          nombre: data.nombre,
          rol: data.rol,
        }));

        // Redirigir a la primera tab permitida
        const tabs = PERMISOS[data.rol];
        router.push(tabs[0]);
      }
    }
  };

  const handleDelete = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col items-center justify-center px-6">
      <h1 className="text-white text-2xl font-bold mb-2">Maderas Aragon</h1>
      <p className="text-gray-400 mb-8">Ingrese su PIN</p>

      <div className="flex gap-4 mb-8">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-4 h-4 rounded-full transition-colors ${
              i < pin.length
                ? error
                  ? 'bg-rojo'
                  : 'bg-verde'
                : 'bg-gray-600'
            }`}
          />
        ))}
      </div>

      {error && <p className="text-rojo mb-4 font-medium">{error}</p>}
      {loading && !error && <p className="text-verde mb-4 font-medium">Verificando...</p>}

      <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map(
          (key) => {
            if (key === '') return <div key="empty" />;
            if (key === 'del') {
              return (
                <button
                  key="del"
                  onClick={handleDelete}
                  className="h-16 rounded-xl bg-gray-700 text-white text-lg font-medium active:bg-gray-600 transition-colors"
                >
                  Borrar
                </button>
              );
            }
            return (
              <button
                key={key}
                onClick={() => handleDigit(key)}
                disabled={loading}
                className="h-16 rounded-xl bg-gray-800 text-white text-2xl font-medium active:bg-gray-600 transition-colors disabled:opacity-50"
              >
                {key}
              </button>
            );
          }
        )}
      </div>
    </div>
  );
}
