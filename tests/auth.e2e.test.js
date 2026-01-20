const request = require('supertest');
const app = require('../server'); // export app from server.js (module.exports = app)

describe('Auth', () => {
  it('signup -> login -> me', async () => {
    const email = `user${Date.now()}@example.com`;
    const password = 'Aa1!test123';

    const signup = await request(app).post('/api/auth/signup').send({ email, password, name: 'Test' });
    expect(signup.status).toBe(201);
    const token = signup.body.token;

    const login = await request(app).post('/api/auth/login').send({ email, password });
    expect(login.status).toBe(200);

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe(email);
  });
});