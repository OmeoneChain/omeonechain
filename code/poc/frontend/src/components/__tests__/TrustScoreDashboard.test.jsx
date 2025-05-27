import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TrustScoreDashboard from '../TrustScoreDashboard';

describe('TrustScoreDashboard', () => {
  test('renders main dashboard elements', () => {
    render(<TrustScoreDashboard />);
    
    // Check if main elements are present
    expect(screen.getByText('OmeoneChain')).toBeInTheDocument();
    expect(screen.getAllByText('8.6/10')).toHaveLength(2); // Expect 2 instances
    expect(screen.getAllByText('Trust Score')).toHaveLength(2); // Expect 2 instances
  });

  test('displays correct token balance', () => {
    render(<TrustScoreDashboard />);
    expect(screen.getByText('1,250 TOK')).toBeInTheDocument();
  });

  test('shows correct staking tier', () => {
    render(<TrustScoreDashboard />);
    expect(screen.getByText('Curator (100 TOK)')).toBeInTheDocument();
  });

  test('navigation tabs work correctly', () => {
    render(<TrustScoreDashboard />);
    
    // Test tab switching
    const governanceTab = screen.getByText('Governance');
    fireEvent.click(governanceTab);
    
    expect(screen.getByText('Governance Proposals')).toBeInTheDocument();
  });
});
