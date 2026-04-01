import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware — runs on every request
app.use(helmet());
app.use(cors());
app.use(express.json());

// Health check — visit http://localhost:3001/health to verify it works
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

// TODO: add routes here in the next step

app.listen(PORT, () => {
  console.log(`Auth service running on port ${PORT}`);
});

export default app;