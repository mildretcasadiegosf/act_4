const expoPreset = require('jest-expo/jest-preset');

module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['./jest.setup.js'],
  // ponytail: jest-expo's transform only matches .[jt]sx; msw ships .mjs deps
  // (rettime, @mswjs/interceptors). Add a .mjs -> babel-jest rule alongside them.
  transform: {
    ...expoPreset.transform,
    '^.+\\.mjs$': [
      'babel-jest',
      { babelrc: false, configFile: false, presets: ['@babel/preset-env'] },
    ],
  },
  // ponytail: jest-expo resolves msw's `react-native`/`browser` export (null),
  // so point msw's entry points at its CJS build directly.
  moduleNameMapper: {
    '^msw/node$': '<rootDir>/node_modules/msw/lib/node/index.js',
    '^msw$': '<rootDir>/node_modules/msw/lib/core/index.js',
  },
  // Extends jest-expo's default so babel also transforms msw's ESM-only deps.
  transformIgnorePatterns: [
    '/node_modules/(?!(.pnpm|react-native|@react-native|@react-native-community'
    + '|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation'
    + '|@sentry/react-native|native-base|standard-navigation'
    + '|msw|@mswjs|@bundled-es-modules|until-async|rettime|@open-draft'
    + '|headers-polyfill|outvariant|strict-event-emitter|is-node-process))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/mocks/**',
  ],
  /**
   * UMBRALES DE COBERTURA DE CÓDIGO (70% mínimo)
   * 
   * Estos valores definen el mínimo de cobertura de código requerido
   * para que el pipeline de CI/CD sea exitoso. Si alguno de estos
   * umbrales no se cumple, Jest fallará y bloqueará el merge.
   * 
   * Explicación de métricas:
   * - branches: Porcentaje de ramas de código alcanzadas por pruebas
   * - functions: Porcentaje de funciones ejecutadas en pruebas
   * - lines: Porcentaje de líneas de código cubiertas
   * - statements: Porcentaje de sentencias ejecutadas
   */
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  /**
   * Configuración de reportes de cobertura
   */
  coverageReporters: [
    'text',           // Reporte en texto para terminal
    'text-summary',   // Resumen de texto
    'html',           // Reporte HTML interactivo
    'lcov',           // Formato LCOV para integración con herramientas
    'json',           // Formato JSON para procesamiento automatizado
    'json-summary',   // Resumen JSON
  ],

  /**
   * Directorio de salida para reportes de cobertura
   */
  coverageDirectory: 'coverage',

  /**
   * Configuración de paralelismo
   */
  maxWorkers: '50%',

  /**
   * Configuración de timeouts
   */
  testTimeout: 10000,
};
