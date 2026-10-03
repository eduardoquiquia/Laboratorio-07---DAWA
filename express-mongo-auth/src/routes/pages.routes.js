import express from 'express';
import jwt from 'jsonwebtoken';
import { sessionCookie } from '../controllers/AuthController.js';

const router = express.Router();
function protect(roles) {
  return (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    try {
      const cookie = (req.headers.cookie || '').split(';').map(value => value.trim()).find(value => value.startsWith('session='));
      const payload = jwt.verify(decodeURIComponent(cookie?.slice(8) || ''), process.env.JWT_SECRET);
      req.userId = payload.sub;
      req.userRoles = payload.roles || [];
      if (!req.userRoles.some(role => roles.includes(role))) return res.status(403).render('page', { page: '403', title: 'Acceso denegado', protectedPage: true });
      next();
    } catch {
      res.clearCookie('session', sessionCookie).redirect('/signIn');
    }
  };
}
const render = (page, title, protectedPage = false) => (req, res) => res.render('page', { page, title, protectedPage });
router.get('/', (req, res) => res.redirect('/signIn'));
router.get('/signIn', render('signIn', 'Iniciar sesión'));
router.get('/signUp', render('signUp', 'Crear cuenta'));
router.get('/profile', protect(['user', 'admin']), render('profile', 'Mi cuenta', true));
router.get('/dashboard', protect(['user', 'admin']), render('dashboard', 'Mi dashboard', true));
router.get('/admin', protect(['admin']), render('admin', 'Administración', true));
router.get('/admin/users/:id', protect(['admin']), render('detail', 'Información del usuario', true));
router.get('/403', protect(['user', 'admin']), (req, res) => res.status(403).render('page', { page: '403', title: 'Acceso denegado', protectedPage: true }));
export default router;
