import { NextResponse } from 'next/server';
import { requestLogger, REQUEST_ID_HEADER } from '@/server/logger';

export const dynamic = 'force-dynamic';

/** Estado del servicio y hora del servidor (la usará el cronómetro para sincronizarse). */
export function GET(request: Request) {
  const { log, requestId } = requestLogger(request.headers);
  log.debug('health');
  return NextResponse.json(
    { status: 'ok', serverNow: new Date().toISOString() },
    { headers: { [REQUEST_ID_HEADER]: requestId, 'cache-control': 'no-store' } },
  );
}
