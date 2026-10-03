import authService from '../services/AuthService.js';
import jwt from 'jsonwebtoken';

export const sessionCookie = { httpOnly: true, sameSite: 'strict', path: '/' };

class AuthController {
    async signUp(req, res, next) {
        try {
            const payload = req.body;
            if (!payload.email || !payload.password)
                return res.status(400).json({ message: 'El email y password son requeridos' });
            const user = await authService.signUp(payload);
            return res.status(201).json(user);
        } catch (err) {
            next(err);
        }
    }
    async signIn(req, res, next) {
        try {
            const { email, password } = req.body;
            if (!email || !password)
                return res.status(400).json({ message: 'El email y password son requeridos' });
            const token = await authService.signIn({ email, password });
            res.cookie('session', token.token, { ...sessionCookie, secure: process.env.NODE_ENV === 'production', expires: new Date(jwt.decode(token.token).exp * 1000) });
            return res.status(200).json(token);
        } catch (err) {
        next(err);
        }
    }
}
export default new AuthController();
