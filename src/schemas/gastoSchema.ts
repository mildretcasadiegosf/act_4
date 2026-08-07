import { z } from 'zod';

export const CATEGORIAS_GASTO = ['Comida', 'Transporte', 'Ocio', 'Otros'] as const;

export const gastoSchema = z.object({
  descripcion: z.string().trim().min(1, 'La descripción es obligatoria'),
  monto: z.coerce.number().positive('El monto debe ser mayor que cero'),
  categoria: z.enum(CATEGORIAS_GASTO, { message: 'Selecciona una categoría válida' }),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD'),
});

export interface GastoFormValues {
  descripcion: string;
  monto: string;
  categoria: (typeof CATEGORIAS_GASTO)[number];
  fecha: string;
}

export function validateGasto(values: GastoFormValues): Partial<Record<keyof GastoFormValues, string>> {
  const result = gastoSchema.safeParse(values);
  if (result.success) return {};
  return Object.fromEntries(
    Object.entries(result.error.flatten().fieldErrors).map(([field, messages]) => [field, messages?.[0]])
  );
}
