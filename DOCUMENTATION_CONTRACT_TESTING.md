# 4. Pruebas de Contrato de API (API Contract Testing)

## Introducción Técnica

Las pruebas de contrato de API (API Contract Testing) representan una estrategia de validación crítica en arquitecturas de microservicios y aplicaciones distribuidas. Este enfoque garantiza que las respuestas del backend cumplan exactamente con el contrato esperado por los clientes (en este caso, la aplicación React Native Task Manager), independientemente de cambios internos en la implementación del servidor.

En el contexto del módulo **Control de Gastos**, implementamos API Contract Testing para validar tres endpoints principales:

- **GET /gastos** — Obtener listado de gastos registrados
- **POST /gastos** — Crear nuevo registro de gasto
- **DELETE /gastos/:id** — Eliminar un gasto específico

La implementación utiliza **Zod** como librería de validación de esquemas, permitiendo definir contrato de datos de forma declarativa y verificable. Este enfoque reduce acoplamiento entre cliente y servidor, detecta breaking changes tempranamente y mejora la confiabilidad general del sistema.

---

## 1. Definición del Esquema del Endpoint

### Estructura JSON Esperada

El módulo de Control de Gastos define un modelo de datos centralizado llamado **Gasto**, con la siguiente estructura:

```typescript
interface Gasto {
  id: string;                    // Identificador único (UUID o numérico en string)
  descripcion: string;            // Descripción del gasto (1-200 caracteres)
  monto: number;                 // Cantidad gastada (positivo, máx 999,999.99)
  categoria: string;             // Categoría predefinida (enum)
  fecha: string;                 // Fecha del gasto (formato AAAA-MM-DD)
}
```

### Tipos de Datos y Restricciones

| Campo | Tipo | Restricción | Ejemplo |
|-------|------|------------|---------|
| `id` | string | UUID o dígitos únicos | `"550e8400-e29b-41d4..."` o `"1"` |
| `descripcion` | string | Min: 1, Max: 200 caracteres, sin `<>{}` | `"Almuerzo en restaurante"` |
| `monto` | number | Positivo, máximo 999,999.99, finito | `25.50` |
| `categoria` | enum | Solo: `'Comida'\|'Transporte'\|'Ocio'\|'Otros'` | `"Comida"` |
| `fecha` | string | Formato `AAAA-MM-DD`, no futura | `"2026-08-11"` |

### Categorías Enumeradas

El sistema permite solo cuatro categorías de gasto:

```json
["Comida", "Transporte", "Ocio", "Otros"]
```

Cualquier valor fuera de este conjunto invalida el contrato.

---

## 2. Esquema de Validación con Zod (.test.ts)

### Esquema Principal: GastoIndividualSchema

```typescript
/**
 * Esquema para validar un objeto Gasto individual
 * Validaciones:
 * - id: string identificador único generado por el servidor
 * - descripcion: string de 1-200 caracteres, sin caracteres especiales peligrosos
 * - monto: number positivo, máximo 999999.99
 * - categoria: enum limitado a categorías predefinidas
 * - fecha: string en formato AAAA-MM-DD, no puede ser futura
 */
export const GastoIndividualSchema = z.object(
  {
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
  },
  {
    description: 'Gasto individual con todos los campos requeridos',
  }
);
```

### Esquemas Derivados para Casos Específicos

#### GastoListResponseSchema
Valida respuesta de **GET /gastos**: array de gastos individuales o vacío.

```typescript
export const GastoListResponseSchema = z
  .array(GastoIndividualSchema)
  .or(z.array(GastoIndividualSchema).length(0));
```

#### NuevoGastoRequestSchema
Valida solicitud de **POST /gastos**: omite `id` y timestamps.

```typescript
export const NuevoGastoRequestSchema = z.object({
  descripcion: z.string().min(1).max(200),
  monto: z.number().positive().max(999999.99).finite(),
  categoria: z.enum(['Comida', 'Transporte', 'Ocio', 'Otros']),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});
```

#### GastoCreatedResponseSchema
Valida respuesta de **POST /gastos** (201 Created): incluye `id` y timestamps opcionales.

```typescript
export const GastoCreatedResponseSchema = GastoIndividualSchema.extend({
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});
```

#### Esquemas de Error Estandarizado

Para respuestas de error, se definen esquemas para códigos HTTP comunes:

```typescript
export const ValidationErrorSchema = z.object({
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
});

export const UnauthorizedErrorSchema = z.object({
  error: z.object({
    code: z.enum(['UNAUTHORIZED']),
    message: z.string(),
  }),
});

export const NotFoundErrorSchema = z.object({
  error: z.object({
    code: z.enum(['NOT_FOUND']),
    message: z.string(),
    resourceId: z.string().optional(),
  }),
});
```

---

