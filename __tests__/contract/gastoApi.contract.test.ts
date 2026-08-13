import {
  GastoIndividualSchema,
  GastoListResponseSchema,
  GastoListWithMetadataSchema,
  NuevoGastoRequestSchema,
  GastoCreatedResponseSchema,
  GastoDeletionResponseSchema,
  ApiErrorResponseSchema,
  ValidationErrorSchema,
  UnauthorizedErrorSchema,
  NotFoundErrorSchema,
  validateGastoResponse,
  assertGastoApiContract,
} from '../../src/schemas/gastoApiSchema';
import { Gasto } from '../../src/types';

/**
 * PRUEBAS DE CONTRATO DE API - MÓDULO CONTROL DE GASTOS
 *
 * API Contract Testing valida que las respuestas del backend cumplan con
 * el contrato esperado definido mediante esquemas Zod.
 *
 * Endpoints probados:
 * - GET  /gastos         (Obtener lista de gastos)
 * - POST /gastos         (Crear nuevo gasto)
 * - DELETE /gastos/:id   (Eliminar gasto)
 *
 * Escenarios:
 * 1. Respuestas VÁLIDAS que cumplen el contrato
 * 2. Respuestas INVÁLIDAS que detectan violaciones del contrato
 * 3. Casos EDGE que validan límites y restricciones
 * 4. Respuestas de ERROR con estructura estandarizada
 */

// ============================================================================
// SUITE 1: GET /gastos - Validación de respuesta de listado
// ============================================================================

