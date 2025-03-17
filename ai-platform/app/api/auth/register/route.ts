import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcrypt';
import prisma from '@/app/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting user registration');
    const body = await request.json();
    const { name, email, password, subscription = 'free' } = body;
    
    // Validate inputs
    if (!name || !email || !password) {
      console.error('Missing registration fields:', { name: !!name, email: !!email, password: !!password });
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      );
    }
    
    // Test database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      console.log('Database connection successful during registration');
    } catch (dbError) {
      console.error('Database connection error during registration:', dbError);
      return NextResponse.json(
        { error: 'Database connection failed. Please try again later.' },
        { status: 503 }
      );
    }
    
    // Check if user already exists
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser) {
        console.log('User already exists:', email);
        return NextResponse.json(
          { error: 'User with this email already exists' },
          { status: 409 }
        );
      }
    } catch (findError) {
      console.error('Error checking for existing user:', findError);
      return NextResponse.json(
        { error: 'Error checking for existing user' },
        { status: 500 }
      );
    }
    
    // Hash the password
    let hashedPassword;
    try {
      hashedPassword = await hash(password, 10);
    } catch (hashError) {
      console.error('Error hashing password:', hashError);
      return NextResponse.json(
        { error: 'Password processing failed' },
        { status: 500 }
      );
    }
    
    // Default usage limit based on subscription
    const usageLimit = 
      subscription === 'free' ? 100000 : 
      subscription === 'pro' ? 1000000 : 
      10000000; // enterprise
    
    // Create new user
    try {
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          subscription,
          usageLimit,
          usageTotal: 0
        }
      });
      
      console.log('User created successfully:', user.id);
      
      // Return user (excluding password)
      return NextResponse.json({
        id: user.id,
        name: user.name,
        email: user.email,
        subscription: user.subscription,
        success: true
      });
    } catch (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json(
        { error: 'Failed to create user in database' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'An error occurred during registration' },
      { status: 500 }
    );
  }
}