export type ProductoCategoria = 'eucalipto' | 'pino';
export type ProductoTipo = 'poste_rollizo' | 'poste_cilindrico' | 'poste_cuadrado' | 'poste_3filos' | 'vareta' | 'vara';
export type ProductoTratamiento = 'ivp' | 'bruto' | 'descortezado';

export interface ProductoRow {
  id: string;
  codigo: string;
  nombre: string;
  categoria: ProductoCategoria;
  tipo: ProductoTipo;
  tratamiento: ProductoTratamiento;
  diametro: string | null;
  largo: string | null;
  tarifa_iva: number;
  precio_2025: number | null;
  precio_sin_iva: number | null;
  precio_con_iva: number | null;
  stock_actual: number;
  stock_minimo: number;
  activo: boolean;
  created_at: string;
}

export interface MovimientoInventarioRow {
  id: string;
  producto_id: string;
  tipo: 'entrada' | 'salida';
  cantidad: number;
  stock_anterior: number;
  stock_nuevo: number;
  motivo: string | null;
  registrado_por: string | null;
  notas: string | null;
  ai_procesado: boolean;
  ai_respuesta: Record<string, unknown> | null;
  created_at: string;
}

export interface ClienteRow {
  id: string;
  nombre: string;
  telefono: string | null;
  direccion: string | null;
  tipo: 'regular' | 'mayorista' | 'constructor';
  saldo_pendiente: number;
  dias_mora: number;
  score: number;
  notas: string | null;
  activo: boolean;
  created_at: string;
}

export interface VentaRow {
  id: string;
  cliente_id: string;
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
  total: number;
  pagado: boolean;
  metodo_pago: 'efectivo' | 'transferencia' | 'credito' | null;
  registrado_por: string | null;
  ai_procesado: boolean;
  ai_alertas: Record<string, unknown> | null;
  created_at: string;
}

export interface CobroRow {
  id: string;
  cliente_id: string;
  venta_id: string;
  monto: number;
  metodo: 'efectivo' | 'transferencia' | null;
  registrado_por: string | null;
  created_at: string;
}

export interface AiLogRow {
  id: string;
  tipo: 'inventario' | 'venta' | 'cobro' | 'reporte' | 'alerta';
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  tokens_usado: number | null;
  created_at: string;
}

// Insert types (sin id ni created_at)
export type ProductoInsert = Omit<ProductoRow, 'id' | 'created_at'>;
export type VentaInsert = Omit<VentaRow, 'id' | 'created_at' | 'ai_procesado' | 'ai_alertas'>;
export type ClienteInsert = Omit<ClienteRow, 'id' | 'created_at' | 'score'>;
export type CobroInsert = Omit<CobroRow, 'id' | 'created_at'>;
