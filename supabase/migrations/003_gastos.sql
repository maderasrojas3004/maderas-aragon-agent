-- Tabla de gastos
CREATE TABLE gastos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descripcion TEXT NOT NULL,
  motivo TEXT,
  monto INTEGER NOT NULL CHECK (monto > 0),
  tipo_contable TEXT NOT NULL CHECK (tipo_contable IN ('activo', 'pasivo')),
  registrado_por TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gastos_fecha ON gastos(created_at DESC);

-- Desactivar RLS
ALTER TABLE gastos DISABLE ROW LEVEL SECURITY;
