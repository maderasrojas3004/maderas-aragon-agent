# Maderas Aragon -- Sistema de Gestion con Agente IA

## Contexto del negocio
Maderas Aragon SAS es una empresa colombiana de productos de madera (eucalipto y pino): postes para cercas, tablas, y madera aserrada. Opera en Casanare, Colombia. El dueno (Juan) administra remotamente desde Londres. Los trabajadores de campo tienen bajo conocimiento digital.

## Arquitectura

### Stack tecnico
- **Frontend**: Next.js 14 (App Router), Tailwind CSS, desplegado en Vercel
- **Backend/DB**: Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
- **Agente IA**: Anthropic Claude API (claude-sonnet-4-20250514) via Edge Functions
- **Moneda**: COP (pesos colombianos), formato: $1.234.567
- **Idioma**: Todo en espanol colombiano (no voseo argentino, no castellano Espana)

### Estructura del proyecto
```
maderas-aragon-agent/
├── CLAUDE.md
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx          
│   │   ├── page.tsx            # Landing/login
│   │   ├── campo/              # Interfaz de campo (trabajadores)
│   │   │   ├── layout.tsx      # Tab navigation
│   │   │   ├── bodega/         # Tab 1: Inventario
│   │   │   ├── ventas/         # Tab 2: Ventas
│   │   │   ├── clientes/       # Tab 3: Clientes
│   │   │   └── reportes/       # Tab 4: Reportes
│   │   └── admin/              # Panel administrativo (Juan)
│   ├── components/
│   │   ├── ui/                 # Componentes base reutilizables
│   │   ├── campo/              # Componentes especificos de campo
│   │   └── admin/              # Componentes de admin
│   ├── lib/
│   │   ├── supabase/           # Cliente y tipos de Supabase
│   │   ├── agent/              # Logica del agente IA
│   │   │   ├── processor.ts    # Router de procesamiento
│   │   │   ├── inventory.ts    # Modulo inventario
│   │   │   ├── sales.ts        # Modulo ventas
│   │   │   ├── collections.ts  # Modulo cobros
│   │   │   └── reports.ts      # Modulo reportes
│   │   └── utils/              # Helpers (formatCOP, etc.)
│   └── types/                  # TypeScript types
├── supabase/
│   ├── migrations/             # SQL migrations
│   └── functions/              # Edge Functions (agente IA)
└── public/
```

## Esquema de base de datos

### Tabla: productos
```sql
CREATE TABLE productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,           -- "Poste eucalipto 2.5m"
  categoria TEXT NOT NULL,        -- "eucalipto" | "pino"
  tipo TEXT NOT NULL,             -- "poste" | "tabla" | "bloque"
  medida TEXT,                    -- "2.5m", "3.0m", "4.0m"
  precio_unitario INTEGER NOT NULL, -- en COP, sin decimales
  stock_actual INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER NOT NULL DEFAULT 50,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: movimientos_inventario
```sql
CREATE TABLE movimientos_inventario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID REFERENCES productos(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  stock_anterior INTEGER NOT NULL,
  stock_nuevo INTEGER NOT NULL,
  motivo TEXT,                    -- "compra", "venta", "ajuste", "perdida"
  registrado_por TEXT,            -- nombre del trabajador
  notas TEXT,
  ai_procesado BOOLEAN DEFAULT false,
  ai_respuesta JSONB,            -- respuesta del agente
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: clientes
```sql
CREATE TABLE clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  telefono TEXT,
  direccion TEXT,
  tipo TEXT DEFAULT 'regular',    -- "regular" | "mayorista" | "constructor"
  saldo_pendiente INTEGER DEFAULT 0,  -- deuda actual en COP
  dias_mora INTEGER DEFAULT 0,
  score INTEGER DEFAULT 100,      -- 0-100, calculado por el agente
  notas TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: ventas
```sql
CREATE TABLE ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id),
  producto_id UUID REFERENCES productos(id),
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario INTEGER NOT NULL,
  total INTEGER NOT NULL,
  pagado BOOLEAN DEFAULT false,
  metodo_pago TEXT,               -- "efectivo" | "transferencia" | "credito"
  registrado_por TEXT,
  ai_procesado BOOLEAN DEFAULT false,
  ai_alertas JSONB,               -- alertas del agente (stock bajo, deuda alta, etc.)
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: cobros
```sql
CREATE TABLE cobros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES clientes(id),
  venta_id UUID REFERENCES ventas(id),
  monto INTEGER NOT NULL,
  metodo TEXT,                     -- "efectivo" | "transferencia"
  registrado_por TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Tabla: ai_log
```sql
CREATE TABLE ai_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,              -- "inventario" | "venta" | "cobro" | "reporte" | "alerta"
  input JSONB NOT NULL,
  output JSONB NOT NULL,
  tokens_usado INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Diseno de interfaz de campo

