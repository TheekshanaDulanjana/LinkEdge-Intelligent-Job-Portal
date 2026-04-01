import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate, registerSeekerSchema, registerCompanySchema, loginSchema } from '../middleware/validate';
import { authenticate } from '../middleware/authenticate';

const router = Router();

// POST /api/v1/auth/register/seeker
// validate() runs first → if OK, controller runs
router.post(
  '/register/seeker',
  validate(registerSeekerSchema),
  authController.registerSeeker
);

// POST /api/v1/auth/register/company
router.post(
  '/register/company',
  validate(registerCompanySchema),
  authController.registerCompany
);

// POST /api/v1/auth/login
router.post(
  '/login',
  validate(loginSchema),
  authController.login
);

// GET /api/v1/auth/me  (protected — must be logged in)
router.get(
  '/me',
  authenticate,   // Checks JWT first
  authController.getMe
);

export default router;