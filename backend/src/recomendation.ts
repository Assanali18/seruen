import fs from 'fs';
import { Event } from './types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { "responseMimeType": "application/json" } });

const events: Event[] = JSON.parse(fs.readFileSync('events.json', 'utf8'));

const CHUNK_SIZE = 10;

const getEventChunks = (events: Event[], chunkSize: number): Event[][] => {
  const chunks: Event[][] = [];
  for (let i = 0; i < events.length; i += chunkSize) {
    chunks.push(events.slice(i, i + chunkSize));
  }
  return chunks;
};

export const getRecommendations = async (userPreferences: { salary?: number; hobbies?: string[]; userName?: string; }): Promise<{ venue: string; ticketLink: string; message: string; }[]> => {
  const eventChunks = getEventChunks(events, CHUNK_SIZE);

  const recommendations: { venue: string; ticketLink: string; message: string; }[] = [];

  for (const chunk of eventChunks) {
    const userPrompt = `
      My budget is ${userPreferences.salary}
      my hobbies are ${JSON.stringify(userPreferences.hobbies)}.
      Here are some events: ${JSON.stringify(chunk)}
      Please recommend the most relevant events, sorted by relevance, in a list of creative, interesting, and engaging messages with all necessary details, including the date, time, venue, and appropriate emojis related to the event.
      Use the user's name **${userPreferences.userName}** in the message explaining why they should attend each event. Respond as a professional SMM specialist.
      Be sure that the price of the event was not more expensive than the user's budget by 3000 tenge.
      Avoid repeating events in the recommendations.
      Do not invent new events, only use the events provided.
      Discard any events that do not fit the user's preferences based on the provided criteria.
      Return the response as a valid JSON array of objects, each with keys "venue", "ticketLink", and "message" containing the formatted event details.
      
      Example:
      [
        {
          "venue": "Almaty Arena, мкр. Нуркент, 7",
          "ticketLink": "https://sxodim.com/almaty/kontserty/solnyy-koncert-jony/tickets",
          "message": "🔥 Готовы погрузиться в мир эмоций и драйва? 🔥\n\nСольный концерт JONY уже совсем скоро! 🎉\n\n🗓️ 22.09.2024\n💰 20000 тг\n**⏰ 20:00\n📍 Almaty Arena, мкр. Нуркент, 7\n\n🎤 JONY исполнит свои самые популярные хиты, заставит вас петь и танцевать всю ночь напролет!\n\n🎫 Билеты уже в продаже: "https://sxodim.com/almaty/kontserty/solnyy-koncert-jony/tickets" \n\nНе пропустите это незабываемое событие! 💥"
        }
      ]
    `;

    console.log('Sending message for chunk...');

    try {
      const response = await model.generateContent(userPrompt);
      const responseText = await response.response.text();
      console.log('Response:', responseText);

      const parsedResponse = JSON.parse(responseText);
      recommendations.push(...parsedResponse);
    } catch (error) {
      console.error('Error during communication or parsing:', error);
      continue;
    }
  }
  return recommendations;
};
