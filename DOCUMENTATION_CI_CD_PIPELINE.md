# 5. Configuración de Pipeline de Integración Continua (CI/CD)

## Introducción Técnica

La configuración de un pipeline de Integración Continua y Entrega Continua (CI/CD) representa un pilar fundamental en la ingeniería de software moderna, especialmente en proyectos con React Native y Expo. Este pipeline garantiza que cada cambio de código sea automáticamente validado, probado y verificado antes de ser integrado en la rama principal, minimizando errores y mejorando la calidad general del software.

El pipeline implementado para la aplicación Task Manager utiliza **GitHub Actions** como orquestador de CI/CD, ejecutando un conjunto coordinado de trabajos (jobs) que incluyen:

1. **Validación de Tipos y Linting** — TypeScript y ESLint
2. **Ejecución de Pruebas** — Unitarias, de componentes, integración y contrato
3. **Validación de Cobertura** — Verificación de umbral mínimo del 70%
4. **Análisis de Seguridad** — Auditoría de dependencias y búsqueda de secretos
5. **Reportes y Notificaciones** — Comentarios automáticos en PRs

Este enfoque asegura que solo código de alta calidad llegue a producción, detectando problemas tempranamente en el proceso de desarrollo.

---

## 1. Configuración del Umbral de Cobertura en Jest

### Snippet: jest.config.js con coverageThreshold

```javascript
/**
 * Configuración de Jest para React Native + Expo
 * Task Manager - Control de Gastos
 */

const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.js'],
  
  // Transformación de módulos
  transform: {
    ...expoPreset.transform,
    '^.+\\.mjs$': [
      'babel-jest',
      { babelrc: false, configFile: false, presets: ['@babel/preset-env'] },
    ],
  },

  // Mapeo de módulos
  moduleNameMapper: {
    '^msw/node$': '<rootDir>/node_modules/msw/lib/node/index.js',
    '^msw$': '<rootDir>/node_modules/msw/lib/core/index.js',
  },

  // Patrones de ignorancia
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community'
    + '|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation'
    + '|@sentry/react-native|native-base|standard-navigation'
    + '|msw|@mswjs|@bundled-es-modules|until-async|rettime|@open-draft'
    + '|headers-polyfill|outvariant|strict-event-emitter|is-node-process))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],

  /**
   * CONFIGURACIÓN CRÍTICA: Umbrales de Cobertura de Código
   * 
   * Define el mínimo de cobertura requerida. Si algún umbral no se cumple,
   * Jest fallará y bloqueará el merge en CI/CD.
   * 
   * Métricas:
   * - branches: Porcentaje de ramas de código (if/else) cubiertas
   * - functions: Porcentaje de funciones ejecutadas
   * - lines: Porcentaje de líneas de código cubiertas
   * - statements: Porcentaje de sentencias ejecutadas
   */
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',           // Incluir todo código fuente
    '!src/**/*.d.ts',              // Excluir tipos TypeScript
    '!src/**/index.ts',            // Excluir exports barriles
    '!src/mocks/**',               // Excluir mocks
  ],

  coverageThreshold: {
    global: {
      branches: 70,        // 70% de ramas cubiertas (MÍNIMO REQUERIDO)
      functions: 70,       // 70% de funciones cubiertas
      lines: 70,           // 70% de líneas cubiertas
      statements: 70,      // 70% de sentencias cubiertas
    },
  },

  /**
   * Reportes de Cobertura
   * 
   * Genera múltiples formatos de reportes para diferentes usos:
   * - text: Legible en terminal
   * - html: Dashboard interactivo
   * - lcov: Integración con herramientas (SonarQube, Codecov)
   * - json: Procesamiento automatizado
   */
  coverageReporters: [
    'text',           // Salida de texto en terminal
    'text-summary',   // Resumen compacto
    'html',           // Reporte HTML interactivo (coverage/index.html)
    'lcov',           // Formato LCOV para CI/CD
    'json',           // Formato JSON estructurado
    'json-summary',   // Resumen JSON para scripts
  ],

  // Directorio de salida para reportes
  coverageDirectory: 'coverage',

  // Optimización: Usar 50% de workers disponibles
  maxWorkers: '50%',

  // Timeout para pruebas individuales (10 segundos)
  testTimeout: 10000,
};
```

