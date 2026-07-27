import { AuthService } from '../services/auth.service.js';
import { ApiError } from '../utils/ApiError.js';
import httpStatus from 'http-status';

export const signup = async (req, res, next) => {
  try {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
      throw new ApiError(400, 'All fields are required');
    }

    const result = await AuthService.signUp(fullName, email, password);

    res.status(httpStatus.CREATED).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ApiError(400, 'Email and password are required');
    }

    const result = await AuthService.login(email, password);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ApiError(400, 'Refresh token is required');
    }

    // Verify refresh token and generate new pair
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const newTokens = AuthService.generateTokens(decoded.sub);

    res.json({
      success: true,
      data: newTokens
    });
  } catch (error) {
    next(error);
  }
};
