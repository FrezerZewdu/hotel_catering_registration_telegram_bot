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
 * Check if a user is in the marketing team
 * @param {string} username - Telegram username
 * @returns {Promise<boolean>} - True if user is in marketing team
 */
export async function isMarketingTeam(username) {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT COUNT(*) as count FROM marketing_team WHERE username = ?', [username]);
    return rows[0].count > 0;
  } finally {
    if (conn) conn.end();
  }
}

/**
 * Set or get user state
 * @param {number} userId - Telegram user ID
 * @param {string|null} state - State to set, or null to get current state
 * @returns {Promise<string|null>} - Current state if getting, or new state if setting
 */
export async function authorizeUser(userId, state = null) {
  let conn;
  try {
    conn = await pool.getConnection();
    if (state === null) {
      const rows = await conn.query('SELECT state FROM user_states WHERE user_id = ?', [userId]);
      return rows.length > 0 ? rows[0].state : null;
    } else {
      await conn.query('REPLACE INTO user_states (user_id, state) VALUES (?, ?)', [userId, state]);
      return state;
    }
  } finally {
    if (conn) conn.end();
  }
}

/**
 * Add a user to the marketing team
 * @param {string} username - Telegram username to add
 */
export async function addToMarketingTeam(username) {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('INSERT IGNORE INTO marketing_team (username) VALUES (?)', [username]);
  } finally {
    if (conn) conn.end();
  }
}

/**
 * Remove a user from the marketing team
 * @param {string} username - Telegram username to remove
 */
export async function removeFromMarketingTeam(username) {
  let conn;
  try {
    conn = await pool.getConnection();
    await conn.query('DELETE FROM marketing_team WHERE username = ?', [username]);
  } finally {
    if (conn) conn.end();
  }
}

/**
 * Get all marketing team members
 * @returns {Promise<string[]>} - List of marketing team usernames
 */
export async function getMarketingTeam() {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT username FROM marketing_team');
    return rows.map(row => row.username);
  } finally {
    if (conn) conn.end();
  }
}
