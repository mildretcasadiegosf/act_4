import React from 'react';
import { View, Text, TextInput, TextInputProps, Platform } from 'react-native';

// iOS: barra "Listo" sobre el teclado para poder cerrarlo (el number-pad no se cierra solo).
export const KEYBOARD_ACCESSORY_ID = 'checkout-keyboard-accessory';

interface LabeledInputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function LabeledInput({ label, error, ...rest }: LabeledInputProps) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-gray-700">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#9ca3af"
        inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
        className={`rounded-lg border bg-white px-4 py-3 text-base text-gray-900 ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
        {...rest}
      />
      {error && <Text className="text-sm text-red-600">{error}</Text>}
    </View>
  );
}
