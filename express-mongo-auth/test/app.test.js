import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import app from '../src/app.js';
import User from '../src/models/User.js';
import seedRoles from '../src/utils/seedRoles.js';
import seedUsers from '../src/utils/seedUsers.js';

test('Laboratorio 07: modelo, vistas, autenticación y persistencia', async t => {
  process.env.JWT_SECRET = 'test-only-' + randomUUID();
  process.env.BCRYPT_SALT_ROUNDS = '4';
  process.env.ADMIN_EMAIL = 'admin@example.test';
  process.env.ADMIN_PASSWORD = 'Admin@12345';
  const database = 'lab07_test_' + randomUUID().replaceAll('-', '');
  let server;
  t.after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    // Solo se borra la base temporal creada por esta ejecución.
    if (mongoose.connection.name === database && database.startsWith('lab07_test_')) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  });
  await mongoose.connect(process.env.MONGODB_URI, { dbName: database, serverSelectionTimeoutMS: 3000 });
  await seedRoles();
  await seedUsers();
  await User.init();
  server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const request = (path, { token, cookie, body, method = 'GET' } = {}) => fetch(base + path, {
    method, redirect: 'manual', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const signup = { name: 'Ana', lastName: 'Pérez', phoneNumber: '999888777', birthdate: '2000-05-12', email: 'ana@example.test', password: 'Clave@123', roles: ['admin'] };
  let userToken, userCookie, adminToken, adminCookie, id;

  await t.test('vistas públicas, 404 y redirección sin sesión', async () => {
    for (const path of ['/signIn', '/signUp']) {
      const response = await request(path);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /<form/);
    }
    assert.equal((await request('/inexistente')).status, 404);
    assert.equal((await request('/api/inexistente')).status, 404);
    for (const path of ['/profile', '/dashboard', '/admin']) {
      const response = await request(path);
      assert.equal(response.status, 302);
      assert.equal(response.headers.get('location'), '/signIn');
    }
    assert.equal((await request('/api/users/me')).status, 401);
  });
  await t.test('validaciones de contraseña, campos y nacimiento', async () => {
    for (const password of ['short', 'abcdefgh@1', 'ABCDEFGH@', 'Abcdefg12']) {
      assert.equal((await request('/api/auth/signUp', { method: 'POST', body: { ...signup, password } })).status, 400);
    }
    for (const override of [{ lastName: '' }, { phoneNumber: '' }, { birthdate: '2999-01-01' }, { birthdate: 'invalid' }, { email: 'invalid' }]) {
      assert.equal((await request('/api/auth/signUp', { method: 'POST', body: { ...signup, ...override } })).status, 400);
    }
  });
  await t.test('registro sin escalamiento de rol, hash y correo único', async () => {
    const response = await request('/api/auth/signUp', { method: 'POST', body: signup });
    assert.equal(response.status, 201);
    const data = await response.json(); id = data.id;
    assert.equal(data.password, undefined);
    const saved = await User.findById(id).select('+password').populate('roles');
    assert.match(saved.password, /^\$2/);
    assert.deepEqual(saved.roles.map(role => role.name), ['user']);
    assert.equal(saved.phoneNumer, signup.phoneNumber);
    assert.equal((await request('/api/auth/signUp', { method: 'POST', body: { ...signup, email: signup.email.toUpperCase() } })).status, 409);
  });
  await t.test('ingreso y control por roles en API y páginas', async () => {
    assert.equal((await request('/api/auth/signIn', { method: 'POST', body: { email: signup.email, password: 'incorrecta' } })).status, 401);
    const login = await request('/api/auth/signIn', { method: 'POST', body: signup });
    assert.equal(login.status, 200);
    userToken = (await login.json()).token;
    userCookie = login.headers.get('set-cookie').split(';')[0];
    assert.match(login.headers.get('set-cookie'), /HttpOnly/i);
    const adminLogin = await request('/api/auth/signIn', { method: 'POST', body: { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD } });
    adminToken = (await adminLogin.json()).token;
    adminCookie = adminLogin.headers.get('set-cookie').split(';')[0];
    assert.equal((await request('/api/users', { token: userToken })).status, 403);
    assert.equal((await request('/api/users/' + id, { token: userToken })).status, 403);
    assert.equal((await request('/admin', { cookie: userCookie })).status, 403);
    for (const path of ['/profile', '/dashboard']) assert.equal((await request(path, { cookie: userCookie })).status, 200);
    for (const path of ['/admin', '/admin/users/' + id, '/dashboard']) assert.equal((await request(path, { cookie: adminCookie })).status, 200);
  });
  await t.test('perfil editable, edad calculada y sin modificación de roles', async () => {
    const update = await request('/api/users/me', { method: 'PATCH', token: userToken, body: { name: 'Ana María', phoneNumber: '111222333', adress: 'Lima', url_profile: 'https://example.test/photo.png', password: 'Nueva@123', roles: ['admin'] } });
    assert.equal(update.status, 200);
    const data = await update.json();
    assert.equal(data.name, 'Ana María'); assert.equal(data.phoneNumer, '111222333');
    assert.deepEqual(data.roles, ['user']); assert.equal(data.password, undefined);
    const today = new Date();
    const expectedAge = today.getUTCFullYear() - 2000 - (today.getUTCMonth() < 4 || (today.getUTCMonth() === 4 && today.getUTCDate() < 12) ? 1 : 0);
    assert.equal(data.age, expectedAge);
    assert.equal((await User.findById(id)).adress, 'Lima');
    assert.equal((await request('/api/auth/signIn', { method: 'POST', body: signup })).status, 401);
    assert.equal((await request('/api/auth/signIn', { method: 'POST', body: { email: signup.email, password: 'Nueva@123' } })).status, 200);
    assert.equal((await request('/api/users/me', { method: 'PATCH', token: userToken, body: { password: 'weak' } })).status, 400);
  });
  await t.test('listado y detalle de administrador sin hashes, seed idempotente', async () => {
    const response = await request('/api/users', { token: adminToken });
    assert.equal(response.status, 200);
    const users = await response.json(); assert.equal(users.length, 2);
    for (const user of users) { assert.equal(user.password, undefined); assert.ok(user.createdAt); }
    assert.equal((await request('/api/users/' + id, { token: adminToken })).status, 200);
    assert.equal((await request('/api/users/not-an-id', { token: adminToken })).status, 400);
    assert.equal((await request('/api/users/' + new mongoose.Types.ObjectId(), { token: adminToken })).status, 404);
    await seedRoles(); await seedUsers(); assert.equal(await User.countDocuments(), 2);
  });
  await t.test('JWT vencido o alterado y cierre de sesión', async () => {
    const expired = jwt.sign({ sub: id, roles: ['user'] }, process.env.JWT_SECRET, { expiresIn: -1 });
    for (const token of [expired, 'invalid']) {
      assert.equal((await request('/api/users/me', { token })).status, 401);
      assert.equal((await request('/profile', { cookie: 'session=' + token })).headers.get('location'), '/signIn');
    }
    const response = await request('/api/auth/signOut', { method: 'POST', cookie: userCookie });
    assert.equal(response.status, 204);
    assert.match(response.headers.get('set-cookie'), /Expires=Thu, 01 Jan 1970/);
  });
});
