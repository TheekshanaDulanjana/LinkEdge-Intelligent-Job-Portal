import express from 'express';
import cors from 'cors';
import helmet from 'helmet'
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes'; // make sure extension is correct if using ES modules

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

/* =========================
   Middleware (Global)
========================= */
app.use(helmet());

app.use(cors({
  origin: 'http://localhost:3000', // allow frontend
  credentials: true,
}));

app.use(express.json());

/* =========================
   Routes
========================= */

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

// Auth routes
app.use('/api/v1/auth', authRoutes);

/* =========================
   404 Handler
========================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

/* =========================
   Server Start
========================= */
app.listen(PORT, () => {
  console.log(`Auth service running on http://localhost:${PORT}`);
});

export default app;