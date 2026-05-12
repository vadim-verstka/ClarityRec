import { FastifyInstance } from 'fastify';
import { SignerOptions, VerifierOptions } from '@fastify/jwt';

const JWT_SECRET = process.env.JWT_SECRET || 'clarity-rec-secret-key-mvp-2024';

export function registerAuth(fastify: FastifyInstance) {
  fastify.register(require('@fastify/jwt'), {
    secret: JWT_SECRET,
    sign: {
      expiresIn: '7d'
    } as SignerOptions,
    verify: {} as VerifierOptions
  });

  // Декоратор для проверки авторизации
  fastify.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.code(401).send({ error: 'Unauthorized' });
    }
  });
}

export function generateToken(payload: object): string {
  // Вызывается через fastify.jwt.sign внутри роутов
  return payload as unknown as string;
}

export { JWT_SECRET };
