import express from 'express';
import { logger } from './logger';
import parseHallFromPage from './parser copy';
import run from './parser copy';
import buyTickets from './buyTickets';
import './telegramBot'; 
import { parseEvents } from './parser';
import puppeteer, { Page } from 'puppeteer';
import buyHallTicket from './hall-tickets';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(logger);
app.use(express.json());

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
// // buyHallTicket();
// parseEvents(); 
// // buyTickets();


