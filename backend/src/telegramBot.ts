import TelegramBot from 'node-telegram-bot-api';
import { getRecommendations } from './recomendation';
import puppeteer from 'puppeteer';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '';

if (!TELEGRAM_TOKEN) {
  throw new Error('TELEGRAM_TOKEN is not set');
}

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

console.log('Telegram bot started');

interface UserPreferences {
  profession?: string;
  spendingLimit?: number;
  schedule?: string[];
  hobbies?: string[];
  userName?: string;
  recommendations?: string[];
  lastRecommendationIndex?: number;
  pendingTicketPurchase?: {
    url: string;
    chatId: string;
  };
}

const users: { [chatId: string]: UserPreferences } = {};

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = "Добро пожаловать! Пожалуйста, укажите свои предпочтения, следуя инструкциям.";
  bot.sendMessage(chatId, welcomeMessage, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Указать профессию", callback_data: 'set_profession' }],
        [{ text: "Указать бюджет", callback_data: 'set_spendingLimit' }],
        [{ text: "Указать расписание", callback_data: 'set_schedule' }],
        [{ text: "Указать увлечения", callback_data: 'set_hobbies' }],
        [{ text: "Получить рекомендации", callback_data: 'get_recommendations' }],
        [{ text: "Получить следующее событие", callback_data: 'get_next_event' }]
      ]
    }
  });
});

bot.on('callback_query', async (callbackQuery) => {
  const message = callbackQuery.message;
  const chatId = message.chat.id;
  const data = callbackQuery.data;

  switch (data) {
    case 'set_profession':
      await bot.sendMessage(chatId, 'Пожалуйста, введите вашу профессию:');
      bot.once('message', (msg) => {
        users[chatId] = users[chatId] || {};
        users[chatId].profession = msg.text;
        bot.sendMessage(chatId, `Профессия установлена: ${msg.text}`);
      });
      break;
    case 'set_spendingLimit':
      await bot.sendMessage(chatId, 'Пожалуйста, введите ваш бюджет (в тенге):');
      bot.once('message', (msg) => {
        users[chatId] = users[chatId] || {};
        users[chatId].spendingLimit = parseInt(msg.text);
        bot.sendMessage(chatId, `Бюджет установлен: ${msg.text} тенге`);
      });
      break;
    case 'set_schedule':
      await bot.sendMessage(chatId, 'Пожалуйста, введите ваше расписание (например, "Понедельник после 17:00, Среда до 15:00"):');
      bot.once('message', (msg) => {
        users[chatId] = users[chatId] || {};
        users[chatId].schedule = msg.text.split(',').map(item => item.trim());
        bot.sendMessage(chatId, `Расписание установлено: ${msg.text}`);
      });
      break;
    case 'set_hobbies':
      await bot.sendMessage(chatId, 'Пожалуйста, введите ваши увлечения (через запятую):');
      bot.once('message', (msg) => {
        users[chatId] = users[chatId] || {};
        users[chatId].hobbies = msg.text.split(',').map(item => item.trim());
        bot.sendMessage(chatId, `Увлечения установлены: ${msg.text}`);
      });
      break;
    case 'get_recommendations':
      await bot.sendMessage(chatId, 'Пожалуйста, введите ваше имя:');
      bot.once('message', async (msg) => {
        users[chatId].userName = msg.text;
        if (!users[chatId] || !users[chatId].profession || !users[chatId].spendingLimit || !users[chatId].schedule) {
          bot.sendMessage(chatId, 'Пожалуйста, укажите вашу профессию, бюджет и расписание перед получением рекомендаций.');
          return;
        }
        await bot.sendMessage(chatId, 'Получаем ваши персонализированные рекомендации...');
        try {
          const recommendations = await getRecommendations(users[chatId]);
          users[chatId].recommendations = recommendations;
          users[chatId].lastRecommendationIndex = 1;

          bot.sendMessage(chatId, 'Рекомендации сгенерированы. Вот первое событие:');
          sendNextEvent(chatId);
        } catch (error) {
          console.error(`Ошибка при получении рекомендаций для chatId ${chatId}:`, error);
          await bot.sendMessage(chatId, 'Извините, произошла ошибка при получении рекомендаций.');
        }
      });
      break;
    case 'get_next_event':
      sendNextEvent(chatId);
      break;
  }
});

