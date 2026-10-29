import { Request, Response } from 'express';
import { authService } from '../services/auth.service';

export const authController = {

  async registerSeeker(req: Request, res: Response) {
    try {
      const result = await authService.registerSeeker(req.body);
      res.status(201).json({
        success: true,
        message: 'Job seeker account created successfully',
        data: result,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'EMAIL_TAKEN') {
        res.status(409).json({
          success: false,
          message: 'An account with this email already exists',
        });
        return;
      }
      console.error('Register seeker error:', error);
      res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
      });
    }
  },

  async registerCompany(req: Request, res: Response) {
    try {
      const result = await authService.registerCompany(req.body);
      res.status(201).json({
        success: true,
        message: 'Company account created successfully',
        data: result,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'EMAIL_TAKEN') {
        res.status(409).json({
          success: false,
          message: 'An account with this email already exists',
        });
        return;
      }
      console.error('Register company error:', error);
      res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
      });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const result = await authService.login(req.body.email, req.body.password);
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
      });
    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'INVALID_CREDENTIALS') {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password',
        });
        return;
      }
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Something went wrong. Please try again.',
      });
    }
  },

  // Protected route — returns the logged-in user's own data
  async getMe(req: Request, res: Response) {
    try {
      const user = await userRepository_getById(req.user!.userId);
      res.status(200).json({
        success: true,
        data: {
          id: user!.id,
          email: user!.email,
          role: user!.role,
          profile: user!.role === 'SEEKER' ? user!.seeker : user!.company,
        },
      });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  },
};

// Small helper used only in getMe above
import { userRepository } from '../repositories/user.repository';
async function userRepository_getById(id: string) {
  return userRepository.findById(id);
}