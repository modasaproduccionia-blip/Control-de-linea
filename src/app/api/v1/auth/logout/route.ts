import { NextResponse } from 'next/server';
import { COOKIE_SESION } from '@/server/auth/session';

export function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(COOKIE_SESION);
  return res;
}
