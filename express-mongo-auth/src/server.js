import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';
import seedRoles from './utils/seedRoles.js';
import seedUsers from './utils/seedUsers.js';

const PORT = process.env.PORT || 3000;
try {
  if (!process.env.JWT_SECRET) throw new Error('Configura JWT_SECRET en .env');
  await mongoose.connect(process.env.MONGODB_URI, { autoIndex: true });
  await seedRoles();
  await seedUsers();
  app.listen(PORT, () => console.log(`Servidor disponible en http://localhost:${PORT}`));
} catch (error) {
  console.error('No se pudo iniciar el servidor:', error.message);
  await mongoose.disconnect();
  process.exitCode = 1;
}
