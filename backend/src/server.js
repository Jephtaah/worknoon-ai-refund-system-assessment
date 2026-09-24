import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import refundsRouter from './routes/refunds.js';
import adminRouter from './routes/admin.js';

const app = express();

app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.status(200).json({ status: 'ok' }));
app.use('/api', refundsRouter);
app.use('/api', adminRouter);

// Central error handler — must be defined last, with all four arguments.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: { message: 'Something went wrong on our end.' } });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Backend listening on port ${port}`));
