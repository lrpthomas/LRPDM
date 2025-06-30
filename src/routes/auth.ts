import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { db as knex } from '../config/database';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['admin', 'manager', 'editor', 'viewer']).default('viewer')
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string()
});

// JWT secret from environment
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Register endpoint
router.post('/register', async (req: Request, res: Response) => {
  try {
    const validatedData = registerSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await knex('users')
      .where('email', validatedData.email)
      .orWhere('username', validatedData.username)
      .first();
    
    if (existingUser) {
      res.status(400).json({
        error: 'User already exists',
        message: 'Email or username is already registered'
      });
      return;
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 12);
    
    // Create user
    const [user] = await knex('users')
      .insert({
        email: validatedData.email,
        username: validatedData.username,
        password_hash: passwordHash,
        first_name: validatedData.firstName,
        last_name: validatedData.lastName,
        phone: validatedData.phone,
        role: validatedData.role,
        status: 'active'
      })
      .returning(['id', 'email', 'username', 'first_name', 'last_name', 'role', 'status']);
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        status: user.status
      },
      token
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
      return;
    }
    
    res.status(500).json({
      error: 'Registration failed',
      message: 'Unable to create user account'
    });
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    
    // Find user
    const user = await knex('users')
      .where('email', email)
      .where('status', 'active')
      .first();
    
    if (!user) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
      return;
    }
    
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!isValidPassword) {
      res.status(401).json({
        error: 'Invalid credentials',
        message: 'Email or password is incorrect'
      });
      return;
    }
    
    // Update last login
    await knex('users')
      .where('id', user.id)
      .update({ last_login: knex.fn.now() });
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        status: user.status,
        lastLogin: user.last_login
      },
      token
    });
    
  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof z.ZodError) {
      res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
      return;
    }
    
    res.status(500).json({
      error: 'Login failed',
      message: 'Unable to authenticate user'
    });
  }
});

// Get current user profile
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Valid authentication token required'
      });
      return;
    }
    
    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const user = await knex('users')
      .select(['id', 'email', 'username', 'first_name', 'last_name', 'phone', 'role', 'status', 'preferences', 'last_login', 'created_at'])
      .where('id', decoded.userId)
      .where('status', 'active')
      .first();
    
    if (!user) {
      res.status(404).json({
        error: 'User not found'
      });
      return;
    }
    
    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        preferences: user.preferences,
        lastLogin: user.last_login,
        createdAt: user.created_at
      }
    });
    
  } catch (error) {
    console.error('Profile error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({
        error: 'Invalid token'
      });
      return;
    }
    
    res.status(500).json({
      error: 'Failed to get user profile'
    });
  }
});

// Logout endpoint (client-side token invalidation)
router.post('/logout', (req: Request, res: Response) => {
  res.json({
    message: 'Logged out successfully',
    note: 'Token should be removed from client storage'
  });
});

export default router;