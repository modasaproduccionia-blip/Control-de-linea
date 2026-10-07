import { ruta } from '@/server/api';
import { enCurso } from '@/server/services/produccion';

export const GET = ruta({}, async ({ sesion }) => enCurso(sesion));