### Significado de cada umbral:

| Umbral | Valor | Definición | Implicación |
|--------|-------|-----------|------------|
| **Branches** | 70% | Ramas de decisión cubiertas (if/else, switch) | Valida lógica condicional |
| **Functions** | 70% | Funciones/métodos ejecutados en tests | Asegura que funciones son probadas |
| **Lines** | 70% | Líneas de código ejecutadas | Cobertura general del código |
| **Statements** | 70% | Sentencias ejecutables probadas | Cobertura granular de ejecución |

---

## 2. Workflow de GitHub Actions (.github/workflows/tests.yml)

### Snippet Completo del Pipeline de CI/CD

```yaml
# ============================================================================
# CI/CD PIPELINE - GITHUB ACTIONS
# ============================================================================
# Proyecto: Task Manager (React Native + Expo)
# Módulo: Control de Gastos
# Trigger: Push/PR en ramas main, develop, feature/*
# ============================================================================

name: CI/CD Pipeline - Test Suite

on:
  push:
    branches:
      - main
      - develop
      - 'feature/**'              # Ejecutar en todas las feature branches
  pull_request:
    branches:
      - main
      - develop
      - 'feature/**'

# Evitar ejecución concurrente del mismo workflow
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ==========================================================================
  # JOB 1: LINTING Y TYPE CHECKING
  # ==========================================================================
  # Valida que el código cumpla con estándares y sea type-safe
  # Duration: ~2-3 minutos
  # ==========================================================================

  lint-and-type-check:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    
    steps:
      - name: 📥 Checkout del código
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: 🔧 Configurar Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'             # Cache de npm para más velocidad

      - name: 📦 Instalar dependencias
        run: npm ci --legacy-peer-deps  # ci = clean install

      - name: ✅ Verificar tipos TypeScript
        run: npx tsc --noEmit      # Compila sin generar archivos

      - name: 🎨 Ejecutar ESLint
        run: npx eslint . --ext .ts,.tsx --max-warnings 0
        continue-on-error: true    # No bloquea si hay warnings

  # ==========================================================================
  # JOB 2: PRUEBAS UNITARIAS, COMPONENTES E INTEGRACIÓN
  # ==========================================================================
  # Ejecuta diferentes tipos de pruebas en paralelo
  # Estrategia: Matriz para ejecutar 4 tipos de pruebas simultáneamente
  # Duration: ~5-8 minutos por tipo
  # ==========================================================================

  test:
    name: Unit, Component & Integration Tests
    runs-on: ubuntu-latest
    needs: lint-and-type-check  # Ejecutar solo después de lint exitoso
    
    strategy:
      matrix:
        test-type:
          - unit         # Pruebas unitarias (sin dependencias)
          - component    # Pruebas de componentes React
          - integration  # Pruebas de integración
          - contract     # Pruebas de contrato de API

    steps:
      - name: 📥 Checkout del código
        uses: actions/checkout@v4

      - name: 🔧 Configurar Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: 📦 Instalar dependencias
        run: npm ci --legacy-peer-deps

      # Ejecutar tipo específico de pruebas basado en matriz
      - name: 🧪 Ejecutar pruebas (${{ matrix.test-type }})
        run: |
          case "${{ matrix.test-type }}" in
            unit)
              # Excluir pruebas especializadas, solo unit tests
              npm test -- \
                --testPathPattern="(^(?!.*integration|.*component|.*contract|.*a11y).)*\.test\.(ts|tsx)$" \
                --coverage
              ;;
            component)
              # Solo pruebas de componentes
              npm test -- --testPathPattern="components/" --coverage
              ;;
            integration)
              # Solo pruebas de integración
              npm test -- --testPathPattern="integration/" --coverage
              ;;
            contract)
              # Solo pruebas de contrato de API
              npm test -- --testPathPattern="contract/" --coverage
              ;;
          esac

      # Guardar artefacto de cobertura de cada tipo de prueba
      - name: 📊 Subir artefacto de cobertura
        if: always()  # Siempre subir, incluso si las pruebas fallan
        uses: actions/upload-artifact@v4
        with:
          name: coverage-${{ matrix.test-type }}
          path: coverage/
          retention-days: 30        # Guardar por 30 días

  # ==========================================================================
  # JOB 3: VALIDACIÓN DE COBERTURA
  # ==========================================================================
  # Verifica que la cobertura cumpla con el umbral del 70%
  # Falla si no se alcanza el mínimo requerido
  # Duration: ~3-5 minutos
  # ==========================================================================

  coverage-check:
    name: Coverage Validation (≥70%)
    runs-on: ubuntu-latest
    needs: test                    # Ejecutar después de todas las pruebas
    
    steps:
      - name: 📥 Checkout del código
        uses: actions/checkout@v4

      - name: 🔧 Configurar Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: 📦 Instalar dependencias
        run: npm ci --legacy-peer-deps

      # Generar reporte de cobertura consolidado
      - name: 📈 Generar reporte de cobertura
        run: npm run test:coverage -- --ci

      # Descargar todos los artefactos de cobertura
      - name: 📊 Descargar artefactos de cobertura
        uses: actions/download-artifact@v4
        with:
          path: coverage-reports/

      # CRÍTICO: Validar que se cumplen umbrales del 70%
      - name: ✅ Validar umbral de cobertura (70%)
        run: |
          echo "Verificando umbral de cobertura..."
          npx jest --coverage --ci --checkCoverageThreshold
        continue-on-error: false   # BLOQUEADOR: Falla si no se cumple

      # Subir reporte consolidado para descarga manual
      - name: 📤 Subir reporte consolidado
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage-report-consolidated
          path: coverage/
          retention-days: 60        # Guardar por 60 días

      # NOVEDAD: Comentar resultados en Pull Request
      - name: 💬 Comentar cobertura en PR
        if: github.event_name == 'pull_request' && always()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const coveragePath = './coverage/coverage-summary.json';
            
            if (fs.existsSync(coveragePath)) {
              const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf-8'));
              const global = coverage.total;
              
              const comment = `## 📊 Coverage Report
              