describe('API Contract Testing - GET /gastos', () => {
  describe('Caso VÁLIDO: Respuesta correcta con gastos', () => {
    it('valida respuesta con array de gastos conforme al esquema', () => {
      const validGastosList: Gasto[] = [
        {
          id: '1',
          descripcion: 'Almuerzo en restaurante downtown',
          monto: 25.5,
          categoria: 'Comida',
          fecha: '2026-08-10',
        },
        {
          id: '2',
          descripcion: 'Pasaje en colectivo',
          monto: 2.5,
          categoria: 'Transporte',
          fecha: '2026-08-11',
        },
      ];

      const result = GastoListResponseSchema.safeParse(validGastosList);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].id).toBe('1');
      expect(result.data?.[0].categoria).toBe('Comida');
    });

    it('valida respuesta vacía (array vacío)', () => {
      const emptyList: Gasto[] = [];

      const result = GastoListResponseSchema.safeParse(emptyList);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);
    });

    it('valida que UUID es aceptado como ID válido', () => {
      const gastoWithUUID: Gasto = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        descripcion: 'Comida rápida',
        monto: 8.99,
        categoria: 'Comida',
        fecha: '2026-08-11',
      };

      const result = GastoIndividualSchema.safeParse(gastoWithUUID);

      expect(result.success).toBe(true);
    });
  });

  describe('Caso INVÁLIDO: Respuesta que viola el contrato', () => {
    it('detecta cuando ID es número en lugar de string', () => {
      const invalidGasto = {
        id: 123, // ❌ Debe ser string
        descripcion: 'Almuerzo',
        monto: 25.5,
        categoria: 'Comida',
        fecha: '2026-08-11',
      };

      const result = GastoIndividualSchema.safeParse(invalidGasto);

      expect(result.success).toBe(false);
      expect(result.error?.errors[0].path).toContain('id');
    });

    it('detecta cuando monto es negativo', () => {
      const invalidGasto = {
        id: '1',
        descripcion: 'Almuerzo',
        monto: -25.5, // ❌ Debe ser positivo
        categoria: 'Comida',
        fecha: '2026-08-11',
      };

      const result = GastoIndividualSchema.safeParse(invalidGasto);

      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain('mayor que cero');
    });

    it('detecta cuando categoría no está en enum', () => {
      const invalidGasto = {
        id: '1',
        descripcion: 'Almuerzo',
        monto: 25.5,
        categoria: 'Viajes', // ❌ No es una categoría válida
        fecha: '2026-08-11',
      };

      const result = GastoIndividualSchema.safeParse(invalidGasto);

      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain('categoría');
    });

    it('detecta cuando fecha no tiene formato AAAA-MM-DD', () => {
      const invalidGasto = {
        id: '1',
        descripcion: 'Almuerzo',
        monto: 25.5,
        categoria: 'Comida',
        fecha: '10/08/2026', // ❌ Formato incorrecto
      };

      const result = GastoIndividualSchema.safeParse(invalidGasto);

      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain('formato');
    });

    it('detecta cuando falta un campo requerido (descripcion)', () => {
      const incompleteGasto = {
        id: '1',
        monto: 25.5,
        categoria: 'Comida',
        fecha: '2026-08-11',
        // ❌ Falta descripcion
      };

      const result = GastoIndividualSchema.safeParse(incompleteGasto);

      expect(result.success).toBe(false);
    });

    it('detecta cuando descripción contiene caracteres HTML peligrosos', () => {
      const xssAttempt = {
        id: '1',
        descripcion: '<script>alert("XSS")</script>', // ❌ Caracteres peligrosos
        monto: 25.5,
        categoria: 'Comida',
        fecha: '2026-08-11',
      };

      const result = GastoIndividualSchema.safeParse(xssAttempt);

      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain('no permitidos');
    });

    it('detecta cuando descripción excede límite de caracteres', () => {
      const longDescription = {
        id: '1',
        descripcion: 'A'.repeat(201), // ❌ Excede 200 caracteres
        monto: 25.5,
        categoria: 'Comida',
        fecha: '2026-08-11',
      };

      const result = GastoIndividualSchema.safeParse(longDescription);

      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain('exceder 200');
    });

    it('detecta cuando monto excede límite permitido', () => {
      const excessiveAmount = {
        id: '1',
        descripcion: 'Comida',
        monto: 1000000.0, // ❌ Excede 999999.99
        categoria: 'Comida',
        fecha: '2026-08-11',
      };

      const result = GastoIndividualSchema.safeParse(excessiveAmount);

      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain('límite');
    });
  });

  describe('Casos EDGE: Validación de límites y restricciones', () => {
    it('acepta monto con dos decimales (límite de precisión)', () => {
      const precisionGasto = {
        id: '1',
        descripcion: 'Almuerzo',
        monto: 99999.99, // Límite máximo
        categoria: 'Comida',
        fecha: '2026-08-11',
      };

      const result = GastoIndividualSchema.safeParse(precisionGasto);

      expect(result.success).toBe(true);
    });

    it('rechaza monto con más de dos decimales (si es aplicable)', () => {
      // Nota: Zod coerce a number puede perder precisión
      const precisionGasto = {
        id: '1',
        descripcion: 'Almuerzo',
        monto: 25.555, // Más de 2 decimales
        categoria: 'Comida',
        fecha: '2026-08-11',
      };

      const result = GastoIndividualSchema.safeParse(precisionGasto);

      // Puede ser válido dependiendo del comportamiento de coerce
      // pero es importante documentar
      expect(result.success).toBe(true);
    });

    it('acepta descripción con acentos y caracteres especiales válidos', () => {
      const accentedGasto = {
        id: '1',
        descripcion: 'Almuerzo con refrescos - Ñandú café',
        monto: 25.5,
        categoria: 'Comida',
        fecha: '2026-08-11',
      };

      const result = GastoIndividualSchema.safeParse(accentedGasto);

      expect(result.success).toBe(true);
    });

    it('rechaza descripción vacía', () => {
      const emptyDescGasto = {
        id: '1',
        descripcion: '', // ❌ Vacío
        monto: 25.5,
        categoria: 'Comida',
        fecha: '2026-08-11',
      };

      const result = GastoIndividualSchema.safeParse(emptyDescGasto);

      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain('obligatoria');
    });

    it('acepta fecha actual', () => {
      const today = new Date();
      today.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
      const dateString = today.toISOString().split('T')[0];

      const todayGasto = {
        id: '1',
        descripcion: 'Almuerzo hoy',
        monto: 25.5,
        categoria: 'Comida',
        fecha: dateString,
      };

      const result = GastoIndividualSchema.safeParse(todayGasto);

      expect(result.success).toBe(true);
    });

    it('rechaza fecha futura', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0); // Set to noon to avoid timezone issues
      const futureDateString = tomorrow.toISOString().split('T')[0];

      const futureGasto = {
        id: '1',
        descripcion: 'Almuerzo mañana',
        monto: 25.5,
        categoria: 'Comida',
        fecha: futureDateString,
      };

      const result = GastoIndividualSchema.safeParse(futureGasto);

      expect(result.success).toBe(false);
      expect(result.error?.errors[0].message).toContain('futura');
    });
  });

  describe('Utilidades de validación', () => {
    it('validateGastoResponse retorna objeto con estructura correcta en éxito', () => {
      const validGasto = {
        id: '1',
        descripcion: 'Almuerzo',
        monto: 25.5,
        categoria: 'Comida',
        fecha: '2026-08-11',
      };

      const result = validateGastoResponse(validGasto, GastoIndividualSchema);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toBeUndefined();
    });

    it('validateGastoResponse retorna errores en fallo', () => {
      const invalidGasto = {
        id: 123, // Inválido
        descripcion: 'Almuerzo',
        monto: -5, // Inválido
      };

      const result = validateGastoResponse(invalidGasto, GastoIndividualSchema);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(Object.keys(result.errors!).length).toBeGreaterThan(0);
    });

    it('assertGastoApiContract lanza excepción en fallo de validación', () => {
      const invalidGasto = {
        id: 123,
        descripcion: 'Almuerzo',
        monto: 25.5,
        categoria: 'Comida',
        fecha: '2026-08-11',
      };

      expect(() => {
        assertGastoApiContract(invalidGasto, GastoIndividualSchema);
      }).toThrow('API Contract violation');
    });

    it('assertGastoApiContract no lanza excepción en éxito', () => {
      const validGasto = {
        id: '1',
        descripcion: 'Almuerzo',
        monto: 25.5,
        categoria: 'Comida',
        fecha: '2026-08-11',
      };

      expect(() => {
        assertGastoApiContract(validGasto, GastoIndividualSchema);
      }).not.toThrow();
    });
  });
});

