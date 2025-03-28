'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/ui/components/layout/DashboardLayout';
import { useAuth } from '@/ui/context/AuthContext';

export default function TeamsPage() {
  const router = useRouter();
  const { token, isAuthenticated } = useAuth();
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // If token has no team slugs or empty array, show message
  const hasTeams = token?.teamSlugs && token.teamSlugs.length > 0;

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
      </div>
      
      {/* API Limitation Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6 text-sm">
        <p className="text-blue-800">
          Below are the teams configured for metrics tracking. Click on a team name to view its detailed metrics.
        </p>
      </div>
      
      {hasTeams ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {token.teamSlugs.map((teamSlug) => (
            <Link 
              key={teamSlug} 
              href={`/dashboard/${teamSlug}`}
              className="block"
            >
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <h3 className="text-xl font-semibold text-gray-900">{teamSlug}</h3>
                <p className="mt-2 text-gray-500">View detailed metrics for this team</p>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-6 text-center">
          <h2 className="text-lg font-semibold text-yellow-800 mb-2">No Teams Configured</h2>
          <p className="text-yellow-700">
            You don't have any teams configured for metrics tracking. 
            Add team slugs in your settings or in the .env.local file.
          </p>
        </div>
      )}
    </DashboardLayout>
  );
}
