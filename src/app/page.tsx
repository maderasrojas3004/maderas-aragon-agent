'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        // TODO: validar PIN contra Supabase
        if (newPin === '1234') {
          router.push('/campo/bodega');
        } else {
          setError('PIN incorrecto');
          setTimeout(() => {
            setPin('');
            setError('');
          }, 1500);
        }
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

      {/* Indicadores de PIN */}
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

      {/* Teclado numerico */}
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
                className="h-16 rounded-xl bg-gray-800 text-white text-2xl font-medium active:bg-gray-600 transition-colors"
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
