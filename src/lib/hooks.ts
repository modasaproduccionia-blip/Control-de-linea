'use client';

import { useEffect, useState } from 'react';

/**
 * Diferencia entre el reloj del servidor y el de la tablet. Las horas las pone el servidor;
 * el contador en pantalla se corrige con el `serverNow` de cada respuesta de la API.
 */
let offsetServidor = 0;

export function sincronizarReloj(serverNow: string | undefined) {
  if (serverNow) offsetServidor = new Date(serverNow).getTime() - Date.now();
}

export function ahoraServidor(): number {
  return Date.now() + offsetServidor;
}

/** Hora del servidor que se actualiza cada `intervaloMs` (para contadores en vivo). */
export function useAhora(intervaloMs = 250): number {
  const [ahora, setAhora] = useState(ahoraServidor);
  useEffect(() => {
    const t = setInterval(() => setAhora(ahoraServidor()), intervaloMs);
    return () => clearInterval(t);
  }, [intervaloMs]);
  return ahora;
}

/** true mientras el navegador está sin conexión. */
export function useSinConexion(): boolean {
  const [off, setOff] = useState(false);
  useEffect(() => {
    const upd = () => setOff(!navigator.onLine);
    window.addEventListener('online', upd);
    window.addEventListener('offline', upd);
    const t = setTimeout(upd, 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener('online', upd);
      window.removeEventListener('offline', upd);
    };
  }, []);
  return off;
}
