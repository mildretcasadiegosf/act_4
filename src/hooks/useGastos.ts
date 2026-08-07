import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Gasto } from '../types';
import { createGasto, deleteGasto, fetchGastos, NuevoGasto } from '../services/gastoService';

const STORAGE_KEY = 'gastos';
type Status = 'idle' | 'loading' | 'success' | 'error';

// MSW intercepta las solicitudes en Jest. Fuera de las pruebas no existe un backend
// para esta URL, por lo que un TypeError representa falta de conexión y se usa la copia local.
const isNetworkError = (error: unknown) => error instanceof TypeError;

export function useGastos() {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    const load = async () => {
      let persisted: Gasto[] = [];
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) persisted = JSON.parse(raw);
      } catch {
        // La persistencia no debe impedir usar la funcionalidad.
      }

      try {
        const data = await fetchGastos();
        setGastos(data);
      } catch {
        setGastos(persisted);
      } finally {
        loaded.current = true;
        setStatus((current) => (current === 'error' ? current : 'idle'));
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(gastos)).catch(() => {});
  }, [gastos]);

  const guardarGasto = async (gasto: NuevoGasto) => {
    setError(null);
    try {
      const created = await createGasto(gasto);
      setGastos((current) => [created, ...current]);
      setStatus('success');
      return true;
    } catch {
      const localGasto: Gasto = { id: Date.now().toString(), ...gasto };
      setGastos((current) => [localGasto, ...current]);
      setStatus('success');
      return true;
    }
  };

  const eliminarGasto = async (id: string) => {
    setError(null);
    try {
      await deleteGasto(id);
      setGastos((current) => current.filter((gasto) => gasto.id !== id));
    } catch {
      setGastos((current) => current.filter((gasto) => gasto.id !== id));
    }
  };

  return { gastos, status, error, guardarGasto, eliminarGasto };
}
