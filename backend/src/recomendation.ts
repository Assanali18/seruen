import 'dotenv/config';
import fs from 'fs';
import { Event } from './types';
import { OpenAI } from 'openai';

const apiKey = process.env.OPENAI_API_KEY || '';
if (!apiKey) {
  throw new Error('API_KEY is not set');
}
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

const systemPrompt = `
You are an intelligent assistant specializing in recommending events based on user preferences. 
Your task is to select the best events for the user from the given list of events, sorted by relevance. 
Each event contains the title, date, description, time, venue, price in tenge, and ticket link. 
The user preferences will include their profession, salary - price must not exceed more than 5,000 tenge, schedule, and hobbies. 
You need to consider these preferences and match them with the provided events to return the most relevant events. 
Additionally, analyze general trends and interests among similar people to enhance your recommendation. 
Your response should include a list of creative, interesting, and engaging messages for each event, including the date, time, venue, and appropriate emojis related to the event.
Each event message should follow this exact format and include relevant emojis:
**Event Title**
**Date:** event date
**Time:** event time
**Venue:** event venue
**Price:** event price tenge
Tickets are available at the link: [Buy a ticket](event ticket link)
Return the response as a valid JSON array.
`;

const events: Event[] = JSON.parse(fs.readFileSync('events.json', 'utf8'));
console.log('Loaded events from events.json');

const CHUNK_SIZE = 10; // Размер чанка для обработки

const getEventChunks = (events: Event[], chunkSize: number): Event[][] => {
  const chunks: Event[][] = [];
  for (let i = 0; i < events.length; i += chunkSize) {
    chunks.push(events.slice(i, i + chunkSize));
  }
  return chunks;
};

export const getRecommendations = async (userPreferences: { profession?: string; salary?: number; schedule?: string[]; hobbies?: string[]; userName?: string; }): Promise<string[]> => {
  const eventChunks = getEventChunks(events, CHUNK_SIZE);

  const recommendations: string[] = [];

  for (const chunk of eventChunks) {
    const userPrompt = `
      I am a ${userPreferences.profession} with a salary of ${userPreferences.salary}. 
      My schedule is ${JSON.stringify(userPreferences.schedule)} and my hobbies are ${JSON.stringify(userPreferences.hobbies)}.
      Here are some events: ${JSON.stringify(chunk)}
      Please recommend the most relevant events in a list of creative, interesting, and engaging messages with all necessary details, including the date, time, venue, and appropriate emojis related to the event. Use the user's name **${userPreferences.userName}** in the message explaining why they should attend each event.
      Each event message should follow this exact format and include relevant emojis:
      **Event Title**
      **Date:** event date
      **Time:** event time
      **Venue:** event venue
      **Price:** event price tenge
      Tickets are available at the link: event ticket link
      Return the response as a valid JSON array.
    `;

    console.log('Sending message for chunk...');

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      let responseText = response.choices[0].message.content?.trim();
      console.log('Response:', responseText);

      // Clean up response text
      responseText = responseText?.replace(/```json|```/g, '').trim() || '';

      const parsedResponse = JSON.parse(responseText);
      recommendations.push(...parsedResponse.map((event: any) => event.message));
    } catch (error) {
      console.error('Error during communication or parsing:', error);
      continue;
    }
  }

  return recommendations; 
};
