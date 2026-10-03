import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/users.routes.js';
import pageRoutes from './routes/pages.routes.js';

const app = express();
app.set('view engine', 'ejs');
app.set('views', fileURLToPath(new URL('./views', import.meta.url)));
app.use(cors());
app.use(express.json({ limit: '32kb' }));
app.use(express.static(fileURLToPath(new URL('./public', import.meta.url))));
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.get('/health', (req, res) => res.json({ ok: true }));
app.use(pageRoutes);
app.use((req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ message: 'Ruta no encontrada' });
  res.status(404).render('page', { page: '404', title: 'Página no encontrada', protectedPage: false });
});
app.use((err, req, res, next) => {
  const status = err.code === 11000 ? 409 : ['ValidationError', 'CastError'].includes(err.name) ? 400 : err.status || 500;
  const message = err.code === 11000 ? 'El email ya se encuentra en uso' : err.name === 'ValidationError'
    ? Object.values(err.errors).map(error => error.message).join('. ') : status >= 500 ? 'Error interno del servidor' : err.message;
  if (status >= 500) console.error(err);
  res.status(status).json({ message });
});
export default app;
