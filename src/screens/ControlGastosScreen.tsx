import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GastoForm } from '../components/GastoForm';
import { GastoList } from '../components/GastoList';
import { useGastos } from '../hooks/useGastos';
import { filterGastos, FiltroGastos, totalGastos } from '../utils/filterGastos';

const FILTERS: { value: FiltroGastos; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'week', label: 'Esta semana' },
  { value: 'month', label: 'Este mes' },
];

export function ControlGastosScreen() {
  const insets = useSafeAreaInsets();
  const { gastos, status, error, guardarGasto, eliminarGasto } = useGastos();
  const [filter, setFilter] = useState<FiltroGastos>('all');
  const visibleGastos = filterGastos(gastos, filter);

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerClassName="gap-4 p-4"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-2xl font-bold text-gray-900">Control de Gastos</Text>
      <GastoForm onSubmit={guardarGasto} />
      {status === 'success' && (
        <Text className="rounded-lg bg-green-100 px-4 py-3 text-sm font-medium text-green-800">
          Gasto guardado exitosamente
        </Text>
      )}
      {error && (
        <Text className="rounded-lg bg-red-100 px-4 py-3 text-sm font-medium text-red-800">{error}</Text>
      )}
      <View className="rounded-xl bg-violet-100 p-4">
        <Text className="text-sm font-medium text-violet-800">Total acumulado</Text>
        <Text className="text-2xl font-bold text-violet-900">${totalGastos(gastos).toFixed(2)}</Text>
      </View>
      <View className="flex-row flex-wrap gap-2">
        {FILTERS.map((item) => {
          const selected = filter === item.value;
          return (
            <Pressable
              key={item.value}
              onPress={() => setFilter(item.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              className={`rounded-full px-4 py-2 ${selected ? 'bg-violet-600' : 'bg-gray-200'}`}
            >
              <Text className={`text-sm font-medium ${selected ? 'text-white' : 'text-gray-700'}`}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <GastoList gastos={visibleGastos} onDelete={eliminarGasto} />
    </ScrollView>
  );
}