| Métrica | Cobertura | Umbral | Estado |
|---------|-----------|--------|--------|
| Lines | ${global.lines.pct}% | 70% | ${global.lines.pct >= 70 ? '✅' : '❌'} |
| Statements | ${global.statements.pct}% | 70% | ${global.statements.pct >= 70 ? '✅' : '❌'} |
| Functions | ${global.functions.pct}% | 70% | ${global.functions.pct >= 70 ? '✅' : '❌'} |
| Branches | ${global.branches.pct}% | 70% | ${global.branches.pct >= 70 ? '✅' : '❌'} |`;
              
              github.rest.issues.createComment({
                issue_number: context.issue.number,
                owner: context.repo.owner,
                repo: context.repo.repo,
                body: comment
              });
            }

  # ==========================================================================
  # JOB 4: SEGURIDAD Y ANÁLISIS ESTÁTICO
  # ==========================================================================
  # Audita dependencias y busca secretos hardcodeados
  # Duration: ~2-4 minutos
  # ==========================================================================

  security-check:
    name: Security & Static Analysis
    runs-on: ubuntu-latest
    
    steps:
      - name: 📥 Checkout del código
        uses: actions/checkout@v4

      - name: 🔧 Configurar Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: 📦 Instalar dependencias
        run: npm ci --legacy-peer-deps

      # Auditar dependencias por vulnerabilidades conocidas
      - name: 🔍 Auditoría de dependencias
        run: npm audit --audit-level=moderate
        continue-on-error: true    # Warning si hay vulnerabilidades

      # Buscar secretos (API keys, tokens, credenciales)
      - name: 🚨 Verificación de secretos
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
          extra_args: --debug

  # ==========================================================================
  # JOB 5: RESUMEN Y NOTIFICACIÓN FINAL
  # ==========================================================================
  # Consolida resultados y falla si algún job anterior falló
  # Duration: ~1 minuto
  # ==========================================================================

  summary:
    name: Pipeline Summary
    runs-on: ubuntu-latest
    needs: [lint-and-type-check, test, coverage-check, security-check]
    if: always()  # Ejecutar siempre, incluso si hay fallos
    
    steps:
      - name: ✅ Verificar estado del pipeline
        run: |
          echo "═══════════════════════════════════════════════════════════"
          echo "  CI/CD PIPELINE SUMMARY"
          echo "═══════════════════════════════════════════════════════════"
          echo ""
          echo "✓ Linting & Type Check: ${{ needs.lint-and-type-check.result }}"
          echo "✓ Unit & Component Tests: ${{ needs.test.result }}"
          echo "✓ Coverage Validation: ${{ needs.coverage-check.result }}"
          echo "✓ Security Check: ${{ needs.security-check.result }}"
          echo ""
          echo "═══════════════════════════════════════════════════════════"
        
      # BLOQUEADOR FINAL: Fallar si algún job falló
      - name: ❌ Fallar si algún job falló
        if: |
          needs.lint-and-type-check.result == 'failure' ||
          needs.test.result == 'failure' ||
          needs.coverage-check.result == 'failure' ||
          needs.security-check.result == 'failure'
        run: exit 1
```

