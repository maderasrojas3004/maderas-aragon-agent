'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const ALL_TABS = [
  { href: '/campo/bodega', label: 'Bodega', icon: 'box' },
  { href: '/campo/ventas', label: 'Ventas', icon: 'dollar' },
  { href: '/campo/clientes', label: 'Clientes', icon: 'users' },
  { href: '/campo/gastos', label: 'Gastos', icon: 'receipt' },
  { href: '/campo/panel', label: 'Panel', icon: 'dashboard' },
  { href: '/campo/reportes', label: 'Reportes', icon: 'chart' },
];

const PERMISOS: Record<string, string[]> = {
  bodeguero: ['/campo/bodega'],
  vendedor: ['/campo/ventas', '/campo/clientes'],
  contador: ['/campo/gastos', '/campo/panel'],
  gerente: ['/campo/bodega', '/campo/ventas', '/campo/clientes', '/campo/gastos', '/campo/panel', '/campo/reportes'],
};

function TabIcon({ icon, active }: { icon: string; active: boolean }) {
  const color = active ? '#27ae60' : '#9ca3af';
  const size = 22;

  switch (icon) {
    case 'box':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>);
    case 'dollar':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>);
    case 'users':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>);
    case 'chart':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>);
    case 'receipt':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" /><path d="M8 7h8" /><path d="M8 11h8" /><path d="M8 15h5" /></svg>);
    case 'dashboard':
      return (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></svg>);
    default:
      return null;
  }
}

export default function CampoLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [usuario, setUsuario] = useState<{ nombre: string; rol: string } | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('usuario');
    if (!stored) {
      router.push('/');
      return;
    }
    const user = JSON.parse(stored);
    setUsuario(user);

    // Verificar que tiene acceso a esta ruta
    const permitidos = PERMISOS[user.rol] || [];
    const tieneAcceso = permitidos.some((p: string) => pathname.startsWith(p));
    if (!tieneAcceso && permitidos.length > 0) {
      router.push(permitidos[0]);
    }
  }, [pathname, router]);

  if (!usuario) return null;

  const tabsPermitidos = ALL_TABS.filter((tab) =>
    (PERMISOS[usuario.rol] || []).includes(tab.href)
  );

  const handleLogout = () => {
    localStorage.removeItem('usuario');
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gris-bg pb-20">
      {/* Header con nombre y logout */}
      <div className="bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          {usuario.nombre} <span className="text-xs text-gray-400">({usuario.rol})</span>
        </span>
        <button onClick={handleLogout} className="text-xs text-rojo font-medium">
          Salir
        </button>
      </div>

      <main className="px-4 pt-4">{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-1 py-1.5 safe-area-bottom">
        <div className="flex justify-around max-w-lg mx-auto">
          {tabsPermitidos.map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors ${
                  active ? 'text-verde' : 'text-gray-400'
                }`}
              >
                <TabIcon icon={tab.icon} active={active} />
                <span className="text-[10px] font-medium">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
