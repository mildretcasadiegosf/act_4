import { Gasto } from '../types';

const API_URL = 'https://api.taskmanager.com';

export type NuevoGasto = Omit<Gasto, 'id'>;

export async function fetchGastos(): Promise<Gasto[]> {
  const res = await fetch(`${API_URL}/gastos`);
  if (!res.ok) throw new Error('Error al obtener los gastos');
  return res.json();
}

export async function createGasto(gasto: NuevoGasto): Promise<Gasto> {
  const res = await fetch(`${API_URL}/gastos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(gasto),
  });
  if (!res.ok) throw new Error('Error al guardar el gasto');
  return res.json();
}

export async function deleteGasto(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/gastos/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Error al eliminar el gasto');
}
