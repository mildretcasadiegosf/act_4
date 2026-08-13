import { z } from 'zod';

/**
 * DEFINICIÓN DE ESQUEMAS PARA VALIDACIÓN DE CONTRATO DE API - MÓDULO GASTOS
 *
 * Este archivo define los esquemas Zod que validan las respuestas de los
 * endpoints de la API para el módulo de Control de Gastos.
 * Utilizados en pruebas de contrato (API Contract Testing) para garantizar
 * que la API devuelve datos conforme a la especificación esperada.
 */

// ============================================================================
// ESQUEMAS BASE - Estructura individual de un Gasto
// ============================================================================

/**
 * Esquema para validar un objeto Gasto individual
 * Validaciones:
 * - id: string identificador único generado por el servidor
 * - descripcion: string de 1-200 caracteres, sin caracteres especiales peligrosos
 * - monto: number positivo, máximo 999999.99
 * - categoria: enum limitado a categorías predefinidas
 * - fecha: string en formato AAAA-MM-DD, no puede ser futura
 */
export const GastoIndividualSchema = z
    .object({
        id: z.string().uuid().or(z.string().regex(/^\d+$/)),
        descripcion: z
            .string()
            .min(1, 'La descripción es obligatoria')
            .max(200, 'La descripción no puede exceder 200 caracteres')
            .refine(
                (value) => !/[<>{}]/g.test(value),
                'La descripción contiene caracteres no permitidos'
            ),
        monto: z
            .number()
            .positive('El monto debe ser mayor que cero')
            .max(999999.99, 'El monto excede el límite permitido')
            .finite('El monto debe ser un número válido'),
        categoria: z.enum(['Comida', 'Transporte', 'Ocio', 'Otros'], {
            message: 'La categoría debe ser una de las opciones válidas',
        }),
        fecha: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD')
            .refine(
                (value) => {
                    const date = new Date(value);
                    return date instanceof Date && !isNaN(date.getTime());
                },
                'La fecha no es válida'
            )
            .refine(
                (value) => {
                    const date = new Date(`${value}T00:00:00`);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date <= today;
                },
                'La fecha no puede ser futura'
            ),
    })
    .describe('Gasto individual con todos los campos requeridos');

// ============================================================================
// ESQUEMAS DE RESPUESTA - GET /gastos (Listado)
// ============================================================================

/**
 * Esquema para validar la respuesta GET /gastos
 * Retorna: array de objetos Gasto
 */
export const GastoListResponseSchema = z
    .array(GastoIndividualSchema)
    .describe('Lista de gastos registrados')
    .nonempty('La lista de gastos no puede estar vacía')
    .or(z.array(GastoIndividualSchema).length(0)); // Permite array vacío

/**
 * Esquema para validar respuesta con metadatos
 * Usado cuando la API retorna paginación o información adicional
 */
export const GastoListWithMetadataSchema = z
    .object({
        data: z.array(GastoIndividualSchema),
        pagination: z.object({
            total: z.number().int().nonnegative(),
            page: z.number().int().positive(),
            pageSize: z.number().int().positive(),
            hasMore: z.boolean(),
        }),
        timestamp: z.string().datetime(),
    })
    .describe('Respuesta de listado de gastos con metadatos');

// ============================================================================
// ESQUEMAS DE SOLICITUD - POST /gastos (Crear)
// ============================================================================

/**
 * Esquema para validar solicitud POST /gastos
 * Nota: No incluye 'id' ni timestamps, generados por el servidor
 */
