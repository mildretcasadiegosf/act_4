import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { NuevoGasto } from '../services/gastoService';
import { CATEGORIAS_GASTO, GastoFormValues, validateGasto } from '../schemas/gastoSchema';
import { LabeledInput } from './LabeledInput';

interface GastoFormProps {
  onSubmit: (gasto: NuevoGasto) => Promise<boolean>;
}

const today = () => new Date().toISOString().slice(0, 10);

export function GastoForm({ onSubmit }: GastoFormProps) {
  const [values, setValues] = useState<GastoFormValues>({
    descripcion: '',
    monto: '',
    categoria: 'Comida',
    fecha: today(),
  });
  const [errors, setErrors] = useState<Partial<Record<keyof GastoFormValues, string>>>({});

  const change = (field: keyof GastoFormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async () => {
    const found = validateGasto(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const saved = await onSubmit({ ...values, descripcion: values.descripcion.trim(), monto: Number(values.monto) });
    if (saved) {
      setValues({ descripcion: '', monto: '', categoria: 'Comida', fecha: today() });
    }
  };

  return (
    <View className="gap-3 rounded-xl bg-white p-4">
      <Text className="text-lg font-bold text-gray-900">Registrar gasto</Text>
      <LabeledInput
        label="Descripción"
        testID="input-descripcion"
        placeholder="Ej. Almuerzo"
        value={values.descripcion}
        error={errors.descripcion}
        onChangeText={(value) => change('descripcion', value)}
      />
      <LabeledInput
        label="Monto"
        testID="input-monto"
        placeholder="0"
        keyboardType="decimal-pad"
        value={values.monto}
        error={errors.monto}
        onChangeText={(value) => change('monto', value)}
      />
      <View className="gap-1">
        <Text className="text-sm font-medium text-gray-700">Categoría</Text>
        <View className="flex-row flex-wrap gap-2">
          {CATEGORIAS_GASTO.map((categoria) => {
            const selected = values.categoria === categoria;
            return (
              <Pressable
                key={categoria}
                onPress={() => change('categoria', categoria)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                className={`rounded-full px-3 py-2 ${selected ? 'bg-violet-600' : 'bg-gray-200'}`}
              >
                <Text className={`text-sm font-medium ${selected ? 'text-white' : 'text-gray-700'}`}>
                  {categoria}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {errors.categoria && <Text className="text-sm text-red-600">{errors.categoria}</Text>}
      </View>
      <LabeledInput
        label="Fecha"
        testID="input-fecha"
        placeholder="AAAA-MM-DD"
        value={values.fecha}
        error={errors.fecha}
        onChangeText={(value) => change('fecha', value)}
      />
      <Pressable
        onPress={submit}
        accessibilityLabel="Guardar gasto"
        accessibilityRole="button"
        className="rounded-lg bg-violet-600 py-3 active:bg-violet-700"
      >
        <Text className="text-center text-base font-semibold text-white">Guardar</Text>
      </Pressable>
    </View>
  );
}