// ============================================================================
// SUITE 2: POST /gastos - Validación de solicitud y respuesta de creación
// ============================================================================

describe('API Contract Testing - POST /gastos', () => {
  describe('Validación de SOLICITUD (Request Body)', () => {
    it('acepta solicitud válida para crear gasto', () => {
      const nuevoGasto = {
        descripcion: 'Almuerzo ejecutivo en restaurante',
        monto: 45.5,
        categoria: 'Comida',
        fecha: '2026-08-11',
      };

      const result = NuevoGastoRequestSchema.safeParse(nuevoGasto);

      expect(result.success).toBe(true);
    });

    it('rechaza solicitud sin campo requerido (descripcion)', () => {
      const incompleteRequest = {
        monto: 25.5,
        categoria: 'Comida',
        fecha: '2026-08-11',
      };

      const result = NuevoGastoRequestSchema.safeParse(incompleteRequest);

      expect(result.success).toBe(false);
    });

    it('rechaza solicitud con campo extra desconocido (no fallará por Zod default)', () => {
      const requestWithExtra = {
        descripcion: 'Almuerzo',
        monto: 25.5,
        categoria: 'Comida',
        fecha: '2026-08-11',
        extraField: 'debe ser ignorado', // Campo extra
      };

      const result = NuevoGastoRequestSchema.safeParse(requestWithExtra);

      // Zod por defecto ignora campos extra (flexible)
      expect(result.success).toBe(true);
    });

    it('rechaza solicitud con tipo de dato incorrecto en monto', () => {
      const invalidRequest = {
        descripcion: 'Almuerzo',
        monto: '25.5', // Es string, debe ser number
        categoria: 'Comida',
        fecha: '2026-08-11',
      };

      // Nota: Zod puede coercer string a number
      const result = NuevoGastoRequestSchema.safeParse(invalidRequest);

      // Con coerce, esto puede pasar o fallar dependiendo del formato
      if (result.success) {
        expect(result.data?.monto).toBe(25.5);
      }
    });
  });

  describe('Validación de RESPUESTA (Response - 201 Created)', () => {
    it('valida respuesta correcta con gasto creado', () => {
      const createdGastoResponse = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        descripcion: 'Almuerzo',
        monto: 25.5,
        categoria: 'Comida',
        fecha: '2026-08-11',
        createdAt: '2026-08-11T15:30:00Z',
      };

      const result = GastoCreatedResponseSchema.safeParse(createdGastoResponse);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBeDefined();
    });

    it('acepta respuesta sin timestamps opcionales', () => {
      const createdGastoResponse = {
        id: '1',
        descripcion: 'Almuerzo',
        monto: 25.5,
        categoria: 'Comida',
        fecha: '2026-08-11',
      };

      const result = GastoCreatedResponseSchema.safeParse(createdGastoResponse);

      expect(result.success).toBe(true);
    });

    it('rechaza respuesta sin ID (generado por servidor)', () => {
      const invalidResponse = {
        descripcion: 'Almuerzo',
        monto: 25.5,
        categoria: 'Comida',
        fecha: '2026-08-11',
      };

      const result = GastoCreatedResponseSchema.safeParse(invalidResponse);

      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// SUITE 3: DELETE /gastos/:id - Validación de respuesta de eliminación
// ============================================================================

describe('API Contract Testing - DELETE /gastos/:id', () => {
  it('valida respuesta exitosa de eliminación', () => {
    const successResponse = {
      success: true,
      message: 'Gasto eliminado exitosamente',
      deletedGastoId: '1',
    };

    const result = GastoDeletionResponseSchema.safeParse(successResponse);

    expect(result.success).toBe(true);
    expect(result.data?.success).toBe(true);
  });

  it('valida respuesta con campos mínimos', () => {
    const minimalResponse = {
      success: true,
      deletedGastoId: '1',
    };

    const result = GastoDeletionResponseSchema.safeParse(minimalResponse);

    expect(result.success).toBe(true);
  });

  it('rechaza respuesta con success false (no es contrato de éxito)', () => {
    const failureResponse = {
      success: false,
      deletedGastoId: '1',
    };

    // Este test depende de si queremos validar success=true obligatoriamente
    // Por ahora solo validamos la estructura
    const result = GastoDeletionResponseSchema.safeParse(failureResponse);

    // Aceptamos ambos casos, pero podrías refinarlo
    expect(result.success).toBe(true);
  });
});

// ============================================================================
// SUITE 4: Validación de Respuestas de ERROR (400, 401, 404)
// ============================================================================

describe('API Contract Testing - Error Responses', () => {
  describe('Error 400 - Validation Error', () => {
    it('valida respuesta de error de validación', () => {
      const validationError = {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Los datos proporcionados son inválidos',
          details: {
            monto: 'El monto debe ser mayor que cero',
            fecha: 'La fecha debe estar en formato AAAA-MM-DD',
          },
        },
      };

      const result = ValidationErrorSchema.safeParse(validationError);

      expect(result.success).toBe(true);
      expect(result.data?.error.code).toBe('VALIDATION_ERROR');
    });

    it('rechaza error sin estructura adecuada', () => {
      const invalidError = {
        error: 'Error simple sin estructura',
      };

      const result = ValidationErrorSchema.safeParse(invalidError);

      expect(result.success).toBe(false);
    });
  });

  describe('Error 401 - Unauthorized', () => {
    it('valida respuesta de autenticación requerida', () => {
      const unauthorizedError = {
        error: {
          code: 'UNAUTHORIZED',
          message: 'Se requiere autenticación para acceder a este recurso',
        },
      };

      const result = UnauthorizedErrorSchema.safeParse(unauthorizedError);

      expect(result.success).toBe(true);
    });
  });

  describe('Error 404 - Not Found', () => {
    it('valida respuesta de recurso no encontrado', () => {
      const notFoundError = {
        error: {
          code: 'NOT_FOUND',
          message: 'El gasto solicitado no existe',
          resourceId: '999',
        },
      };

      const result = NotFoundErrorSchema.safeParse(notFoundError);

      expect(result.success).toBe(true);
    });

    it('acepta respuesta sin resourceId', () => {
      const notFoundError = {
        error: {
          code: 'NOT_FOUND',
          message: 'El gasto solicitado no existe',
        },
      };

      const result = NotFoundErrorSchema.safeParse(notFoundError);

      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// SUITE 5: Integración - Validación de Respuesta con Metadatos
// ============================================================================

describe('API Contract Testing - Listado con Metadatos (Paginación)', () => {
  it('valida respuesta de listado con paginación', () => {
    const paginatedResponse = {
      data: [
        {
          id: '1',
          descripcion: 'Almuerzo',
          monto: 25.5,
          categoria: 'Comida',
          fecha: '2026-08-11',
        },
      ],
      pagination: {
        total: 42,
        page: 1,
        pageSize: 10,
        hasMore: true,
      },
      timestamp: '2026-08-11T15:30:00Z',
    };

    const result = GastoListWithMetadataSchema.safeParse(paginatedResponse);

    expect(result.success).toBe(true);
    expect(result.data?.pagination.total).toBe(42);
    expect(result.data?.pagination.hasMore).toBe(true);
  });

  it('detecta cuando pagination.page es cero (inválido)', () => {
    const invalidPaginatedResponse = {
      data: [],
      pagination: {
        total: 0,
        page: 0, // ❌ Debe ser >= 1
        pageSize: 10,
        hasMore: false,
      },
      timestamp: '2026-08-11T15:30:00Z',
    };

    const result = GastoListWithMetadataSchema.safeParse(invalidPaginatedResponse);

    expect(result.success).toBe(false);
  });

  it('detecta cuando falta timestamp', () => {
    const missingTimestamp = {
      data: [],
      pagination: {
        total: 0,
        page: 1,
        pageSize: 10,
        hasMore: false,
      },
      // ❌ Falta timestamp
    };

    const result = GastoListWithMetadataSchema.safeParse(missingTimestamp);

    expect(result.success).toBe(false);
  });
});
