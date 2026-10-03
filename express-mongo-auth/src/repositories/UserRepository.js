import User from '../models/User.js';
class UserRepository {
  create(data) { return User.create(data); }
  findByEmail(email) { return User.findOne({ email }).select('+password').populate('roles').exec(); }
  findById(id) { return User.findById(id).populate('roles').exec(); }
  getAll() { return User.find().populate('roles').sort({ createdAt: -1 }).exec(); }
}
export default new UserRepository();

