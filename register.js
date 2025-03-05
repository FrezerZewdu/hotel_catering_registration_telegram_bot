import mariadb from 'mariadb';
import dotenv from 'dotenv';
dotenv.config();

// Create a connection pool
const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  connectionLimit: 5
});

/**
 * Register a user to a department
 * @param {number} chatId - Telegram chat ID
 * @param {string} department - Department name
 */
export async function registerUser(chatId, department) {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('INSERT INTO departments (chat_id, department) VALUES (?, ?)', [chatId, department]);
  } finally {
    if (conn) conn.end();
  }
}

/**
 * Check if a user is an admin
 * @param {number} userId - Telegram user ID
 * @returns {Promise<boolean>} - True if user is an admin
 */
export async function isAdmin(userId) {
  // Replace with your admin user ID
  const adminUserId = 353435199;
  return userId === adminUserId;
}
