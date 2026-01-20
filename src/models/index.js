const { pool } = require('../database');

module.exports = {
  User: {
    findOne: async (query) => {
      if (query.email) {
        const r = await pool.query('SELECT * FROM users WHERE email=$1 LIMIT 1', [query.email]);
        return r.rows[0] || null;
      }
      if (query.id) {
        const r = await pool.query('SELECT * FROM users WHERE id=$1 LIMIT 1', [query.id]);
        return r.rows[0] || null;
      }
      return null;
    },
    create: async ({ email, password, name }) => {
      const r = await pool.query(
        'INSERT INTO users(email,password,name) VALUES($1,$2,$3) RETURNING *',
        [email, password, name]
      );
      return r.rows[0];
    },
    updateOne: async (query, update) => {
      const user = await module.exports.User.findOne(query);
      if (!user) return { matched: 0, modified: 0 };
      const newName = update.name ?? user.name;
      const newPassword = update.password ?? user.password;
      await pool.query('UPDATE users SET name=$1, password=$2 WHERE id=$3', [newName, newPassword, user.id]);
      return { matched: 1, modified: 1 };
    },
    list: async () => {
      const r = await pool.query('SELECT id,email,name,created_at FROM users ORDER BY id DESC');
      return r.rows;
    }
  }
};