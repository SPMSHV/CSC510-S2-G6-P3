import request from 'supertest';
const loadApp = async () => (await import('../../server.js')).default;

let app;
beforeAll(async () => { process.env.NODE_ENV = 'test'; app = await loadApp(); });

test('GET /api/customer-auth/me returns 401 when not logged in', async () => {
  await request(app).get('/api/customer-auth/me').expect(401);
});
