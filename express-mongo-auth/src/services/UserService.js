import userRepository from '../repositories/UserRepository.js';

export function profileFields(payload) {
  const fields = {};
  for (const key of ['email', 'name', 'lastName', 'birthdate', 'url_profile', 'adress']) {
    if (payload[key] !== undefined) {
      if (typeof payload[key] !== 'string') throw Object.assign(new Error('El campo ' + key + ' debe ser texto'), { status: 400 });
      fields[key] = payload[key].trim();
    }
  }
  if (fields.email) fields.email = fields.email.toLowerCase();
  const phone = payload.phoneNumber ?? payload.phoneNumer;
  if (phone !== undefined) {
    if (typeof phone !== 'string') throw Object.assign(new Error('El teléfono debe ser texto'), { status: 400 });
    fields.phoneNumer = phone.trim();
  }
  return fields;
}
export function publicUser(user) {
  return { id: user._id, name: user.name, lastName: user.lastName, email: user.email,
    phoneNumber: user.phoneNumer, phoneNumer: user.phoneNumer, birthdate: user.birthdate,
    age: user.age, url_profile: user.url_profile, adress: user.adress,
    roles: user.roles.map(role => role.name).filter(Boolean), createdAt: user.createdAt, updatedAt: user.updatedAt };
}
class UserService {
  async getAll() { return (await userRepository.getAll()).map(publicUser); }
  async find(id) {
    const user = await userRepository.findById(id);
    if (!user) throw Object.assign(new Error('Usuario no encontrado'), { status: 404 });
    return user;
  }
  async getById(id) { return publicUser(await this.find(id)); }
  async updateMe(id, payload) {
    const user = await this.find(id);
    Object.assign(user, profileFields(payload));
    if (payload.password !== undefined && payload.password !== '') {
      if (typeof payload.password !== 'string') throw Object.assign(new Error('La contraseña debe ser texto'), { status: 400 });
      user.password = payload.password;
    }
    await user.save();
    return publicUser(user);
  }
}
export default new UserService();

