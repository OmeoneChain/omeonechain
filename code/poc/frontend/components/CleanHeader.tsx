// components/CleanHeader.tsx - Based on your working original

import React from 'react';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { BarChart3, Menu } from 'lucide-react';

interface CleanHeaderProps {
  currentPath?: string;
}

const CleanHeader: React.FC<CleanHeaderProps> = ({ currentPath = '/' }) => {
  return (
    <header className="border-b border-network-200 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo - Using your existing Logo component */}
          <Logo size="lg" variant="full" />
          
          {/* Desktop Navigation - Same as your original */}
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              href="/discover" 
              className={`font-medium transition-colors ${
                currentPath === '/discover' 
                  ? 'text-trust-600' 
                  : 'text-network-600 hover:text-network-900'
              }`}
            >
              Discover
            </Link>
            <Link 
              href="/following" 
              className={`font-medium transition-colors ${
                currentPath === '/following' 
                  ? 'text-trust-600' 
                  : 'text-network-600 hover:text-network-900'
              }`}
            >
              Following
            </Link>
            <Link 
              href="/create"
              className={`font-medium transition-colors ${
                currentPath === '/create' 
                  ? 'text-trust-600' 
                  : 'text-network-600 hover:text-network-900'
              }`}
            >
              Create
            </Link>
            <Link 
              href="/dashboard"
              className={`font-medium transition-colors flex items-center gap-2 ${
                currentPath === '/dashboard' 
                  ? 'text-trust-600' 
                  : 'text-network-600 hover:text-network-900'
              }`}
            >
              <BarChart3 size={16} />
              Dashboard
            </Link>
            <button className="bg-trust-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-trust-600 transition-colors">
              Join OmeoneChain
            </button>
          </nav>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 text-network-600 hover:text-network-900">
            <Menu size={24} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default CleanHeader;