import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { http, HttpResponse } from 'msw';
import { ControlGastosScreen } from '../../src/screens/ControlGastosScreen';
import { server } from '../../src/mocks/server';

const API_URL = 'https://api.taskmanager.com';
const metrics = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const renderScreen = () =>
  render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ControlGastosScreen />
    </SafeAreaProvider>
  );

const fillGasto = async () => {
  await fireEvent.changeText(screen.getByTestId('input-descripcion'), 'Almuerzo');
  await fireEvent.changeText(screen.getByTestId('input-monto'), '25.5');
  await fireEvent.press(screen.getByText('Comida'));
  await fireEvent.changeText(screen.getByTestId('input-fecha'), '2026-08-03');
};

describe('ControlGastosScreen - Integración', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('registra un gasto y actualiza la lista y el total', async () => {
    await renderScreen();
    await waitFor(() => expect(screen.getByText('No hay gastos registrados')).toBeTruthy());

    await fillGasto();
    await fireEvent.press(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(screen.getByText('Gasto guardado exitosamente')).toBeTruthy();
      expect(screen.getByText('Almuerzo')).toBeTruthy();
      expect(screen.getAllByText('$25.50')).toHaveLength(2);
    });
  });

  it('guarda localmente cuando la API falla', async () => {
    server.use(http.post(`${API_URL}/gastos`, () => new HttpResponse(null, { status: 500 })));
    await renderScreen();
    await waitFor(() => expect(screen.getByText('No hay gastos registrados')).toBeTruthy());

    await fillGasto();
    await fireEvent.press(screen.getByText('Guardar'));

    await waitFor(() => {
      expect(screen.getByText('Gasto guardado exitosamente')).toBeTruthy();
      expect(screen.getByText('Almuerzo')).toBeTruthy();
    });
    expect(screen.queryByText('Error al guardar el gasto')).toBeNull();
  });

  it('maneja una respuesta de API vacía sin registros', async () => {
    server.use(http.get(`${API_URL}/gastos`, () => HttpResponse.json([])));
    await renderScreen();

    await waitFor(() => {
      expect(screen.getByText('No hay gastos registrados')).toBeTruthy();
      expect(screen.getByText('$0.00')).toBeTruthy();
    });
  });
});
