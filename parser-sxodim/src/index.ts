import express from 'express';
import axios from 'axios';
import cron from 'node-cron';
import fs from 'fs';
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';

import 'dotenv/config';

interface CreateEventDto {
  title: string;
  date?: string | null;
  description?: string;
  time?: string;
  venue?: string;
  price?: string;
  ticketLink?: string;
}

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

app.post('/parse', async (req, res) => {
  try {
    const events: CreateEventDto[] = await parseEvents();
    await sendEventsToMainServer(events);
    res.status(200).send('Parsing and sending successful');
  } catch (error) {
    console.error('Error during parsing or sending:', error);
    res.status(500).send('Error during parsing or sending');
  }
});

cron.schedule('0 0 * * *', async () => {
  console.log('Running scheduled task: parsing events');
  try {
    const events: CreateEventDto[] = await parseEvents();
    await sendEventsToMainServer(events);
  } catch (error) {
    console.error('Error during scheduled parsing or sending:', error);
  }
});

async function runInitialParsing() {
  console.log('Running initial parsing task');
  try {
    const events: CreateEventDto[] = await parseEvents();
    console.log('Starting to send events to main server');
    await sendEventsToMainServer(events);
    console.log('Initial parsing and sending successful');
  } catch (error) {
    console.error('Error during initial parsing or sending:', error);
  }
}

async function sendEventsToMainServer(events: CreateEventDto[]) {
  try {
    const response = await axios.post(`${process.env.MAIN_SERVER_URL}/api/events`, events);
    console.log('Events successfully sent to main server:', response.status);
  } catch (error) {
    console.error('Error sending events to main server:', error);
  }
}

async function parseEvents() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    executablePath: process.env.CHROME_BIN || undefined
  });

  const page = await browser.newPage();
  console.log('Page has been opened');
  await page.goto('https://sxodim.com/almaty', { waitUntil: 'load', timeout: 60000 });

  const today = new Date();
  const twoWeeksLater = new Date();
  twoWeeksLater.setDate(today.getDate() + 14);

  const isWithinTwoWeeks = (dateText: string) => {
    const [day, month, year] = dateText.split('.').map(Number);
    const eventDate = new Date(year, month - 1, day);
    return eventDate >= today && eventDate <= twoWeeksLater;
  };

  const bestEvents = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.impression-best .impression-card')).map(card => {
      const titleElement = card.querySelector('.impression-card-title');
      const title = titleElement ? titleElement.textContent?.trim() : '';
      const linkElement = card.querySelector('a');
      const link = linkElement ? linkElement.href : '';
      const dateElement = card.querySelector('.impression-card-info');
      const dateText = dateElement ? dateElement.textContent?.match(/\d{2}\.\d{2}\.\d{4}/)?.[0] : null;
      return { title, link, date: dateText };
    });
  });

  const allEvents = [];

  for (let i = 0; i < 6; i++) {
    console.log('Scrolling to the bottom of the page');

    try {
      console.log(`Attempting to click "Show more" button, iteration ${i + 1}`);
      const previousCount = await page.evaluate(() => {
        return document.querySelectorAll('.impression-items .impression-card').length;
      });

      const result = await page.evaluate(() => {
        const button = document.querySelector('.impression-actions .button.impression-btn-secondary') as HTMLElement;
        if (button) {
          button.click();
          return true;
        }
        return false;
      });

      if (result) {
        console.log(`Successfully clicked "Show more" button, iteration ${i + 1}`);
        await page.waitForFunction(
          (previousCount) => {
            return document.querySelectorAll('.impression-items .impression-card').length > previousCount;
          },
          { timeout: 12000 },
          previousCount
        );
      } else {
        console.log(`"Show more" button not found, iteration ${i + 1}`);
        break;
      }
    } catch (error) {
      console.error(`Error clicking "Show more" button, iteration ${i + 1}:`, error);
      break;
    }
  }

  const events = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.impression-items .impression-card .impression-card-title')).map(card => {
      return (card as HTMLAnchorElement).href;
    });
  });

  const eventDetails: CreateEventDto[] = [];

  for (const event of bestEvents) {
    console.log('Opening event page at', event.link);
    try {
      await page.goto(event.link, { waitUntil: 'networkidle0', timeout: 60000 });
      await page.waitForSelector('.content_wrapper', { timeout: 20000 });

      const details: CreateEventDto = await page.evaluate(() => {
        const title = document.querySelector('.title')?.textContent?.trim() || '';
        const dateElement = document.querySelector('.event_date_block');
        const fullDate = dateElement?.getAttribute('data-date') ?? null;
        const date = fullDate ? fullDate.split(' ')[0] : null;
        
        const paragraphs = Array.from(document.querySelectorAll('.content_wrapper p'));
        const description = paragraphs.map(p => p.textContent?.trim()).join(' ');
        const time = document.querySelector('.more_info .svg-icon--time + .text')?.textContent?.trim() || '';
        const venue = document.querySelector('.more_info .svg-icon--location + .text')?.textContent?.trim() || '';
        const price = document.querySelector('.more_info .svg-icon--tenge + .text')?.textContent?.trim() || '';
        const ticketLinkElement = document.querySelector('.buy-ticket a.btn');
        const ticketLink = ticketLinkElement ? ticketLinkElement.getAttribute('href') || '' : undefined;

        return { title, date, description, time, venue, price, ticketLink };
      });

      eventDetails.push(details);
    } catch (error) {
      console.error('Timeout or navigation error:', error);
      continue;
    }
  }

  for (const url of events) {
    console.log('Opening event page at', url);
    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
      await page.waitForSelector('.content_wrapper', { timeout: 20000 });

      const details: CreateEventDto = await page.evaluate(() => {
        const title = document.querySelector('.title')?.textContent?.trim() || '';
        const dateElement = document.querySelector('.event_date_block');
        const fullDate = dateElement?.getAttribute('data-date') ?? null;
        const date = fullDate ? fullDate.split(' ')[0] : null;
        
        const paragraphs = Array.from(document.querySelectorAll('.content_wrapper p'));
        const description = paragraphs.map(p => p.textContent?.trim()).join(' ');
        const time = document.querySelector('.more_info .svg-icon--time + .text')?.textContent?.trim() || '';
        const venue = document.querySelector('.more_info .svg-icon--location + .text')?.textContent?.trim() || '';
        const price = document.querySelector('.more_info .svg-icon--tenge + .text')?.textContent?.trim() || '';
        const ticketLinkElement = document.querySelector('.buy-ticket a.btn');
        const ticketLink = ticketLinkElement ? ticketLinkElement.getAttribute('href') || '' : undefined;

        return { title, date, description, time, venue, price, ticketLink };
      });

      if (details.date && isWithinTwoWeeks(details.date)) {
        eventDetails.push(details);
      }
    } catch (error) {
      console.error('Timeout or navigation error:', error);
      continue;
    }
  }

  console.log('Number of events:', eventDetails.length);
  await browser.close();
  console.log('Browser has been closed');
  saveEventsToFile(eventDetails);
  return eventDetails;
}

function saveEventsToFile(events: CreateEventDto[]) {
  fs.writeFileSync('events.json', JSON.stringify(events, null, 2), 'utf-8');
  console.log('Event data has been saved to events.json');
}

app.listen(PORT, async () => {
  console.log(`Parser server is running on port ${PORT}`);
  runInitialParsing();
});
