import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

import { initializeSocket } from './socket/index.js';
import debateRoutes from './routes/debates.js';
import authRoutes from './routes/auth.js';
import creditRoutes from './routes/credits.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:3000';

// Allow localhost (dev), the configured client URL, and any Vercel domain
// (production + preview deployments have changing *.vercel.app URLs)
const isAllowedOrigin = (origin?: string): boolean => {
  if (!origin) return true; // non-browser / same-origin requests
  if (origin === 'http://localhost:3000') return true;
  if (origin === CLIENT_URL) return true;
  if (origin.endsWith('.vercel.app')) return true;
  return false;
};

const corsOrigin = (
  origin: string | undefined,
  cb: (err: Error | null, allow?: boolean) => void
) => cb(null, isAllowedOrigin(origin));

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigin,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/debates', debateRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/credits', creditRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize WebSocket
initializeSocket(io);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Podium server running on port ${PORT}`);
});

export { io };
