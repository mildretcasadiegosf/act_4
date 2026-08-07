import React from 'react';
import { Text, View } from 'react-native';
import { Gasto } from '../types';
import { GastoCard } from './GastoCard';

interface GastoListProps {
  gastos: Gasto[];
  onDelete: (id: string) => void;
}

export function GastoList({ gastos, onDelete }: GastoListProps) {
  if (gastos.length === 0) {
    return <Text className="py-6 text-center text-base text-gray-500">No hay gastos registrados</Text>;
  }
  return (
    <View>
      <Text className="mb-2 text-sm font-medium text-gray-500">
        {gastos.length === 1 ? '1 gasto' : `${gastos.length} gastos`}
      </Text>
      {gastos.map((gasto) => <GastoCard key={gasto.id} gasto={gasto} onDelete={onDelete} />)}
    </View>
  );
}
