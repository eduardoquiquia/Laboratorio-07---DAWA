import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

export const passwordPattern = /^(?=.*[A-Z])(?=.*\d)(?=.*[#$%&*@]).{8,}$/;
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  password: { type: String, required: true, select: false },
  name: { type: String, required: true, trim: true },
  lastName: { type: String, required: true, trim: true },
  phoneNumer: { type: String, required: true, trim: true, alias: 'phoneNumber' },
  birthdate: { type: Date, required: true, validate: { validator: value => value <= new Date(), message: 'La fecha de nacimiento no puede ser futura' } },
  url_profile: { type: String, default: '', validate: { validator: value => !value || /^https?:\/\/\S+$/i.test(value), message: 'La URL debe comenzar con http:// o https://' } },
  adress: { type: String, default: '', trim: true },
  roles: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Role' }]
}, { timestamps: true });

UserSchema.pre('validate', function () {
  if (this.isModified('password') && (!passwordPattern.test(this.password || '') || Buffer.byteLength(this.password || '') > 72)) {
    this.invalidate('password', 'La contraseña requiere 8 caracteres, una mayúscula, un dígito y un símbolo # $ % & * @ (máximo 72 bytes)');
  }
});
UserSchema.pre('save', async function () {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, Number(process.env.BCRYPT_SALT_ROUNDS || 10));
});
UserSchema.virtual('age').get(function () {
  if (!this.birthdate) return null;
  const today = new Date();
  let age = today.getUTCFullYear() - this.birthdate.getUTCFullYear();
  if (today.getUTCMonth() < this.birthdate.getUTCMonth() || (today.getUTCMonth() === this.birthdate.getUTCMonth() && today.getUTCDate() < this.birthdate.getUTCDate())) age--;
  return age;
});
export default mongoose.model('User', UserSchema);

