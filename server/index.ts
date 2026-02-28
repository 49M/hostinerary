import { config } from 'dotenv';
config({ path: '.env' });
config({ path: '.env.local', override: true });
import express from 'express';
import cors from 'cors';
import './db.js';
import propertiesRouter from './routes/properties.js';
import partnersRouter from './routes/partners.js';
import generateRouter from './routes/generate.js';
import itineraryRouter from './routes/itinerary.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/properties', propertiesRouter);
app.use('/api/partners', partnersRouter);
app.use('/api/generate', generateRouter);
app.use('/api/itinerary', itineraryRouter);

app.listen(PORT, () => {
  console.log(`✓ API server running on http://localhost:${PORT}`);
});
