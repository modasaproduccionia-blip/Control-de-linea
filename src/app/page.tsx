/**
 * Pantalla provisional de la Fase 2: solo comprueba que el tema (colores, tipografías,
 * tamaños táctiles) carga bien. Se reemplaza por Login / Trabajos en curso en la Fase 5.
 */
export default function Home() {
  return (
    <main className="mx-auto flex max-w-[900px] flex-col gap-6 px-4 py-10">
      <header className="flex items-center gap-3">
        <span
          aria-hidden
          className="bg-modasa-blue inline-block h-8 w-5 -skew-x-[16deg] rounded-sm"
        />
        <h1 className="font-condensed text-3xl font-bold tracking-wide uppercase">
          Control de Línea
        </h1>
      </header>

      <section className="bg-surface border-line rounded-card border p-5 shadow-sm">
        <p className="text-ink-2">Línea de Acabados — aplicación en construcción (Fase 2).</p>
        <p className="font-condensed mt-4 text-6xl font-bold tabular-nums">00:00:00</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          className="bg-modasa-blue text-on-blue min-h-touch rounded-control font-condensed text-xl font-bold uppercase"
        >
          Iniciar
        </button>
        <button
          type="button"
          className="bg-modasa-yellow text-on-yellow min-h-touch rounded-control font-condensed text-xl font-bold uppercase"
        >
          Registrar parada
        </button>
        <button
          type="button"
          className="bg-modasa-red text-on-red min-h-touch rounded-control font-condensed text-xl font-bold uppercase"
        >
          Finalizar
        </button>
      </div>
    </main>
  );
}
