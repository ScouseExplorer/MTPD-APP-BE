// id, email, password (hashed), name, created_at, last_login
const db = require('../config/database');

class User {
  static async findById(id) {
    const result = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  static async findByEmail(email) {
    const result = await db.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0] || null;
  }

  static async findByGoogleId(googleId) {
    const result = await db.query(
      'SELECT * FROM users WHERE google_id = $1',
      [googleId]
    );
    return result.rows[0] || null;
  }

  static async create(userData) {
    const { email, password, name, googleId, avatar, role = 'user' } = userData;
    
    const result = await db.query(
      `INSERT INTO users (email, password, name, google_id, avatar, role, is_email_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [email, password, name, googleId, avatar, role, googleId ? true : false]
    );
    
    return result.rows[0];
  }

  static async update(id, updates) {
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    
    const setClause = fields.map((field, index) => 
      `${field} = ${index + 1}`
    ).join(', ');
    
    values.push(id);
    
    const result = await db.query(
      `UPDATE users SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = ${values.length}
       RETURNING *`,
      values
    );
    
    return result.rows[0] || null;
  }

  static async delete(id) {
    await db.query('DELETE FROM users WHERE id = $1', [id]);
  }
}

module.exports = User;