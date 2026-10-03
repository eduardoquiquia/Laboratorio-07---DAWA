import { randomBytes } from 'node:crypto';
import User from '../models/User.js';
import Role from '../models/Role.js';

export default async function seedUsers() {
  const admin = await Role.findOne({ name: 'admin' });
  if (await User.exists({ roles: admin._id })) return;
  const email = (process.env.ADMIN_EMAIL || 'admin@laboratorio.local').trim().toLowerCase();
  if (await User.exists({ email })) throw new Error('ADMIN_EMAIL pertenece a un usuario existente; utiliza otro correo para el administrador inicial');
  const password = process.env.ADMIN_PASSWORD || 'Admin@' + randomBytes(12).toString('hex');
  await User.create({ name: 'Administrador', lastName: 'Laboratorio', email, password,
    phoneNumer: '000000000', birthdate: '1990-01-01', roles: [admin._id] });
  console.log('Administrador creado: ' + email);
  if (!process.env.ADMIN_PASSWORD) console.log('Contraseña inicial (guárdala y cámbiala en Mi cuenta): ' + password);
}

