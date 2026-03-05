import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Security headers
app.use(helmet());

// CORS
const allowedOrigins = (process.env.CORS_ORIGINS ?? '').split(',').map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  }),
);

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Global rate limit
app.use(
  rateLimit({
    windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS ?? 900000),
    max: Number(process.env.RATE_LIMIT_MAX_REQUESTS ?? 100),
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later' },
  }),
);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
import authRouter   from './routes/auth';
import usersRouter  from './routes/users';
import alertsRouter from './routes/alerts';
import chatRouter   from './routes/chat';
import sosRouter    from './routes/sos';

app.use('/auth',   authRouter);
app.use('/users',  usersRouter);
app.use('/alerts', alertsRouter);
app.use('/chat',   chatRouter);
app.use('/sos',    sosRouter);

// Coming soon:
// app.use('/feed', feedRouter);
// app.use('/edu',  eduRouter);

// Central error handler — must be last
app.use(errorHandler);

export default app;