export const NuevoGastoRequestSchema = z
    .object({
        descripcion: z
            .string()
            .min(1, 'La descripción es obligatoria')
            .max(200, 'La descripción no puede exceder 200 caracteres')
            .refine(
                (value) => !/[<>{}]/g.test(value),
                'La descripción contiene caracteres no permitidos'
            ),
        monto: z
            .number()
            .positive('El monto debe ser mayor que cero')
            .max(999999.99, 'El monto excede el límite permitido')
            .finite('El monto debe ser un número válido'),
        categoria: z.enum(['Comida', 'Transporte', 'Ocio', 'Otros'], {
            message: 'La categoría debe ser una de las opciones válidas',
        }),
        fecha: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/, 'La fecha debe tener formato AAAA-MM-DD')
            .refine(
                (value) => {
                    const date = new Date(value);
                    return date instanceof Date && !isNaN(date.getTime());
                },
                'La fecha no es válida'
            )
            .refine(
                (value) => {
                    const date = new Date(`${value}T00:00:00`);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date <= today;
                },
                'La fecha no puede ser futura'
            ),
    })
    .describe('Solicitud para crear un nuevo gasto');

/**
 * Esquema para validar respuesta POST /gastos
 * Retorna: el Gasto creado con el id asignado por el servidor
 */
export const GastoCreatedResponseSchema = GastoIndividualSchema.extend({
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
}).describe('Respuesta de creación de gasto con timestamps');

// ============================================================================
// ESQUEMAS DE RESPUESTA - DELETE /gastos/:id
// ============================================================================

/**
 * Esquema para validar respuesta DELETE /gastos/:id
 * Casos de éxito: 204 No Content (sin body) o 200 OK con confirmación
 */
export const GastoDeletionResponseSchema = z
    .object({
        success: z.boolean(),
        message: z.string().optional(),
        deletedGastoId: z.string(),
    })
    .describe('Respuesta de eliminación de gasto');

// ============================================================================
// ESQUEMAS DE ERROR - Respuestas de error de API
// ============================================================================

/**
 * Esquema para validar respuestas de error estandarizado
 */
export const ApiErrorResponseSchema = z
    .object({
        error: z.object({
            code: z.string(),
            message: z.string(),
            details: z.record(z.string()).optional(),
            timestamp: z.string().datetime().optional(),
        }),
    })
    .describe('Respuesta de error de la API');

/**
 * Esquema específico para error 400 Bad Request (validación)
 */
export const ValidationErrorSchema = z
    .object({
        error: z.object({
            code: z.enum(['VALIDATION_ERROR']),
            message: z.string(),
            details: z.object({
                descripcion: z.string().optional(),
                monto: z.string().optional(),
                categoria: z.string().optional(),
                fecha: z.string().optional(),
            }),
        }),
    })
    .describe('Error de validación en solicitud POST/PUT');

/**
 * Esquema específico para error 401 Unauthorized
 */
export const UnauthorizedErrorSchema = z
    .object({
        error: z.object({
            code: z.enum(['UNAUTHORIZED']),
            message: z.string(),
        }),
    })
    .describe('Error de autenticación requerida');

/**
 * Esquema específico para error 404 Not Found
 */
export const NotFoundErrorSchema = z
    .object({
        error: z.object({
            code: z.enum(['NOT_FOUND']),
            message: z.string(),
            resourceId: z.string().optional(),
        }),
    })
    .describe('Recurso no encontrado');

// ============================================================================
// UTILIDADES DE VALIDACIÓN
// ============================================================================

/**
 * Función auxiliar para validar respuestas de API de gastos
 * @param data - Datos a validar
 * @param schema - Esquema Zod a aplicar
 * @returns Objeto con validación segura
 */
export function validateGastoResponse<T>(
    data: unknown,
    schema: z.ZodSchema<T>
): { success: boolean; data?: T; errors?: Record<string, string> } {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }

    const errors: Record<string, string> = {};
    result.error.errors.forEach((error) => {
        const path = error.path.join('.');
        errors[path] = error.message;
    });

    return { success: false, errors };
}

/**
 * Validar que una respuesta de API cumple con el contrato esperado
 */
export function assertGastoApiContract(
    responseData: unknown,
    expectedSchema: z.ZodSchema
): asserts responseData is typeof expectedSchema {
    const result = expectedSchema.safeParse(responseData);
    if (!result.success) {
        const errors = result.error.errors
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join('; ');
        throw new Error(`API Contract violation: ${errors}`);
    }
}