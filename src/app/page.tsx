'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/ui/context/AuthContext';
import { Token } from '@/domain/models/auth/token';
import { env } from '@/infrastructure/config/env';

export default function Home() {
  const router = useRouter();
  const { login } = useAuth();
  
  const [orgName, setOrgName] = useState(env.defaultOrgName);
  const [teamSlugs, setTeamSlugs] = useState<string[]>(env.defaultTeamSlugs);
  const [teamInput, setTeamInput] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add team to the list
  const addTeam = () => {
    if (teamInput.trim() && !teamSlugs.includes(teamInput.trim())) {
      setTeamSlugs([...teamSlugs, teamInput.trim()]);
      setTeamInput('');
    }
  };

  // Remove team from the list
  const removeTeam = (teamSlug: string) => {
    setTeamSlugs(teamSlugs.filter((slug) => slug !== teamSlug));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgName.trim()) {
      setError('Please enter an organization name');
      return;
    }
    
    if (!token.trim()) {
      setError('Please enter a GitHub authentication token');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      // Create a basic token object
      // In a real app, you would validate the token with the GitHub API first
      const tokenObj: Token = {
        value: token,
        organizationName: orgName,
        scope: ['read:org', 'repo'],
      };
      
      // Login with the token
      login(tokenObj);
      
      // Navigate to dashboard
      router.push('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError('Authentication failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6">
          GitHub Copilot Metrics Dashboard
        </h1>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your GitHub organization name"
              required
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Team Slugs (Optional)
            </label>
            <div className="flex">
              <input
                type="text"
                value={teamInput}
                onChange={(e) => setTeamInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add team slug (e.g., frontend-team)"
              />
              <button
                type="button"
                onClick={addTeam}
                className="bg-gray-100 px-3 py-2 border border-gray-300 border-l-0 rounded-r-md hover:bg-gray-200"
              >
                Add
              </button>
            </div>
            
            {teamSlugs.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {teamSlugs.map((teamSlug) => (
                  <div
                    key={teamSlug}
                    className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center"
                  >
                    <span>{teamSlug}</span>
                    <button
                      type="button"
                      onClick={() => removeTeam(teamSlug)}
                      className="ml-2 text-blue-500 hover:text-blue-700"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GitHub Auth Token
            </label>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your GitHub authentication token"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Token requires read:org and repo scopes
            </p>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect'}
          </button>
        </form>
      </div>
    </div>
  );
}