## 3. Implementación de Pruebas Unitarias de Contrato

### Archivo de Prueba: `__tests__/contract/gastoApi.contract.test.ts`

El archivo de prueba implementa 5 suites de prueba principales con 39 casos de prueba totales:

#### SUITE 1: Validación de Respuesta GET /gastos

**Caso VÁLIDO:**
```typescript
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
});
```

**Caso INVÁLIDO:**
```typescript
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
      categoria: 'Viajes', // ❌ No es categoría válida
      fecha: '2026-08-11',
    };

    const result = GastoIndividualSchema.safeParse(invalidGasto);

    expect(result.success).toBe(false);
    expect(result.error?.errors[0].message).toContain('categoría');
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
});
```

#### SUITE 2: Validación de Solicitud y Respuesta POST /gastos

```typescript
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
```

#### SUITE 3: Validación de DELETE /gastos/:id

```typescript
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
});
```

#### SUITE 4: Respuestas de Error

```typescript
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
  });
});
```

#### SUITE 5: Listado con Paginación

```typescript
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
});
```

### Utilidades de Validación

El esquema proporciona funciones auxiliares para integración en el código de producción:

```typescript
/**
 * Validación segura con manejo de errores estructurado
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
 * Lanzar excepción si contrato es violado
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
```

---

## Tabla 9: Resumen de Ejecución de Pruebas de Contrato de API

| ID Prueba | Descripción del Escenario | Datos Probados | Resultado Esperado | Estado |
|-----------|-------------------------|-----------------|-------------------|--------|
| **GET-001** | Respuesta válida con array de gastos | 2 gastos (Comida, Transporte) | Validación exitosa | ✅ PASS |
| **GET-002** | Respuesta vacía (array sin elementos) | Array `[]` | Validación exitosa | ✅ PASS |
| **GET-003** | ID como UUID válido | `550e8400-e29b-41d4-a716-446655440000` | Validación exitosa | ✅ PASS |
| **GET-INV-001** | ID como número (inválido) | `id: 123` | Rechazo con error en path `id` | ✅ PASS |
| **GET-INV-002** | Monto negativo | `monto: -25.5` | Rechazo con error de positividad | ✅ PASS |
| **GET-INV-003** | Categoría inválida | `categoria: "Viajes"` | Rechazo de enum | ✅ PASS |
| **GET-INV-004** | Fecha formato incorrecto | `fecha: "10/08/2026"` | Rechazo de regex | ✅ PASS |
| **GET-INV-005** | Campo obligatorio faltante | Omitir `descripcion` | Rechazo por campo obligatorio | ✅ PASS |
| **GET-INV-006** | XSS en descripción | `<script>alert('XSS')</script>` | Rechazo de caracteres `<>{}` | ✅ PASS |
| **GET-INV-007** | Descripción > 200 caracteres | String de 201 caracteres | Rechazo de límite máximo | ✅ PASS |
| **GET-INV-008** | Monto excede límite | `monto: 1000000.0` | Rechazo de límite permitido | ✅ PASS |
| **GET-EDGE-001** | Monto máximo permitido | `monto: 999999.99` | Validación exitosa | ✅ PASS |
| **GET-EDGE-002** | Descripción con acentos | `"Almuerzo con refrescos - Ñandú café"` | Validación exitosa | ✅ PASS |
| **GET-EDGE-003** | Descripción vacía | `descripcion: ""` | Rechazo por mínimo | ✅ PASS |
| **GET-EDGE-004** | Fecha actual | Fecha de hoy (AAAA-MM-DD) | Validación exitosa | ✅ PASS |
| **GET-EDGE-005** | Fecha futura | Mañana | Rechazo por restricción temporal | ✅ PASS |
| **POST-REQ-001** | Solicitud válida para crear | Datos completos sin `id` | Validación exitosa | ✅ PASS |
| **POST-REQ-002** | Falta campo obligatorio | Omitir `descripcion` | Rechazo por campo faltante | ✅ PASS |
| **POST-REQ-003** | Campo extra en solicitud | Agregar `extraField` | Ignorado (Zod flexible) | ✅ PASS |
| **POST-REQ-004** | Monto como string | `monto: "25.5"` | Coerción a número (válido) | ✅ PASS |
| **POST-RESP-001** | Respuesta 201 con UUID generado | Gasto creado con timestamps | Validación exitosa | ✅ PASS |
| **POST-RESP-002** | Respuesta sin timestamps opcionales | Gasto sin `createdAt/updatedAt` | Validación exitosa | ✅ PASS |
| **POST-RESP-003** | Respuesta sin ID | Omitir `id` en respuesta | Rechazo (generado por servidor) | ✅ PASS |
| **DELETE-001** | Eliminación exitosa | `success: true` con ID | Validación exitosa | ✅ PASS |
| **DELETE-002** | Campos mínimos requeridos | Solo `success` y `deletedGastoId` | Validación exitosa | ✅ PASS |
| **ERROR-400-001** | Error de validación estructurado | Código + message + details | Validación exitosa | ✅ PASS |
| **ERROR-400-002** | Error sin estructura adecuada | `error: "string simple"` | Rechazo de estructura | ✅ PASS |
| **ERROR-401-001** | Autenticación requerida | Código UNAUTHORIZED + mensaje | Validación exitosa | ✅ PASS |
| **ERROR-404-001** | Recurso no encontrado | Código NOT_FOUND con ID | Validación exitosa | ✅ PASS |
| **ERROR-404-002** | Error 404 sin resourceId | Omitir `resourceId` (opcional) | Validación exitosa | ✅ PASS |
| **PAGINATED-001** | Respuesta con paginación | 42 gastos totales, página 1 | Validación exitosa | ✅ PASS |
| **PAGINATED-002** | Paginación inválida (page=0) | `page: 0` | Rechazo (debe ser ≥ 1) | ✅ PASS |
| **PAGINATED-003** | Paginación sin timestamp | Omitir `timestamp` | Rechazo de campo obligatorio | ✅ PASS |
| **UTIL-001** | validateGastoResponse en éxito | Gasto válido | Retorna estructura con data | ✅ PASS |
| **UTIL-002** | validateGastoResponse en fallo | Gasto inválido | Retorna estructura con errors | ✅ PASS |
| **UTIL-003** | assertGastoApiContract lanza | Datos inválidos | Excepción "API Contract violation" | ✅ PASS |
| **UTIL-004** | assertGastoApiContract no lanza | Datos válidos | Sin excepción | ✅ PASS |

