'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Logo } from '@/components/barra-superior';
import { api } from '@/lib/api-client';

/** Ingreso con código de operario + PIN, con teclado numérico grande para tablet. */
export function FormularioLogin() {
  const router = useRouter();
  const [codigo, setCodigo] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const tecla = (v: string) => {
    setError('');
    if (v === 'C') setPin('');
    else if (v === 'B') setPin((p) => p.slice(0, -1));
    else setPin((p) => (p.length < 6 ? p + v : p));
  };

  const ingresar = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!codigo.trim() || pin.length < 4) {
      setError('Ingrese su código y un PIN de 4 a 6 dígitos');
      return;
    }
    setEnviando(true);
    try {
      await api('/auth/login', { method: 'POST', body: { codigo: codigo.trim(), pin } });
      router.replace('/');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setPin('');
      setEnviando(false);
    }
  };

  return (
    <form className="login card" onSubmit={ingresar}>
      <div className="brand" style={{ marginBottom: 18 }}>
        <Logo />
        <div>
          <b>Control de Línea</b>
          <small>Línea de acabados · MODASA</small>
        </div>
      </div>
      <div className="field">
        <label htmlFor="codigo">Código de operario</label>
        <input
          id="codigo"
          className="input"
          inputMode="numeric"
          autoComplete="username"
          value={codigo}
          onChange={(e) => {
            setCodigo(e.target.value);
            setError('');
          }}
          autoFocus
        />
      </div>
      <div className="field">
        <div className="lab">PIN</div>
        <div className="pinbox" aria-label={`PIN con ${pin.length} dígitos`}>
          {Array.from({ length: Math.max(4, pin.length) }, (_, i) => (
            <span key={i}>{pin[i] ? '•' : ''}</span>
          ))}
        </div>
        <div className="keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
            <button type="button" key={n} onClick={() => tecla(n)}>
              {n}
            </button>
          ))}
          <button type="button" onClick={() => tecla('C')} aria-label="Borrar todo">
            C
          </button>
          <button type="button" onClick={() => tecla('0')}>
            0
          </button>
          <button type="button" onClick={() => tecla('B')} aria-label="Borrar último">
            ⌫
          </button>
        </div>
      </div>
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-xl btn-blue" disabled={enviando}>
        {enviando ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  );
}
