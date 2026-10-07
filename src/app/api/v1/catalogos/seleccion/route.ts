import { ruta } from '@/server/api';
import { catalogoSeleccion } from '@/server/services/catalogos';

export const GET = ruta({}, async () => catalogoSeleccion());
