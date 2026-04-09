-- Tabla de usuarios con roles
CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  pin TEXT NOT NULL UNIQUE,
  rol TEXT NOT NULL CHECK (rol IN ('bodeguero', 'vendedor', 'contador', 'gerente')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;

-- 4 usuarios de prueba (cambiar nombres y PINs en produccion)
INSERT INTO usuarios (nombre, pin, rol) VALUES
  ('Bodeguero', '1111', 'bodeguero'),
  ('Vendedor', '2222', 'vendedor'),
  ('Contador', '3333', 'contador'),
  ('Gerente', '4444', 'gerente');
