const puppeteer = require('puppeteer');

async function buyTickets() {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();


    await page.goto('https://sxodim.com/almaty/festivali/festival-iq-bbq/tickets');
    

    const ticketType = "Early birds";
    const selector = `.ticket-rates-item[data-title="${ticketType}"] .ticket-rates-action.plus`;
    await page.waitForSelector(selector, { visible: true });
    await page.click(selector);


    const nextButtonSelector = '.entry-tickets-stages-item-footer .button-primary[data-action="next-stage"]';
    await page.waitForSelector(nextButtonSelector, { visible: true });
    await page.click(nextButtonSelector);


    const payButtonSelector = '.button.button-primary[data-action="buy-button"]';
    await page.waitForSelector(payButtonSelector, { visible: true });
    await page.click(payButtonSelector);


    const kaspiPaymentSelector = '.payment-button[data-payment-system="kaspi"]';
    await page.waitForSelector(kaspiPaymentSelector, { visible: true });
    await page.click(kaspiPaymentSelector);


    await page.waitForSelector('input[name="phone"]', { visible: true });
    await page.type('input[name="phone"]', '476667965');
    // <button id="login" type="button" class="auth-popup-send-code-button">Войти</button>
    await page.click('.auth-popup-send-code-button');


}

// buyTickets().catch(console.error);


export default buyTickets;
