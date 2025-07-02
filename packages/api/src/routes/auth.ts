import { FastifyPluginAsync } from 'fastify';
import { Type, Static } from '@sinclair/typebox';

const LoginSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String({ minLength: 6 })
});

const RegisterSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  username: Type.String({ minLength: 3, maxLength: 50 }),
  password: Type.String({ minLength: 6 }),
  firstName: Type.Optional(Type.String()),
  lastName: Type.Optional(Type.String())
});

const UserResponseSchema = Type.Object({
  id: Type.String(),
  email: Type.String(),
  username: Type.String(),
  firstName: Type.Union([Type.String(), Type.Null()]),
  lastName: Type.Union([Type.String(), Type.Null()]),
  role: Type.String(),
  createdAt: Type.String(),
  token: Type.Optional(Type.String())
});

type LoginBody = Static<typeof LoginSchema>;
type RegisterBody = Static<typeof RegisterSchema>;
type UserResponse = Static<typeof UserResponseSchema>;

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Login endpoint
  fastify.post<{ Body: LoginBody }>('/login', {
    schema: {
      body: LoginSchema,
      response: {
        200: UserResponseSchema
      }
    }
  }, async (request, reply) => {
    const { email, password } = request.body;

    try {
      // Query user from database
      const result = await fastify.pg.query(
        'SELECT id, email, username, password_hash, first_name, last_name, role, created_at FROM users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      const user = result.rows[0];

      // Verify password
      const isValid = await fastify.verifyPassword(password, user.password_hash);
      if (!isValid) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Generate token
      const token = fastify.generateToken({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      });

      // Return user data with token
      const response: UserResponse = {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        createdAt: user.created_at.toISOString(),
        token
      };

      return reply.send(response);
    } catch (err) {
      fastify.log.error('Login error:', err);
      return reply.code(500).send({ error: 'Login failed' });
    }
  });

  // Register endpoint
  fastify.post<{ Body: RegisterBody }>('/register', {
    schema: {
      body: RegisterSchema,
      response: {
        201: UserResponseSchema
      }
    }
  }, async (request, reply) => {
    const { email, username, password, firstName, lastName } = request.body;

    try {
      // Check if user exists
      const existingUser = await fastify.pg.query(
        'SELECT id FROM users WHERE email = $1 OR username = $2',
        [email, username]
      );

      if (existingUser.rows.length > 0) {
        return reply.code(409).send({ error: 'User already exists' });
      }

      // Hash password
      const passwordHash = await fastify.hashPassword(password);

      // Create user
      const result = await fastify.pg.query(
        `INSERT INTO users (email, username, password_hash, first_name, last_name, role)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, email, username, first_name, last_name, role, created_at`,
        [email, username, passwordHash, firstName || null, lastName || null, 'user']
      );

      const user = result.rows[0];

      // Generate token
      const token = fastify.generateToken({
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role
      });

      // Return user data with token
      const response: UserResponse = {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        createdAt: user.created_at.toISOString(),
        token
      };

      return reply.code(201).send(response);
    } catch (err) {
      fastify.log.error('Registration error:', err);
      return reply.code(500).send({ error: 'Registration failed' });
    }
  });

  // Get current user endpoint
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
    schema: {
      response: {
        200: UserResponseSchema
      }
    }
  }, async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }

    try {
      const result = await fastify.pg.query(
        'SELECT id, email, username, first_name, last_name, role, created_at FROM users WHERE id = $1',
        [request.user.userId]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'User not found' });
      }

      const user = result.rows[0];

      const response: UserResponse = {
        id: user.id,
        email: user.email,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        createdAt: user.created_at.toISOString()
      };

      return reply.send(response);
    } catch (err) {
      fastify.log.error('Get user error:', err);
      return reply.code(500).send({ error: 'Failed to get user' });
    }
  });
};

export default authRoutes;