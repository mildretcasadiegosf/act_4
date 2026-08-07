import '../global.css';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="todo" options={{ title: 'Flujo Todo List' }} />
      <Stack.Screen name="checkout" options={{ title: 'Flujo Transaccional' }} />
      <Stack.Screen name="gastos" options={{ title: 'Control de Gastos' }} />
    </Stack>
  );
}