### Principios (NO NEGOCIABLES)
1. **Botones minimo 48px de alto** -- dedos grandes, pantallas sucias
2. **Maximo 3 campos por formulario** -- el trabajador no va a llenar 10 campos
3. **Colores de semaforo** -- verde (bien), amarillo (cuidado), rojo (urgente)
4. **Sin jerga tecnica** -- "Bodega" no "Inventario", "Debe" no "Cartera"
5. **Feedback inmediato** -- cada accion muestra resultado en < 1 segundo
6. **Mobile-first** -- funciona en un Android de $100 con 3G
7. **Offline-capable** -- registra localmente si no hay internet, sincroniza despues
8. **Sin login para campo** -- PIN de 4 digitos, no email+password

### Navegacion
Tab bar fijo en la parte inferior con iconos grandes:
- Bodega (inventario: entradas y salidas)
- Ventas (registrar ventas)
- Clientes (ver cartera, cobrar)
- Reportes (pedir reportes al agente)

### Tab: Bodega
- Vista rapida: grid 2x4 con todos los productos, stock actual, y semaforo de estado
- Formulario: toggle ENTRADA/SALIDA (grande, coloreado) -> select producto -> input cantidad -> boton REGISTRAR
- El agente procesa por detras: actualiza stock, verifica minimos, genera alertas

### Tab: Ventas
- Formulario: select cliente -> select producto -> input cantidad -> toggle pagado/credito -> boton REGISTRAR
- Preview automatico del total en tiempo real
- El agente: descuenta inventario, actualiza cartera del cliente, alerta si tiene deuda alta

### Tab: Clientes
- Lista ordenada por deuda (mayor primero)
- Cada tarjeta: nombre, monto, dias de mora, boton COBRAR
- Boton COBRAR: el agente genera mensaje de WhatsApp listo para enviar
- Card resumen total de cartera al final

### Tab: Reportes
- 4 botones grandes: Reporte diario, Inventario completo, Cartera, Ventas del mes
- Cada uno dispara una funcion del agente que genera el reporte
- Opcion de enviar por WhatsApp

## Logica del agente IA

### Como funciona
El agente NO es un chatbot. Es un procesador inteligente que se activa cuando el trabajador registra algo. El flujo es:

1. Trabajador registra dato (entrada de inventario, venta, cobro)
2. El dato se guarda en Supabase
3. Se dispara Edge Function que llama a Claude API
4. Claude analiza el contexto (stock actual, historial del cliente, patrones)
5. Claude retorna: confirmacion + alertas + acciones sugeridas
6. Se muestra al trabajador como notificacion simple

### System prompt del agente
```
Eres el asistente de gestion de Maderas Aragon SAS, una empresa de productos de madera en Casanare, Colombia. Tu rol es procesar registros de inventario, ventas y cobros.

REGLAS:
- Responde SIEMPRE en espanol colombiano
- Se extremadamente conciso (maximo 3 lineas)
- Usa emojis para estados: exito, advertencia, urgente
- Nunca uses jerga tecnica
- Incluye numeros especificos siempre
- Si detectas un problema, sugiere UNA accion concreta

TAREAS:
1. INVENTARIO: Confirma movimiento, calcula nuevo stock, alerta si esta bajo
2. VENTAS: Confirma venta, calcula total, alerta si cliente tiene deuda alta
3. COBROS: Confirma pago, actualiza saldo, sugiere mensaje de agradecimiento
4. REPORTES: Genera resumen con datos reales, identifica tendencias
```

### Alertas automaticas
El agente genera alertas cuando:
- Stock de un producto cae bajo el minimo -> "Poste eucalipto 3.0m: quedan 45 unid (minimo: 50). Pedir al proveedor."
- Cliente acumula > $3M en deuda -> "Hacienda La Esperanza debe $3.2M hace 28 dias. Pedir abono antes de despachar."
- Venta grande (> 50 unidades) -> "Salida de 80 postes. Verificar que el camion tiene capacidad."
- Cliente paga -> "Cobro registrado. Saldo pendiente: $1.8M -> $0. Enviar agradecimiento."

## Convenciones de codigo

### TypeScript
- Strict mode ON
- Types para todo (no `any`)
- Interfaces con prefijo descriptivo (ProductoRow, VentaInsert)

### Componentes
- Server Components por defecto
- Client Components solo cuando hay interactividad
- Nombres en espanol para componentes de negocio (FormularioVenta, TarjetaCliente)
- Nombres en ingles para componentes genericos (Button, Card, Modal)

### API
- Server Actions para mutaciones
- Route handlers solo para webhooks y el agente
- Manejo de errores con try/catch y feedback al usuario

### Estilo
- Tailwind utilities, no CSS custom
- Dark mode NO necesario (los trabajadores usan esto al sol)
- Colores corporativos: navy (#1a1a2e), verde (#27ae60), rojo (#e74c3c), amarillo (#f39c12)
- Border radius: 10-14px en cards, 8px en inputs
- Font size minimo: 15px en movil

## Deployment
- Frontend: Vercel (free tier suficiente)
- Backend: Supabase (free tier para empezar)
- Dominio: maderas-aragon.vercel.app (temporal)

## Datos de prueba (seed)
Incluir datos de prueba realistas:
- 8 productos (postes eucalipto/pino en 3 medidas + tablas)
- 5 clientes con diferentes niveles de deuda
- 20 movimientos de inventario recientes
- 10 ventas recientes (mix de pagadas y pendientes)
