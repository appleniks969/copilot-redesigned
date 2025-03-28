'use client';

import React, { ReactNode } from 'react';
import { AuthProvider } from '@/ui/context/AuthContext';
import { MetricsProvider } from '@/ui/context/MetricsContext';

interface ClientProvidersProps {
  children: ReactNode;
}

export const ClientProviders: React.FC<ClientProvidersProps> = ({ children }) => {
  return (
    <AuthProvider>
      <MetricsProvider>
        {children}
      </MetricsProvider>
    </AuthProvider>
  );
};
