import crypto from 'crypto';

/**
 * Middleware для проверки API-ключа
 */
export function verifyApiKey(apiKey: string, validKey: string): boolean {
  if (!apiKey || !validKey) {
    return false;
  }
  
  // Сравниваем хэши для защиты от timing attacks
  const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const validKeyHash = crypto.createHash('sha256').update(validKey).digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(apiKeyHash, 'hex'),
    Buffer.from(validKeyHash, 'hex')
  );
}

/**
 * Генерация нового API-ключа
 */
export function generateApiKey(): string {
  return `cr_${crypto.randomBytes(32).toString('hex')}`;
}
