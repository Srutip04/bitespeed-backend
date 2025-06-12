import express from 'express';
import { PrismaClient } from '@prisma/client';
import identifyRouter from './routes/identify';

const app = express();
const prisma = new PrismaClient();

app.use(express.json());
app.use('/identify', identifyRouter);

app.listen(8000, () => console.log('Server is running on port 8000'));
