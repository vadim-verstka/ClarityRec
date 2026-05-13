const JWT_SECRET = process.env.JWT_SECRET || 'clarity-rec-secret-key-mvp-2024';
export function registerAuth(fastify) {
    fastify.register(require('@fastify/jwt'), {
        secret: JWT_SECRET,
        sign: {
            expiresIn: '7d'
        },
        verify: {}
    });
    // Декоратор для проверки авторизации
    fastify.decorate('authenticate', async (request, reply) => {
        try {
            await request.jwtVerify();
        }
        catch (err) {
            reply.code(401).send({ error: 'Unauthorized' });
        }
    });
}
export function generateToken(payload) {
    // Вызывается через fastify.jwt.sign внутри роутов
    return payload;
}
export { JWT_SECRET };
