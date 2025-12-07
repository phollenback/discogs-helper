import { render, screen } from '@testing-library/react';
import VinylSpinner from './components/All/VinylSpinner';

describe('VinylSpinner', () => {
  test('renders provided label text', () => {
    render(<VinylSpinner label="Loading grooves" />);
    expect(screen.getByText(/Loading grooves/i)).toBeInTheDocument();
  });
});
