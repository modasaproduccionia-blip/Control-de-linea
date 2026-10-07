import { z } from 'zod';
import { MSG_NUMERO_BUS, NUMERO_BUS_REGEX } from '@/domain/codigo-bus';

/** Esquemas Zod compartidos por cliente y servidor. El servidor es la autoridad. */

export const loginSchema = z.object({
  codigo: z.string().trim().min(1, 'Ingrese su código').max(20),
  pin: z.string().regex(/^\d{4,6}$/, 'El PIN tiene de 4 a 6 dígitos'),
});

const uuid = z.uuid('Complete todos los campos');

export const inicioSchema = z.object({
  clienteId: uuid,
  modeloId: uuid,
  lineaId: uuid,
  estacionId: uuid,
  numeroBus: z.string().trim().regex(NUMERO_BUS_REGEX, MSG_NUMERO_BUS),
});
export type InicioInput = z.infer<typeof inicioSchema>;

export const paradaSchema = z.object({
  tipo: z.enum(['PIEZA', 'MATERIAL'], 'Elige si la parada es por pieza o por material'),
  detalleParadaId: z.uuid('Elige el detalle de la parada'),
  comentario: z.string().trim().max(300, 'Máximo 300 caracteres').optional().nullable(),
});

export const actividadesSchema = z.object({
  realizadas: z.array(z.uuid()).max(500),
  version: z.number().int().optional(),
});

export const incidenciasSchema = z.object({
  items: z
    .array(z.object({ motivoId: z.string(), porcentaje: z.number().int().min(0).max(100) }))
    .max(30),
});

export const causasSchema = z.object({
  items: z.array(z.object({ motivoId: z.string() })).max(30),
});

export const anularSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(5, 'Indique el motivo de la anulación (mín. 5 caracteres)')
    .max(300),
});

export const filtrosIndicadoresSchema = z.object({
  desde: z.iso.date().optional(),
  hasta: z.iso.date().optional(),
  lineaId: z.uuid().optional(),
  modeloId: z.uuid().optional(),
  estacionId: z.uuid().optional(),
  clienteId: z.uuid().optional(),
});
export type FiltrosIndicadores = z.infer<typeof filtrosIndicadoresSchema>;
