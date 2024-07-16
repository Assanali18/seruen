import express from 'express';
import axios from 'axios';
import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
import cron from 'node-cron';

dotenv.config();

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
    res.status(200).send('Parsing and sending successful for ticketon and yandex events');
  } catch (error) {
    console.error('Error during parsing or sending:', error);
    res.status(500).send('Error during parsing or sending for ticketon and yandex events');
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
    console.log(events);
    
    await sendEventsToMainServer(events);
    console.log('Initial parsing and sending successful');
  } catch (error) {
    console.error('Error during initial parsing or sending:', error);
  }
}

async function sendEventsToMainServer(events: CreateEventDto[]) {
  try {
    console.log('Sending events to main server:', events);
    const response = await axios.post(`${process.env.MAIN_SERVER_URL}/api/events`, events);
    console.log('Events successfully sent to main server:', response.status);
  } catch (error) {
    console.error('Error sending events to main server:', error);
  }
}

async function parseEvents(): Promise<CreateEventDto[]> {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  console.log('Browser launched');

  const ticketonEvents = await parseTicketonEvents(browser);
  const yandexEvents = await parseYandexEvents(browser);

  await browser.close();
  console.log('Browser closed');

  return [...ticketonEvents, ...yandexEvents];
}

async function parseTicketonEvents(browser: any): Promise<CreateEventDto[]> {
  const page = await browser.newPage();
  try {
    await page.goto('https://ticketon.kz/almaty/concerts', { waitUntil: 'load', timeout: 60000 });
    console.log('Ticketon page opened');
    
    const links = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.list-item__link')).map(link => link.getAttribute('href'));
    });
    
    console.log('Found Ticketon event links:', links);

    const events: CreateEventDto[] = [];
    
    for (const link of links) {
      const eventId = link?.split('/').pop()?.split('?')[0];
      console.log(`Fetching details for Ticketon event ID: ${eventId}`);
      const eventDetails = await fetchTicketonEventDetails(eventId, 3); // 3 попытки
      if (eventDetails && eventDetails.price !== '0') {
        events.push(eventDetails);
      }
    }

    return events;
  } catch (error) {
    console.error('Error during Ticketon page evaluation or event fetching:', error);
    return [];
  } finally {
    await page.close();
    console.log('Ticketon page closed');
  }
}

async function fetchTicketonEventDetails(eventId: string | undefined, retries: number) {
  if (!eventId) {
    console.error('Ticketon event ID is undefined');
    return null;
  }
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(`https://ticketon.kz/api/v1/event/${eventId}`);
      const data = response.data.data;

      const description = cleanDescription(data.description);
      
      const dateInfo = data.info.find((info: { title: string; }) => info.title === 'Дата')?.value[0] || '';
      const timeInfo = data.info.find((info: { title: string; }) => info.title === 'Время' || info.title === 'Начало' )?.value[0] || '';

      return {
        title: data.title,
        date: dateInfo,
        time: timeInfo,
        description: description,
        venue: data.info.find((info: { title: string; }) => info.title === 'Место проведения')?.value[0] || '',
        price: data.price ? `${data.price}` : '0',
        ticketLink: `https://ticketon.kz/event/${eventId}`,
      };
    } catch (error) {
      console.error(`Error fetching details for Ticketon event ID: ${eventId}, attempt ${attempt}`, error);
      if (attempt === retries) {
        return null;
      }
    }
  }
}

async function parseYandexEvents(browser: any): Promise<CreateEventDto[]> {
  const page = await browser.newPage();
  try {
    await page.goto('https://afisha.yandex.kz/almaty/selections/all-events-concert-kz', { waitUntil: 'load', timeout: 60000 });
    console.log('Yandex Afisha page opened');
    
    const events: CreateEventDto[] = await page.evaluate(() => {
      const eventElements = document.querySelectorAll('.events-list__list .event-card-react');
      console.log('Found Yandex events:', eventElements.length);
      
      return Array.from(eventElements).map(eventElement => {
        const data = JSON.parse(eventElement.getAttribute('data-bem') || '{}')['event-card-react'].props;
        let date = '';
        let time = null;

        if (data.additionalInfo.includes(':')) {
          const dateTime = data.additionalInfo.split(',');
          date = dateTime[0]?.trim();
          time = dateTime[1]?.trim();
        } else {
          date = data.additionalInfo;
        }

        return {
          title: data.title,
          date: date,
          time: time,
          venue: data.place?.title,
          price: data.ticketsPrice ? data.ticketsPrice.replace('&nbsp;', ' ') : '0',
          ticketLink: `https://afisha.yandex.kz${data.link}`,
          description: '', // Will be filled after fetching additional details
        };
      });
    });

    const eventsWithPrice = events.filter((event: CreateEventDto) => event.price !== '0');

    for (const event of eventsWithPrice) {
      const details = await fetchYandexEventDetails(event.ticketLink, browser, 3); // 3 попытки
      event.description = details?.description;
    }

    return eventsWithPrice;
  } catch (error) {
    console.error('Error during Yandex Afisha page evaluation or event fetching:', error);
    return [];
  } finally {
    await page.close();
    console.log('Yandex Afisha page closed');
  }
}

async function fetchYandexEventDetails(url: string | undefined, browser: any, retries: number) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      console.log(`Page opened for details: ${url}`);
      
      const description = await page.evaluate(() => {
        const descriptionElement = document.querySelector('.concert-description__text-wrap') as HTMLElement;
        return descriptionElement ? descriptionElement.innerText : '';
      });

      return { description: formatDescription(description) };
    } catch (error) {
      console.error(`Error fetching details from Yandex Afisha page: ${url}, attempt ${attempt}`, error);
      if (attempt === retries) {
        return { description: '' };
      }
    } finally {
      await page.close();
      console.log(`Details page closed for: ${url}`);
    }
  }
}

function formatDescription(description: string): string {
  return description.replace(/\n/g, ' ').trim();
}

function cleanDescription(description: string): string {
  return description
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&nbsp;/g, ' ')
    .replace(/<\/?[^>]+(>|$)/g, "") 
    .replace(/\s+/g, ' ')
    .trim();
}

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  runInitialParsing();
});
