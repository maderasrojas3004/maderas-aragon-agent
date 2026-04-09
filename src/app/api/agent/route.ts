import { NextRequest, NextResponse } from 'next/server';
import { processAgentAction } from '@/lib/agent/processor';
import type { AgentAction } from '@/lib/agent/processor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body as { action: AgentAction; data: Record<string, unknown> };

    if (!action || !data) {
      return NextResponse.json(
        { error: 'Faltan campos: action, data' },
        { status: 400 }
      );
    }

    const result = await processAgentAction({ action, data });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error en agente:', error);
    return NextResponse.json(
      { error: 'Error procesando solicitud' },
      { status: 500 }
    );
  }
}
