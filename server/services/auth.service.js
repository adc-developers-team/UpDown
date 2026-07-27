import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

export class AuthService {
  static generateTokens(userId) {
    const payload = { sub: userId };
    
    const accessToken = jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
      expiresIn: '15m'
    });
    
    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: '7d'
    });
    
    return { accessToken, refreshToken };
  }

  static sanitizeUser(user) {
    const obj = user.toObject();
    delete obj.passwordHash;
    return obj;
  }

  static async signUp(fullName, email, password) {
    const existing = await User.findOne({ email });
    if (existing) throw new ApiError(409, 'Email already registered');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ fullName, email, passwordHash });

    const tokens = this.generateTokens(user._id.toString());

    return { user: this.sanitizeUser(user), ...tokens };
  }

  static async login(email, password) {
    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user) throw new ApiError(401, 'Invalid credentials');

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new ApiError(401, 'Invalid credentials');

    const tokens = this.generateTokens(user._id.toString());
    user.status = 'online';
    await user.save();

    return { user: this.sanitizeUser(user), ...tokens };
  }
}
