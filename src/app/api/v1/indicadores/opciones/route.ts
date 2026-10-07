import { ruta } from '@/server/api';
import { opcionesFiltros } from '@/server/services/indicadores';

export const GET = ruta({}, async () => opcionesFiltros());
