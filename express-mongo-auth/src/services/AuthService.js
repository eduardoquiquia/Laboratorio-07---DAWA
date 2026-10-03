import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import userRepository from '../repositories/UserRepository.js';
import roleRepository from '../repositories/RoleRepository.js';
import { profileFields, publicUser } from './UserService.js';

class AuthService {
  async signUp(payload) {
    const fields = profileFields(payload);
    if (await userRepository.findByEmail(fields.email)) throw Object.assign(new Error('El email ya se encuentra en uso'), { status: 409 });
    const role = await roleRepository.findByName('user');
    const user = await userRepository.create({ ...fields, password: payload.password, roles: [role._id] });
    return { ...publicUser(user), roles: ['user'] };
  }
  async signIn({ email, password }) {
    const user = typeof email === 'string' && typeof password === 'string'
      ? await userRepository.findByEmail(email.trim().toLowerCase()) : null;
    if (!user || !await bcrypt.compare(password, user.password)) throw Object.assign(new Error('Credenciales inválidas'), { status: 401 });
    const roles = user.roles.map(role => role.name);
    const token = jwt.sign({ sub: String(user._id), roles }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '1h' });
    return { token, roles };
  }
}
export default new AuthService();

