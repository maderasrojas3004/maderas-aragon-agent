-- Maderas Aragon - Schema inicial
-- Ejecutar en Supabase SQL Editor

-- Productos (catalogo completo Maderas Aragon 2026)
CREATE TABLE productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,       -- codigo del catalogo: "PREI2", "PCPI20", etc.
  nombre TEXT NOT NULL,              -- nombre completo del producto
  categoria TEXT NOT NULL,           -- "eucalipto" | "pino"
  tipo TEXT NOT NULL,                -- "poste_rollizo" | "poste_cilindrico" | "poste_cuadrado" | "vareta" | "vara"
  tratamiento TEXT NOT NULL,         -- "ivp" | "bruto" | "descortezado"
  diametro TEXT,                     -- "6-8", "8-10", "10-12", "8", "10", "12", "14", "16", "15x15"
  largo TEXT,                        -- "210", "250", "300", "100" (en cm)
  tarifa_iva NUMERIC(4,2) NOT NULL DEFAULT 0.19,  -- 0.19, 0.05, 0
  precio_2025 INTEGER,              -- precio lista 2025 en COP (null si no tiene)
  precio_sin_iva NUMERIC(12,2),     -- valor sin IVA calculado
  precio_con_iva NUMERIC(12,2),     -- valor con IVA calculado
  stock_actual INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER NOT NULL DEFAULT 10,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Movimientos de inventario
CREATE TABLE movimientos_inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID REFERENCES productos(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  stock_anterior INTEGER NOT NULL,
  stock_nuevo INTEGER NOT NULL,
  motivo TEXT,
  registrado_por TEXT,
  notas TEXT,
  ai_procesado BOOLEAN DEFAULT false,
  ai_respuesta JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Clientes
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  telefono TEXT,
  direccion TEXT,
  tipo TEXT DEFAULT 'regular',
  saldo_pendiente INTEGER DEFAULT 0,
  dias_mora INTEGER DEFAULT 0,
  score INTEGER DEFAULT 100,
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ventas
CREATE TABLE ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id),
  producto_id UUID REFERENCES productos(id),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario INTEGER NOT NULL,
  total INTEGER NOT NULL,
  pagado BOOLEAN DEFAULT false,
  metodo_pago TEXT,
  registrado_por TEXT,
  ai_procesado BOOLEAN DEFAULT false,
  ai_alertas JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cobros
CREATE TABLE cobros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id),
  venta_id UUID REFERENCES ventas(id),
  monto INTEGER NOT NULL,
  metodo TEXT,
  registrado_por TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Log del agente IA
CREATE TABLE ai_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  input JSONB NOT NULL,
  output JSONB NOT NULL,
  tokens_usado INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices para consultas frecuentes
CREATE INDEX idx_movimientos_producto ON movimientos_inventario(producto_id);
CREATE INDEX idx_movimientos_fecha ON movimientos_inventario(created_at DESC);
CREATE INDEX idx_ventas_cliente ON ventas(cliente_id);
CREATE INDEX idx_ventas_fecha ON ventas(created_at DESC);
CREATE INDEX idx_cobros_cliente ON cobros(cliente_id);
CREATE INDEX idx_clientes_saldo ON clientes(saldo_pendiente DESC);
