import Anthropic from '@anthropic-ai/sdk';
import { processInventario } from './inventory';
import { processVenta } from './sales';
import { processCobro } from './collections';
import { generateReporte } from './reports';
import { createServerClient } from '@/lib/supabase/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const SYSTEM_PROMPT = `Eres el asistente de gestion de Maderas Aragon SAS, una empresa de productos de madera en Casanare, Colombia. Tu rol es procesar registros de inventario, ventas y cobros.

REGLAS:
- Responde SIEMPRE en espanol colombiano
- Se extremadamente conciso (maximo 3 lineas)
- Usa emojis para estados: ✅ exito, ⚠️ advertencia, 🚨 urgente
- Nunca uses jerga tecnica
- Incluye numeros especificos siempre
- Si detectas un problema, sugiere UNA accion concreta

TAREAS:
1. INVENTARIO: Confirma movimiento, calcula nuevo stock, alerta si esta bajo
2. VENTAS: Confirma venta, calcula total, alerta si cliente tiene deuda alta
3. COBROS: Confirma pago, actualiza saldo, sugiere mensaje de agradecimiento
4. REPORTES: Genera resumen con datos reales, identifica tendencias`;

export type AgentAction = 'inventario' | 'venta' | 'cobro' | 'reporte';

interface AgentInput {
  action: AgentAction;
  data: Record<string, unknown>;
}

interface AgentOutput {
  mensaje: string;
  alertas: string[];
  datos: Record<string, unknown>;
}

export async function processAgentAction(input: AgentInput): Promise<AgentOutput> {
  const supabase = createServerClient();

  // Obtener contexto segun la accion
  let context: string;
  switch (input.action) {
    case 'inventario':
      context = await processInventario(supabase, input.data);
      break;
    case 'venta':
      context = await processVenta(supabase, input.data);
      break;
    case 'cobro':
      context = await processCobro(supabase, input.data);
      break;
    case 'reporte':
      context = await generateReporte(supabase, input.data);
      break;
  }

  // Llamar a Claude
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Accion: ${input.action}\n\nContexto:\n${context}\n\nResponde con: 1) Confirmacion breve 2) Alertas si hay 3) Accion sugerida si aplica`,
      },
    ],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '';

  // Parsear alertas del texto
  const alertas: string[] = [];
  if (text.includes('🚨')) alertas.push('urgente');
  if (text.includes('⚠️')) alertas.push('advertencia');

  // Guardar en ai_log
  await supabase.from('ai_log').insert({
    tipo: input.action,
    input: input.data,
    output: { mensaje: text, alertas },
    tokens_usado: response.usage.input_tokens + response.usage.output_tokens,
  });

  return {
    mensaje: text,
    alertas,
    datos: input.data,
  };
}
