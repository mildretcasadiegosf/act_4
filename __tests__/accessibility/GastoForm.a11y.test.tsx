import React from 'react';
import { render } from '@testing-library/react-native';
import { GastoForm } from '../../src/components/GastoForm';

describe('GastoForm - Accesibilidad', () => {
  it('el botón Guardar tiene una etiqueta descriptiva y el rol button', async () => {
    const { getByLabelText } = await render(<GastoForm onSubmit={jest.fn().mockResolvedValue(true)} />);

    const saveButton = getByLabelText('Guardar gasto');

    expect(saveButton).toHaveProp('accessibilityLabel', 'Guardar gasto');
    expect(saveButton).toHaveProp('accessibilityRole', 'button');
  });

  it('el campo de descripción tiene una etiqueta accesible', async () => {
    const { getByLabelText } = await render(<GastoForm onSubmit={jest.fn().mockResolvedValue(true)} />);

    const descriptionInput = getByLabelText('Descripción');

    expect(descriptionInput).toHaveProp('accessibilityLabel', 'Descripción');
  });
});
