import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';

// Mock the child components
vi.mock('./components/LandingPage', () => ({
  LandingPage: ({ onCategoryClick }: any) => (
    <div data-testid="landing-page">
      <button onClick={() => onCategoryClick({ id: '1', name: 'Test Category' })}>
        Select Category
      </button>
    </div>
  ),
}));

vi.mock('./components/TablePage', () => ({
  TablePage: ({ onBack }: any) => (
    <div data-testid="table-page">
      <button onClick={onBack}>Back to Landing</button>
    </div>
  ),
}));

vi.mock('./components/HomePage', () => ({
  default: () => <div data-testid="home-page">Home Page</div>,
}));

// Mock fetch
global.fetch = vi.fn(() =>
  Promise.resolve({
    json: () => Promise.resolve([]),
  } as Response)
);

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with the currentView set to "landing"', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    });
  });

  it('sets the currentView to "landing" when handleBackToLanding is called', async () => {
    const user = userEvent.setup();
    render(<App />);
    
    // Initially on landing page
    await waitFor(() => {
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    });
    
    // Navigate to table page
    const selectButton = screen.getByText('Select Category');
    await user.click(selectButton);
    
    // Wait for table page to appear
    await waitFor(() => {
      expect(screen.getByTestId('table-page')).toBeInTheDocument();
    });
    
    // Click back button to return to landing
    const backButton = screen.getByText('Back to Landing');
    await user.click(backButton);
    
    // Verify we're back on landing page
    await waitFor(() => {
      expect(screen.getByTestId('landing-page')).toBeInTheDocument();
    });
  });
});
