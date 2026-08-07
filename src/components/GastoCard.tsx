import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Gasto } from '../types';

interface GastoCardProps {
  gasto: Gasto;
  onDelete: (id: string) => void;
}

export function GastoCard({ gasto, onDelete }: GastoCardProps) {
  return (
    <View className="mb-2 rounded-lg border border-gray-200 bg-white p-4">
      <View className="flex-row justify-between gap-3">
        <View className="flex-1">
          <Text className="text-base font-semibold text-gray-900">{gasto.descripcion}</Text>
          <Text className="mt-1 text-sm text-gray-500">{gasto.categoria} · {gasto.fecha}</Text>
        </View>
        <Text className="text-base font-bold text-violet-700">${gasto.monto.toFixed(2)}</Text>
      </View>
      <Pressable
        onPress={() => onDelete(gasto.id)}
        accessibilityRole="button"
        accessibilityLabel={`Eliminar gasto ${gasto.descripcion}`}
      >
        <Text className="mt-3 text-sm font-medium text-red-600">Eliminar</Text>
      </Pressable>
    </View>
  );
}
