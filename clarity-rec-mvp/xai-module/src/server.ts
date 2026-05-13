import { XAIModuleServer } from './index';

// Конфигурация из переменных окружения
const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:3001';
const API_KEY = process.env.API_KEY || 'clarity-rec-secret-key-2024';
const PORT = parseInt(process.env.PORT || '3002', 10);
const HOST = process.env.HOST || '0.0.0.0';

console.log('Запуск XAI Module...');
console.log(`Core API URL: ${CORE_API_URL}`);
console.log(`API Key: ${API_KEY ? '***' : 'не указан'}`);
console.log(`Порт: ${PORT}`);

const server = new XAIModuleServer({
  port: PORT,
  host: HOST,
  coreApiUrl: CORE_API_URL,
  apiKey: API_KEY
});

server.start();

// Обработка сигналов завершения
process.on('SIGINT', async () => {
  console.log('\nПолучен сигнал SIGINT, завершение работы...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nПолучен сигнал SIGTERM, завершение работы...');
  await server.stop();
  process.exit(0);
});
