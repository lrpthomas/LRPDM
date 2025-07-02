import fp from 'fastify-plugin';
import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

interface User {
  id: string;
  email: string;
  username: string;
  role: string;
}

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    verifyPassword: (password: string, hash: string) => Promise<boolean>;
    hashPassword: (password: string) => Promise<string>;
    generateToken: (user: User) => string;
  }
  
  interface FastifyRequest {
    user?: JWTPayload;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
  const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
  const SALT_ROUNDS = 10;

  // Password hashing utilities
  fastify.decorate('hashPassword', async (password: string): Promise<string> => {
    return bcrypt.hash(password, SALT_ROUNDS);
  });

  fastify.decorate('verifyPassword', async (password: string, hash: string): Promise<boolean> => {
    return bcrypt.compare(password, hash);
  });

  // JWT token generation
  fastify.decorate('generateToken', (user: User): string => {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
    
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
  });

  // Authentication decorator
  fastify.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const authHeader = request.headers.authorization;
      
      if (!authHeader) {
        return reply.code(401).send({ error: 'No authorization header' });
      }

      const token = authHeader.replace(/^Bearer\s+/, '');
      
      if (!token) {
        return reply.code(401).send({ error: 'No token provided' });
      }

      try {
        const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
        request.user = decoded;
      } catch (err) {
        if (err instanceof jwt.TokenExpiredError) {
          return reply.code(401).send({ error: 'Token expired' });
        }
        if (err instanceof jwt.JsonWebTokenError) {
          return reply.code(401).send({ error: 'Invalid token' });
        }
        throw err;
      }
    } catch (err) {
      fastify.log.error('Authentication error:', err);
      return reply.code(500).send({ error: 'Authentication failed' });
    }
  });

  // Register JWT schema
  fastify.addSchema({
    $id: 'authToken',
    type: 'object',
    properties: {
      authorization: { type: 'string', pattern: '^Bearer .+' }
    },
    required: ['authorization']
  });
};

export default fp(authPlugin, {
  name: 'auth',
  dependencies: ['database']
});