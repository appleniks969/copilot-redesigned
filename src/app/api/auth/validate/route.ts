import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Token } from '@/domain/models/auth/token';

const COOKIE_NAME = 'github-copilot-auth';

export async function GET() {
  try {
    const cookieStore = cookies();
    const tokenCookie = cookieStore.get(COOKIE_NAME);
    
    if (!tokenCookie) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }
    
    try {
      // Parse the token from the cookie
      const token = JSON.parse(tokenCookie.value) as Token;
      
      // Basic validation - you could add more validation here
      if (!token.value || !token.organizationName) {
        return NextResponse.json(
          { authenticated: false, error: 'Invalid token' },
          { status: 401 }
        );
      }
      
      return NextResponse.json({
        authenticated: true,
        token,
      });
    } catch (e) {
      console.error('Error parsing token:', e);
      return NextResponse.json(
        { authenticated: false, error: 'Invalid token format' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Validation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
