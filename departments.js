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
 * Get all departments and their chat IDs
 * @returns {Promise<Object>} - Departments and their chat IDs
 */
export async function getDepartments() {
  let conn;
  try {
    conn = await pool.getConnection();
    const rows = await conn.query('SELECT department, chat_id FROM departments');
    const departments = {};
    rows.forEach(row => {
      if (!departments[row.department]) {
        departments[row.department] = [];
      }
      departments[row.department].push(row.chat_id);
    });
    return departments;
  } finally {
    if (conn) conn.end();
  }
}