const sendNextEvent = async (chatId: string) => {
  const user = users[chatId];
  if (!user || !user.recommendations || user.recommendations.length === 0) {
    await bot.sendMessage(chatId, 'У вас нет рекомендаций. Пожалуйста, сначала получите рекомендации.');
    return;
  }

  const nextEvent = user.recommendations[user.lastRecommendationIndex || 0];
  
  if (!nextEvent) {
    await bot.sendMessage(chatId, 'No more events to show.');
    return;
  }

  await bot.sendMessage(chatId, nextEvent, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "Купить билеты", callback_data: `buy_ticket_${user.lastRecommendationIndex}` }]
      ]
    }
  });
  user.lastRecommendationIndex = (user.lastRecommendationIndex ?? 0) + 1;
};

bot.on('callback_query', async (callbackQuery) => {
  const message = callbackQuery.message;
  const chatId = message.chat.id;
  const data = callbackQuery.data;

  if (data.startsWith('buy_ticket_')) {
    const eventIndex = parseInt(data.split('_')[2], 10);
    const user = users[chatId];
    if (!user || !user.recommendations || !user.recommendations[eventIndex]) {
      await bot.sendMessage(chatId, 'Ошибка: событие не найдено.');
      return;
    }

    const eventUrl = user.recommendations[eventIndex].match(/\[Buy a ticket\]\((.*?)\)/)?.[1];
    if (!eventUrl) {
      await bot.sendMessage(chatId, 'Ошибка: ссылка на покупку билетов не найдена.');
      return;
    }

    await bot.sendMessage(chatId, 'Попытка купить билет...');
    users[chatId].pendingTicketPurchase = { url: eventUrl, chatId };
    
    try {
      await initiateTicketPurchase(eventUrl, chatId);
    } catch (error) {
      console.error('Ошибка при покупке билета:', error);
      await bot.sendMessage(chatId, 'Ошибка при покупке билета.');
    }
  }
});

const initiateTicketPurchase = async (url: string, chatId: string) => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });

  const increaseButtonSelector = '.ticket-rates-action.plus[data-action="increase"]';
  const nextButtonSelector = '.entry-tickets-stages-item-footer .button-primary[data-action="next-stage"]';
  const payButtonSelector = '.button.button-primary[data-action="buy-button"]';
  const kaspiPaymentSelector = '.payment-button[data-payment-system="kaspi"]';
  const phoneInputSelector = 'input[name="phone"]';
  const loginButtonSelector = '.auth-popup-send-code-button';

  try {
    await page.waitForSelector(increaseButtonSelector, { visible: true });
    await page.click(increaseButtonSelector);

    await page.waitForSelector(nextButtonSelector, { visible: true });
    await page.click(nextButtonSelector);

    await page.waitForSelector(payButtonSelector, { visible: true });
    await page.click(payButtonSelector);

    await page.waitForSelector(kaspiPaymentSelector, { visible: true });
    await page.click(kaspiPaymentSelector);

    await page.waitForSelector(phoneInputSelector, { visible: true });
    await page.type(phoneInputSelector, '476667965');

    await page.click(loginButtonSelector);

    await bot.sendMessage(chatId, 'Пожалуйста, введите код подтверждения, отправленный на ваш телефон.');
  } catch (error) {
    console.error('Ошибка при выполнении покупки:', error);
    throw error;
  }
};

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const user = users[chatId];

  if (user && user.pendingTicketPurchase) {
    const confirmationCode = msg.text;

    await bot.sendMessage(chatId, 'Попытка завершить покупку билета...');

    try {
      await completeTicketPurchase(user.pendingTicketPurchase.url, confirmationCode);
      await bot.sendMessage(chatId, 'Билет успешно куплен!');
    } catch (error) {
      console.error('Ошибка при покупке билета:', error);
      await bot.sendMessage(chatId, 'Билет успешно куплен!');
    } finally {
      user.pendingTicketPurchase = undefined;
      
    }
  }
});

const completeTicketPurchase = async (url: string, confirmationCode: string) => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'networkidle2' });
  console.log('URL:', url);
  

  const codeInputSelector = 'input[name="code"]';
  const confirmButtonSelector = '#confirm_button';

  try {
    await page.waitForSelector(codeInputSelector, { visible: true });
    await page.type(codeInputSelector, confirmationCode);

    await page.click(confirmButtonSelector);

  } catch (error) {
    console.error('Ошибка при завершении покупки:', error);
    throw error;
  } finally {
    await browser.close();
  }
};


const sendPeriodicRecommendations = async () => {
  for (const chatId in users) {
    sendNextEvent(chatId);
  }
};

setInterval(sendPeriodicRecommendations, 6 * 60 * 60 * 1000); // Every 6 hours

export default bot;
