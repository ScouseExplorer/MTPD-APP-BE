exports.up = (pgm) => {
  pgm.createTable('users', {
    id: { type: 'serial', primaryKey: true },
    email: { type: 'text', notNull: true, unique: true },
    password: { type: 'text', notNull: true },
    name: { type: 'text' },
    created_at: { type: 'timestamptz', default: pgm.func('current_timestamp') }
  });
};

exports.down = (pgm) => {
  pgm.dropTable('users');
};