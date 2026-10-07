import type { MetadataRoute } from 'next';

/** PWA instalable en tablet (solo la "cáscara"; registrar requiere conexión). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Control de Línea — Línea de Acabados',
    short_name: 'Control de Línea',
    start_url: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#E4E7EB',
    theme_color: '#1E388F',
    lang: 'es-PE',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  };
}
