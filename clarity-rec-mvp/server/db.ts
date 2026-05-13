import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Путь к базе данных берем из переменной окружения или используем default для volume
const dbPath = process.env.DB_PATH || join(__dirname, '..', 'data', 'clarityrec.db');
const db = new Database(dbPath);

console.log(`📁 База данных: ${dbPath}`);

// Инициализация таблиц
db.exec(`
  CREATE TABLE IF NOT EXISTS admin (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_recommendation_ready INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS likes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    card_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (card_id) REFERENCES cards(id),
    UNIQUE(user_id, card_id)
  );
`);

// Создание админа по умолчанию
async function initAdmin() {
  const adminExists = db.prepare('SELECT id FROM admin WHERE username = ?').get('admin');
  if (!adminExists) {
    const passwordHash = await bcrypt.hash('cradmin123', 10);
    db.prepare('INSERT INTO admin (username, password_hash) VALUES (?, ?)').run('admin', passwordHash);
    console.log('✅ Админ создан: admin / cradmin123');
  }
}

// Генерация моковых карточек
function initCards() {
  const count = db.prepare('SELECT COUNT(*) as cnt FROM cards').get() as { cnt: number };
  if (count.cnt > 0) return;

  const categories = ['Образование', 'Технологии', 'Финансы', 'Творчество', 'Здоровье'];
  const cards: Array<{ title: string; category: string; image_url: string }> = [];

  for (let i = 1; i <= 30; i++) {
    const category = categories[(i - 1) % 5];
    cards.push({
      title: `Карточка ${i}: ${category}`,
      category,
      image_url: `https://picsum.photos/seed/${i}/400/250`
    });
  }

  const insert = db.prepare('INSERT INTO cards (title, category, image_url) VALUES (?, ?, ?)');
  const insertMany = db.transaction((cards: typeof cards) => {
    for (const card of cards) {
      insert.run(card.title, card.category, card.image_url);
    }
  });

  insertMany(cards);
  console.log('✅ Создано 30 моковых карточек');
}

initAdmin();
initCards();

export default db;
