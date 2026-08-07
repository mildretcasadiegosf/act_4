import { Gasto } from '../types';

export type FiltroGastos = 'all' | 'week' | 'month';

const startOfWeek = (date: Date) => {
  const result = new Date(date);
  const day = result.getDay() || 7;
  result.setDate(result.getDate() - day + 1);
  result.setHours(0, 0, 0, 0);
  return result;
};

export function filterGastos(gastos: Gasto[], filtro: FiltroGastos, today = new Date()): Gasto[] {
  if (filtro === 'all') return gastos;
  const weekStart = startOfWeek(today);
  return gastos.filter((gasto) => {
    const fecha = new Date(`${gasto.fecha}T00:00:00`);
    if (filtro === 'week') return fecha >= weekStart && fecha <= today;
    return fecha.getFullYear() === today.getFullYear() && fecha.getMonth() === today.getMonth();
  });
}

export const totalGastos = (gastos: Gasto[]) =>
  gastos.reduce((total, gasto) => total + gasto.monto, 0);
