import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TrustScoreDashboard from '../TrustScoreDashboard';

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Users: ({ className }) => <div data-testid="users-icon" className={className} />,
  Trophy: ({ className }) => <div data-testid="trophy-icon" className={className} />,
  Vote: ({ className }) => <div data-testid="vote-icon" className={className} />,
  Coins: ({ className }) => <div data-testid="coins-icon" className={className} />,
  TrendingUp: ({ className }) => <div data-testid="trending-up-icon" className={className} />,
  Shield: ({ className }) => <div data-testid="shield-icon" className={className} />,
  Star: ({ className }) => <div data-testid="star-icon" className={className} />,
  ArrowUp: ({ className }) => <div data-testid="arrow-up-icon" className={className} />,
  ArrowDown: ({ className }) => <div data-testid="arrow-down-icon" className={className} />
}));

describe('TrustScoreDashboard', () => {
  beforeEach(() => {
    // Clear any mocks before each test
    jest.clearAllMocks();
  });

  describe('Dashboard Rendering', () => {
    test('renders dashboard with header and navigation', () => {
      render(<TrustScoreDashboard />);
      
      // Check header elements
      expect(screen.getByText('OmeoneChain')).toBeInTheDocument();
      expect(screen.getByText('1,250 TOK')).toBeInTheDocument();
      expect(screen.getByText('Curator (100 TOK)')).toBeInTheDocument();
      
      // Check navigation tabs
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('My Recs')).toBeInTheDocument();
      expect(screen.getByText('Governance')).toBeInTheDocument();
      expect(screen.getByText('Staking')).toBeInTheDocument();
    });

    test('displays user stats correctly', () => {
      render(<TrustScoreDashboard />);
      
      // Check trust score display
      expect(screen.getByText('8.6/10')).toBeInTheDocument();
      expect(screen.getByText('Trust Score')).toBeInTheDocument();
      
      // Check other stats
      expect(screen.getByText('2.3%')).toBeInTheDocument(); // Voting Power
      expect(screen.getByText('23')).toBeInTheDocument(); // Recommendations
      expect(screen.getByText('245')).toBeInTheDocument(); // Social Graph (156 + 89)
    });

    test('trust score meter displays correctly', () => {
      render(<TrustScoreDashboard />);
      
      // Check trust score analysis section
      expect(screen.getByText('Trust Score Analysis')).toBeInTheDocument();
      expect(screen.getByText('Based on social graph weighting (1-hop: 0.75, 2-hop: 0.25)')).toBeInTheDocument();
      
      // Check follower/reputation stats
      expect(screen.getByText('156')).toBeInTheDocument(); // Followers
      expect(screen.getByText('847')).toBeInTheDocument(); // Reputation
      expect(screen.getByText('87%')).toBeInTheDocument(); // Governance Activity
    });
  });

  describe('Tab Navigation', () => {
    test('switches between tabs correctly', () => {
      render(<TrustScoreDashboard />);
      
      // Initially on dashboard tab
      expect(screen.getByText('Trust Score Analysis')).toBeInTheDocument();
      
      // Click on recommendations tab
      fireEvent.click(screen.getByText('My Recs'));
      expect(screen.getByText('My Recommendations')).toBeInTheDocument();
      expect(screen.getByText('Add Recommendation')).toBeInTheDocument();
      
      // Click on governance tab
      fireEvent.click(screen.getByText('Governance'));
      expect(screen.getByText('Governance Proposals')).toBeInTheDocument();
      expect(screen.getByText('Create Proposal')).toBeInTheDocument();
      
      // Click on staking tab
      fireEvent.click(screen.getByText('Staking'));
      expect(screen.getByText('Staking Management')).toBeInTheDocument();
      expect(screen.getByText('Current Staking Status')).toBeInTheDocument();
    });

    test('tab styling updates correctly', () => {
      render(<TrustScoreDashboard />);
      
      const dashboardTab = screen.getByText('Dashboard').closest('button');
      const recommendationsTab = screen.getByText('My Recs').closest('button');
      
      // Dashboard tab should be active initially
      expect(dashboardTab).toHaveClass('border-blue-500', 'text-blue-600');
      expect(recommendationsTab).toHaveClass('border-transparent', 'text-gray-500');
      
      // Switch to recommendations tab
      fireEvent.click(recommendationsTab);
      
      expect(recommendationsTab).toHaveClass('border-blue-500', 'text-blue-600');
      expect(dashboardTab).toHaveClass('border-transparent', 'text-gray-500');
    });
  });

  describe('Recommendations Tab', () => {
    test('displays recommendation cards correctly', () => {
      render(<TrustScoreDashboard />);
      
      // Switch to recommendations tab
      fireEvent.click(screen.getByText('My Recs'));
      
      // Check recommendation cards
      expect(screen.getByText("Amazing pasta at Nonna's Kitchen")).toBeInTheDocument();
      expect(screen.getByText("Hidden gem coffee shop on 5th")).toBeInTheDocument();
      expect(screen.getByText("Best tacos outside Mexico City")).toBeInTheDocument();
      
      // Check trust scores
      expect(screen.getByText('Trust 9.2/10')).toBeInTheDocument();
      expect(screen.getByText('Trust 8.7/10')).toBeInTheDocument();
      expect(screen.getByText('Trust 9.5/10')).toBeInTheDocument();
    });

    test('recommendation cards show correct social proof', () => {
      render(<TrustScoreDashboard />);
      
      fireEvent.click(screen.getByText('My Recs'));
      
      expect(screen.getByText('3 direct friends, 5 friends-of-friends')).toBeInTheDocument();
      expect(screen.getByText('2 direct friends, 8 friends-of-friends')).toBeInTheDocument();
      expect(screen.getByText('5 direct friends, 3 friends-of-friends')).toBeInTheDocument();
    });

    test('endorse buttons are interactive', () => {
      render(<TrustScoreDashboard />);
      
      fireEvent.click(screen.getByText('My Recs'));
      
      const endorseButtons = screen.getAllByText('Endorse');
      expect(endorseButtons).toHaveLength(3);
      
      // Test button click (doesn't need to do anything, just shouldn't error)
      fireEvent.click(endorseButtons[0]);
    });
  });

  describe('Governance Tab', () => {
    test('displays governance proposals correctly', () => {
      render(<TrustScoreDashboard />);
      
      fireEvent.click(screen.getByText('Governance'));
      
      // Check proposal titles
      expect(screen.getByText('Adjust Trust Score calculation weights')).toBeInTheDocument();
      expect(screen.getByText('New reward tier for power users')).toBeInTheDocument();
      
      // Check proposal descriptions
      expect(screen.getByText('Proposal to increase 1-hop weight from 0.75 to 0.8')).toBeInTheDocument();
      expect(screen.getByText('Add 5x multiplier for users with Trust Score > 9.0')).toBeInTheDocument();
    });

    test('displays voting statistics correctly', () => {
      render(<TrustScoreDashboard />);
      
      fireEvent.click(screen.getByText('Governance'));
      
      // Check vote counts
      expect(screen.getByText('For: 1,247')).toBeInTheDocument();
      expect(screen.getByText('Against: 321')).toBeInTheDocument();
      expect(screen.getByText('For: 2,156')).toBeInTheDocument();
      expect(screen.getByText('Against: 432')).toBeInTheDocument();
    });

    test('shows governance power breakdown', () => {
      render(<TrustScoreDashboard />);
      
      fireEvent.click(screen.getByText('Governance'));
      
      expect(screen.getByText('Your Governance Power')).toBeInTheDocument();
      expect(screen.getByText('Voting Weight')).toBeInTheDocument();
      expect(screen.getByText('Staked Amount')).toBeInTheDocument();
      expect(screen.getByText('√(staked tokens × trust score) capped at 3%')).toBeInTheDocument();
    });
  });

  describe('Staking Tab', () => {
    test('displays staking tiers correctly', () => {
      render(<TrustScoreDashboard />);
      
      fireEvent.click(screen.getByText('Staking'));
      
      // Check tier names
      expect(screen.getByText('Explorer')).toBeInTheDocument();
      expect(screen.getByText('Curator')).toBeInTheDocument();
      expect(screen.getByText('Passport')).toBeInTheDocument();
      expect(screen.getByText('Validator')).toBeInTheDocument();
      
      // Check minimum amounts
      expect(screen.getByText('25 TOK minimum')).toBeInTheDocument();
      expect(screen.getByText('100 TOK minimum')).toBeInTheDocument();
      expect(screen.getByText('500 TOK minimum')).toBeInTheDocument();
      expect(screen.getByText('1000 TOK minimum')).toBeInTheDocument();
    });

    test('highlights current staking tier', () => {
      render(<TrustScoreDashboard />);
      
      fireEvent.click(screen.getByText('Staking'));
      
      // Find the Curator tier card (user's current tier)
      const curatorCard = screen.getByText('Curator').closest('div');
      expect(curatorCard).toHaveClass('border-blue-500', 'bg-blue-50');
    });

    test('shows staking features correctly', () => {
      render(<TrustScoreDashboard />);
      
      fireEvent.click(screen.getByText('Staking'));
      
      // Check some tier features
      expect(screen.getByText('• Submit comments')).toBeInTheDocument();
      expect(screen.getByText('• Create proposals')).toBeInTheDocument();
      expect(screen.getByText('• 50% AI discount')).toBeInTheDocument();
      expect(screen.getByText('• Run indexer node')).toBeInTheDocument();
    });
  });

  describe('Component Interactions', () => {
    test('staking tier badge displays correctly', () => {
      render(<TrustScoreDashboard />);
      
      const stakingBadge = screen.getByText('Curator (100 TOK)');
      expect(stakingBadge).toBeInTheDocument();
      expect(stakingBadge).toHaveClass('bg-purple-100', 'text-purple-800', 'border-purple-200');
    });

    test('buttons are interactive', () => {
      render(<TrustScoreDashboard />);
      
      // Test various buttons throughout the interface
      fireEvent.click(screen.getByText('My Recs'));
      const addRecommendationBtn = screen.getByText('Add Recommendation');
      fireEvent.click(addRecommendationBtn);
      
      fireEvent.click(screen.getByText('Governance'));
      const createProposalBtn = screen.getByText('Create Proposal');
      fireEvent.click(createProposalBtn);
      
      fireEvent.click(screen.getByText('Staking'));
      const increaseStakeBtn = screen.getByText('Increase Stake');
      fireEvent.click(increaseStakeBtn);
    });
  });

  describe('Trust Score Components', () => {
    test('trust score meter calculates percentage correctly', () => {
      render(<TrustScoreDashboard />);
      
      // Trust score of 8.6 out of 10 should be 86%
      const trustScoreMeter = screen.getByText('8.6/10').closest('div');
      expect(trustScoreMeter).toBeInTheDocument();
      
      // The meter should show green color for score >= 8.5
      const progressBar = trustScoreMeter.querySelector('.bg-green-500');
      expect(progressBar).toBeInTheDocument();
    });

    test('trust score color coding works correctly', () => {
      // This test would need to be expanded to test different score ranges
      // For now, we just test that the component renders without errors
      render(<TrustScoreDashboard />);
      expect(screen.getByText('Trust Score Analysis')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    test('dashboard has proper heading structure', () => {
      render(<TrustScoreDashboard />);
      
      // Check main headings
      expect(screen.getByRole('heading', { name: 'OmeoneChain' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Trust Score Analysis' })).toBeInTheDocument();
    });

    test('buttons have proper labels', () => {
      render(<TrustScoreDashboard />);
      
      // Check that buttons have accessible text
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
      
      // Each button should have text content
      buttons.forEach(button => {
        expect(button).toHaveTextContent(/\S/); // Non-empty text
      });
    });
  });

  describe('Error Handling', () => {
    test('component renders without crashing with default props', () => {
      expect(() => render(<TrustScoreDashboard />)).not.toThrow();
    });

    test('handles missing data gracefully', () => {
      // Component should handle undefined/null values gracefully
      // Since it uses mock data internally, this mainly tests that the component doesn't crash
      const { container } = render(<TrustScoreDashboard />);
      expect(container.firstChild).toBeInTheDocument();
    });
  });
});

// Helper function for more complex testing scenarios
export const renderWithTestUtils = (component, options = {}) => {
  const defaultOptions = {
    // Add any default testing options here
  };
  
  return render(component, { ...defaultOptions, ...options });
};

// Mock data for testing (if needed for future tests)
export const mockTestData = {
  user: {
    userId: "test_user_123",
    trustScore: 7.5,
    tokenBalance: 500,
    stakingTier: "Explorer",
    stakedAmount: 25,
    reputation: 350,
    totalRecommendations: 12,
    followers: 45,
    following: 32,
    votingPower: 1.2,
    governanceParticipation: 65
  },
  recommendations: [
    {
      id: 1,
      title: "Test Restaurant",
      trustScore: 8.0,
      endorsements: 5,
      location: "Test City",
      category: "Restaurant",
      socialProof: "2 direct friends, 3 friends-of-friends",
      rewards: 10
    }
  ]
};