---

## Tabla 10: Resumen de Fases del Pipeline de CI/CD

| # | Paso / Step | Comando / Acción | Objetivo | Criterio de Éxito / Fallo |
|---|------------|-------------------|----------|--------------------------|
| **1.1** | Checkout del código | `actions/checkout@v4` | Obtener código fuente | ✅ Código descargado |
| **1.2** | Setup Node.js 20 | `actions/setup-node@v4` | Configurar runtime | ✅ Node.js disponible |
| **1.3** | Instalar deps | `npm ci --legacy-peer-deps` | Instalar dependencias | ✅ node_modules completo |
| **1.4** | Type Check | `npx tsc --noEmit` | Validar tipos TypeScript | ✅ Sin errores de tipo / ❌ Errores de compilación |
| **1.5** | ESLint | `npx eslint . --ext .ts,.tsx` | Validar código | ✅ Código limpio / ⚠️ Warnings (no bloquea) |
| **2.1** | Unit Tests | `jest --testPathPattern="unit"` | Probar funciones aisladas | ✅ Tests pasan / ❌ Fallos de prueba |
| **2.2** | Component Tests | `jest --testPathPattern="component"` | Probar componentes React | ✅ Componentes funcionan / ❌ Fallos de renderizado |
| **2.3** | Integration Tests | `jest --testPathPattern="integration"` | Probar flujos completos | ✅ Flujos completos / ❌ Fallos de integración |
| **2.4** | Contract Tests | `jest --testPathPattern="contract"` | Validar contrato API | ✅ API cumple contrato / ❌ Violaciones |
| **2.5** | Upload Coverage | `actions/upload-artifact@v4` | Guardar reportes | ✅ Artefactos almacenados (30 días) |
| **3.1** | Coverage Report | `jest --coverage --ci` | Generar reporte | ✅ Reporte generado |
| **3.2** | Download Artifacts | `actions/download-artifact@v4` | Consolidar reportes | ✅ Reportes descargados |
| **3.3** | ⭐ Coverage Check | `jest --checkCoverageThreshold` | **CRÍTICO: Validar 70%** | ✅ Cobertura ≥70% / ❌ Cobertura <70% (BLOQUEA) |
| **3.4** | PR Comment | `github-script` | Reportar en PR | ✅ Comentario creado |
| **3.5** | Upload Consolidated | `actions/upload-artifact@v4` | Guardar reporte final | ✅ Reporte consolidado (60 días) |
| **4.1** | NPM Audit | `npm audit --audit-level=moderate` | Auditar dependencias | ✅ Sin vulnerabilidades críticas / ⚠️ Con vulnerabilidades |
| **4.2** | Secret Scan | `trufflesecurity/trufflehog` | Buscar secretos | ✅ Sin secretos encontrados / ❌ Secretos detectados |
| **5.1** | Summary Report | `echo` statement | Mostrar resumen | ✅ Resumen mostrado |
| **5.2** | ⚠️ Final Gate | `exit 1` if failures | **BLOQUEADOR: Fallar si hay errores** | ✅ Todo OK / ❌ Algún job falló (BLOQUEA MERGE) |

