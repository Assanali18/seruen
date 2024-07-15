import express from 'express';
import axios from 'axios';
import cron from 'node-cron';
import dotenv from 'dotenv';

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
const PORT = process.env.PORT || 3003;

app.use(express.json());

app.post('/parse', async (req, res) => {
  try {
    const events: CreateEventDto[] = await fetchEvents();
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
    const events: CreateEventDto[] = await fetchEvents();
    await sendEventsToMainServer(events);
  } catch (error) {
    console.error('Error during scheduled parsing or sending:', error);
  }
});

async function runInitialParsing() {
  console.log('Running initial parsing task');
  try {
    const events: CreateEventDto[] = await fetchEvents();
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

async function fetchEvents(): Promise<CreateEventDto[]> {
  const response = await axios.get('https://ticketon.kz/api/v1/event/?filter[selection]=popular&lang=ru');
  const eventData = response.data.data.data;

  const events = await Promise.all(eventData.map(async (event: any) => {
    const ticketLink = `https://ticketon.kz${event.url}`;
    const eventDetails = await fetchEventDetails(event.url);

    return {
      title: event.title,
      date: event.date.split(' ')[0],
      time: event.date.split(' ')[1],
      venue: event.place,
      price: event.price.min ? event.price.min : "0",
      ticketLink: ticketLink,
      description: eventDetails.description,
    };
  }));

  return events;
}

async function fetchEventDetails(url: string) {
  const response = await axios.get(`https://ticketon.kz/api/v1${url}`);
  const eventDetails = response.data.data;
  const description = extractTextFromHTML(eventDetails.description);

  return {
    description: description
  };
}

function extractTextFromHTML(html: string): string {
  return html
    .replace(/<\/?[^>]+(>|$)/g, "") // Удалить HTML теги
    .replace(/&quot;/g, '"') // Заменить HTML сущности
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ') // Заменить множественные пробелы на один
    .trim(); // Удалить лишние пробелы в начале и конце строки
}

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  runInitialParsing();
});
