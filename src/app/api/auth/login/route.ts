import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

// Cookie settings
const COOKIE_NAME = 'github-copilot-auth';
const MAX_AGE = 60 * 60 * 8; // 8 hours in seconds

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      );
    }

    // Create an HTTP-only cookie
    cookies().set({
      name: COOKIE_NAME,
      value: JSON.stringify(token),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: MAX_AGE,
      path: '/',
      sameSite: 'strict',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