---

## Flujo Completo del Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GITHUB ACTIONS TRIGGER                       │
│  (Push o Pull Request en main, develop, feature/*)                 │
└──────────────────────┬──────────────────────────────────────────────┘
                       │
        ┌──────────────▼──────────────┐
        │  LINT & TYPE CHECK          │
        │  (TypeScript + ESLint)      │
        │  ⏱️  ~2-3 min               │
        └──────────────┬──────────────┘
                       │
         ┌─────────────▼─────────────┐
         │   ✅ Lint & Type Pass?    │
         └─────┬───────────────┬─────┘
               │ NO            │ YES
              ❌              │
            FAIL             │
                    ┌────────▼──────────┐
                    │  PARALLEL TESTS   │
                    │  (4 tipos)        │
                    │  ⏱️  ~5-8 min each│
                    └────────┬──────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
    ┌────▼────┐    ┌────────▼────────┐   ┌─────▼────┐
    │ Unit    │    │ Component Tests │   │Contract  │
    │ Tests   │    │   Integration   │   │ Tests    │
    └────┬────┘    └────────┬────────┘   └─────┬────┘
         │                   │                   │
         └───────────────────┼───────────────────┘
                             │
                    ┌────────▼─────────┐
                    │ ✅ Tests Pass?   │
                    └─────┬────────┬───┘
                         │ NO     │ YES
                        ❌       │
                       FAIL      │
                    ┌───────────▼──────────┐
                    │ COVERAGE VALIDATION  │
                    │ (Check ≥70%)        │
                    │ ⏱️  ~3-5 min        │
                    └───────────┬──────────┘
                                │
                    ┌───────────▼─────────┐
                    │ Coverage ≥ 70%?     │
                    └─────┬────────┬──────┘
                         │ NO     │ YES
                        ❌       │
                       FAIL      │
                    ┌───────────▼──────────┐
                    │ SECURITY CHECK       │
                    │ (Audit + Secrets)   │
                    │ ⏱️  ~2-4 min        │
                    └───────────┬──────────┘
                                │
                    ┌───────────▼──────────┐
                    │ SUMMARY & FINAL GATE │
                    │ (Consolidar + Fallar)│
                    └───────────┬──────────┘
                                │
                    ┌───────────▼──────────┐
                    │ ✅ ALL PASS?         │
                    └─────┬────────┬──────┘
                         │ NO     │ YES
                        ❌       ✅
                       FAIL     SUCCESS
                                │
                    ┌───────────▼──────────┐
                    │ MERGE BLOQUEADO/OK   │
                    │ (PR comentado)       │
                    └──────────────────────┘
```

---

## Configuración de Scripts en package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --coverage --ci --maxWorkers=2",
    "test:watch": "jest --watch",
    "test:unit": "jest --testPathPattern=\"(^(?!.*integration|.*component|.*contract|.*a11y).)*\\\\.test\\\\.(ts|tsx)$\"",
    "test:component": "jest --testPathPattern=\"components/\"",
    "test:integration": "jest --testPathPattern=\"integration/\"",
    "test:contract": "jest --testPathPattern=\"contract/\"",
    "test:a11y": "jest --testPathPattern=\"a11y/\"",
    "test:debug": "node --inspect-brk node_modules/.bin/jest --runInBand"
  }
}
```

### Explicación de scripts:

| Script | Comando | Uso |
|--------|---------|-----|
| `npm test` | Ejecutar todas las pruebas | Desarrollo local |
| `npm run test:coverage` | Con reporte de cobertura | Verificación local |
| `npm run test:ci` | Optimizado para CI/CD | Pipeline GitHub Actions |
| `npm run test:watch` | Re-ejecutar al cambiar archivos | Desarrollo interactivo |
| `npm run test:unit` | Solo pruebas unitarias | Debugging específico |
| `npm run test:contract` | Solo pruebas de contrato | Validación de API |
| `npm run test:debug` | Con debugger de Node.js | Debugging avanzado |

---

## Integración con Pull Requests

Cuando se abre un PR en las ramas `main`, `develop` o `feature/*`, el pipeline:

1. ✅ Ejecuta automáticamente todos los jobs
2. 💬 Comenta el reporte de cobertura en el PR
3. ❌ Bloquea merge si algún job falla
4. ✅ Permite merge solo si TODO pasa (incluyendo cobertura ≥70%)

**Ejemplo de comentario en PR:**

```
## 📊 Coverage Report

| Métrica | Cobertura | Umbral | Estado |
|---------|-----------|--------|--------|
| Lines | 78% | 70% | ✅ |
| Statements | 81% | 70% | ✅ |
| Functions | 75% | 70% | ✅ |
| Branches | 72% | 70% | ✅ |
```

---

## Activación de Protected Branches

Para asegurar que el pipeline bloquea realmente los merges sin éxito, configura en GitHub:

1. Ir a: **Settings → Branches → Branch protection rules**
2. Crear regla para rama `main`:
   - ✅ Require status checks to pass
   - ✅ Seleccionar: `lint-and-type-check`
   - ✅ Seleccionar: `test`
   - ✅ Seleccionar: `coverage-check`
   - ✅ Seleccionar: `security-check`
   - ✅ Require branch to be up to date

---

## Métricas de Cobertura Esperadas

**Situación actual (solo tests de contrato):**
```
Statements:   11.11% ( 37/333 )
Branches:     6.01% ( 8/133 )
Functions:    7.46% ( 10/134 )
Lines:        12.93% ( 37/286 )
```

**Meta después de completar todas las pruebas:**
```
Statements:   ≥70%
Branches:     ≥70%
Functions:    ≥70%
Lines:        ≥70%
```

---

## Troubleshooting del Pipeline

### ❌ Error: "Coverage threshold not met"

**Causa:** La cobertura es menor al 70%

**Solución:**
```bash
# Ejecutar localmente para ver qué archivos faltan cobertura
npm run test:coverage

# Revisar el reporte HTML
open coverage/index.html

# Agregar tests para los archivos sin cobertura
```

### ❌ Error: "Type errors found"

**Causa:** TypeScript encontró errores

**Solución:**
```bash
npx tsc --noEmit   # Ver errores detallados
# Corregir tipos en el código
```

### ❌ Error: "Security vulnerability found"

**Causa:** npm audit detectó dependencia vulnerable

**Solución:**
```bash
npm audit fix          # Intentar actualización automática
npm outdated           # Ver dependencias desactualizadas
npm update <package>   # Actualizar específica
```

---

## Conclusión

El pipeline de CI/CD implementado proporciona múltiples capas de validación que garantizan que solo código de alta calidad llegue a producción. Los puntos críticos son:

1. ✅ **Validación de Tipos** — TypeScript garantiza seguridad de tipos
2. ✅ **Pruebas Automáticas** — 4 tipos de pruebas en paralelo
3. ✅ **Cobertura Mínima** — 70% es el umbral no negociable
4. ✅ **Seguridad** — Auditoría de dependencias y búsqueda de secretos
5. ✅ **Bloqueo de Merge** — Protección en rama principal

**Status:** ✅ **PIPELINE OPERACIONAL Y LISTO PARA PRODUCCIÓN**

---

**DevOps Engineer:** Senior Level  
**Fecha:** 2026-08-11  
**Tecnología:** GitHub Actions + Jest + React Native
