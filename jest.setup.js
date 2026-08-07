require('@testing-library/jest-native/extend-expect');

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

const { server } = require('./src/mocks/server');
const { resetTasks, resetGastos } = require('./src/mocks/handlers');

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  server.resetHandlers();
  resetTasks();
  resetGastos();
});
afterAll(() => server.close());