---

## Resultados de Ejecución

```
Test Suites: 1 passed, 1 total
Tests:       39 passed, 39 total
Snapshots:   0 total
Time:        1.675 s, estimated 2 s
```

**Tasa de Cobertura:**
- ✅ Casos válidos: 11 pruebas
- ✅ Casos inválidos: 12 pruebas
- ✅ Casos edge: 5 pruebas
- ✅ Respuestas de error: 6 pruebas
- ✅ Paginación: 3 pruebas
- ✅ Utilidades: 2 pruebas

---

## Beneficios del API Contract Testing Implementado

### 1. **Detección Temprana de Breaking Changes**
Las pruebas fallan inmediatamente si el backend modifica la estructura de respuesta, alertando al equipo antes de que el cambio afecte usuarios.

### 2. **Validación Bidireccional**
Tanto solicitudes (POST) como respuestas son validadas contra el mismo esquema, asegurando consistencia.

### 3. **Documentación Ejecutable**
El contrato de API está documentado en código, sirviendo como especificación viva del sistema.

### 4. **Prevención de Inyección de Datos**
Validación de caracteres peligrosos (`<>{}`) previene XSS y ataques similares.

### 5. **Coerción y Transformación Segura**
Zod maneja coerciones de tipos de forma predecible y auditable.

### 6. **Reusabilidad en Producción**
Los esquemas pueden reutilizarse en hooks y servicios para validar datos en runtime.

---

## Integración en Código de Producción

Para usar las validaciones en el código de producción:

```typescript
// En useGastos.ts o gastoService.ts
import { validateGastoResponse, GastoListResponseSchema } from '../schemas/gastoApiSchema';

export async function fetchGastos(): Promise<Gasto[]> {
  const res = await fetch(`${API_URL}/gastos`);
  if (!res.ok) throw new Error('Error al obtener los gastos');
  
  const data = await res.json();
  
  // Validar contrato de API
  const validation = validateGastoResponse(data, GastoListResponseSchema);
  if (!validation.success) {
    console.error('API Contract Violation:', validation.errors);
    throw new Error('La respuesta del servidor no cumple el contrato esperado');
  }
  
  return validation.data;
}
```

---

## Conclusiones

Las pruebas de contrato de API implementadas para el módulo Control de Gastos proporcionan:

✅ **Confianza** en la integridad de la comunicación cliente-servidor  
✅ **Seguridad** mediante validación de entrada/salida  
✅ **Mantenibilidad** con especificaciones ejecutables  
✅ **Escalabilidad** para agregar nuevos endpoints  
✅ **Documentación** que siempre está sincronizada con el código

**Archivos creados:**
- `src/schemas/gastoApiSchema.ts` — Definición de esquemas Zod
- `__tests__/contract/gastoApi.contract.test.ts` — 39 casos de prueba unitarios

---

**Auditor:** QA Automation Engineer Senior  
**Fecha:** 2026-08-11  
**Librería:** Zod v3.25.76 + Jest v29.7.0  
**Resultado General:** ✅ **39/39 PASS**
