"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const node_cron_1 = __importDefault(require("node-cron"));
const fs_1 = __importDefault(require("fs"));
const puppeteer_1 = __importDefault(require("puppeteer"));
require("dotenv/config");
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3002;
app.use(express_1.default.json());
app.post('/parse', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const events = yield parseEvents();
        yield sendEventsToMainServer(events);
        res.status(200).send('Parsing and sending successful');
    }
    catch (error) {
        console.error('Error during parsing or sending:', error);
        res.status(500).send('Error during parsing or sending');
    }
}));
node_cron_1.default.schedule('0 0 * * *', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Running scheduled task: parsing events');
    try {
        const events = yield parseEvents();
        yield sendEventsToMainServer(events);
    }
    catch (error) {
        console.error('Error during scheduled parsing or sending:', error);
    }
}));
function runInitialParsing() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('Running initial parsing task');
        try {
            // const events: CreateEventDto[] = await parseEvents();
            const events = JSON.parse(fs_1.default.readFileSync('events.json', 'utf-8'));
            console.log('Starting to send events to main server');
            yield sendEventsToMainServer(events);
            console.log('Initial parsing and sending successful');
        }
        catch (error) {
            console.error('Error during initial parsing or sending:', error);
        }
    });
}
function sendEventsToMainServer(events) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield axios_1.default.post(`${process.env.MAIN_SERVER_URL}/api/events`, events);
            console.log('Events successfully sent to main server:', response.status);
        }
        catch (error) {
            console.error('Error sending events to main server:', error);
        }
    });
}
function parseEvents() {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.default.launch({ headless: false });
        const page = yield browser.newPage();
        console.log('Page has been opened');
        yield page.goto('https://sxodim.com/almaty', { waitUntil: 'load', timeout: 60000 });
        const today = new Date();
        const twoWeeksLater = new Date();
        twoWeeksLater.setDate(today.getDate() + 14);
        const isWithinTwoWeeks = (dateText) => {
            const [day, month, year] = dateText.split('.').map(Number);
            const eventDate = new Date(year, month - 1, day);
            return eventDate >= today && eventDate <= twoWeeksLater;
        };
        const bestEvents = yield page.evaluate(() => {
            return Array.from(document.querySelectorAll('.impression-best .impression-card')).map(card => {
                var _a, _b, _c;
                const titleElement = card.querySelector('.impression-card-title');
                const title = titleElement ? (_a = titleElement.textContent) === null || _a === void 0 ? void 0 : _a.trim() : '';
                const linkElement = card.querySelector('a');
                const link = linkElement ? linkElement.href : '';
                const dateElement = card.querySelector('.impression-card-info');
                const dateText = dateElement ? (_c = (_b = dateElement.textContent) === null || _b === void 0 ? void 0 : _b.match(/\d{2}\.\d{2}\.\d{4}/)) === null || _c === void 0 ? void 0 : _c[0] : null;
                return { title, link, date: dateText };
            });
        });
        const allEvents = [];
        for (let i = 0; i < 6; i++) {
            console.log('Scrolling to the bottom of the page');
            try {
                console.log(`Attempting to click "Show more" button, iteration ${i + 1}`);
                const previousCount = yield page.evaluate(() => {
                    return document.querySelectorAll('.impression-items .impression-card').length;
                });
                const result = yield page.evaluate(() => {
                    const button = document.querySelector('.impression-actions .button.impression-btn-secondary');
                    if (button) {
                        button.click();
                        return true;
                    }
                    return false;
                });
                if (result) {
                    console.log(`Successfully clicked "Show more" button, iteration ${i + 1}`);
                    yield page.waitForFunction((previousCount) => {
                        return document.querySelectorAll('.impression-items .impression-card').length > previousCount;
                    }, { timeout: 12000 }, previousCount);
                }
                else {
                    console.log(`"Show more" button not found, iteration ${i + 1}`);
                    break;
                }
            }
            catch (error) {
                console.error(`Error clicking "Show more" button, iteration ${i + 1}:`, error);
                break;
            }
        }
        const events = yield page.evaluate(() => {
            return Array.from(document.querySelectorAll('.impression-items .impression-card .impression-card-title')).map(card => {
                return card.href;
            });
        });
        const eventDetails = [];
        for (const event of bestEvents) {
            console.log('Opening event page at', event.link);
            try {
                yield page.goto(event.link, { waitUntil: 'networkidle0', timeout: 60000 });
                yield page.waitForSelector('.content_wrapper', { timeout: 20000 });
                const details = yield page.evaluate(() => {
                    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                    const title = ((_b = (_a = document.querySelector('.title')) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim()) || '';
                    const dateElement = document.querySelector('.event_date_block');
                    const fullDate = (_c = dateElement === null || dateElement === void 0 ? void 0 : dateElement.getAttribute('data-date')) !== null && _c !== void 0 ? _c : null;
                    const date = fullDate ? fullDate.split(' ')[0] : null;
                    const paragraphs = Array.from(document.querySelectorAll('.content_wrapper p'));
                    const description = paragraphs.map(p => { var _a; return (_a = p.textContent) === null || _a === void 0 ? void 0 : _a.trim(); }).join(' ');
                    const time = ((_e = (_d = document.querySelector('.more_info .svg-icon--time + .text')) === null || _d === void 0 ? void 0 : _d.textContent) === null || _e === void 0 ? void 0 : _e.trim()) || '';
                    const venue = ((_g = (_f = document.querySelector('.more_info .svg-icon--location + .text')) === null || _f === void 0 ? void 0 : _f.textContent) === null || _g === void 0 ? void 0 : _g.trim()) || '';
                    const price = ((_j = (_h = document.querySelector('.more_info .svg-icon--tenge + .text')) === null || _h === void 0 ? void 0 : _h.textContent) === null || _j === void 0 ? void 0 : _j.trim()) || '';
                    const ticketLinkElement = document.querySelector('.buy-ticket a.btn');
                    const ticketLink = ticketLinkElement ? ticketLinkElement.getAttribute('href') || '' : undefined;
                    return { title, date, description, time, venue, price, ticketLink };
                });
                eventDetails.push(details);
            }
            catch (error) {
                console.error('Timeout or navigation error:', error);
                continue;
            }
        }
        for (const url of events) {
            console.log('Opening event page at', url);
            try {
                yield page.goto(url, { waitUntil: 'networkidle0', timeout: 20000 });
                yield page.waitForSelector('.content_wrapper', { timeout: 20000 });
                const details = yield page.evaluate(() => {
                    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
                    const title = ((_b = (_a = document.querySelector('.title')) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim()) || '';
                    const dateElement = document.querySelector('.event_date_block');
                    const fullDate = (_c = dateElement === null || dateElement === void 0 ? void 0 : dateElement.getAttribute('data-date')) !== null && _c !== void 0 ? _c : null;
                    const date = fullDate ? fullDate.split(' ')[0] : null;
                    const paragraphs = Array.from(document.querySelectorAll('.content_wrapper p'));
                    const description = paragraphs.map(p => { var _a; return (_a = p.textContent) === null || _a === void 0 ? void 0 : _a.trim(); }).join(' ');
                    const time = ((_e = (_d = document.querySelector('.more_info .svg-icon--time + .text')) === null || _d === void 0 ? void 0 : _d.textContent) === null || _e === void 0 ? void 0 : _e.trim()) || '';
                    const venue = ((_g = (_f = document.querySelector('.more_info .svg-icon--location + .text')) === null || _f === void 0 ? void 0 : _f.textContent) === null || _g === void 0 ? void 0 : _g.trim()) || '';
                    const price = ((_j = (_h = document.querySelector('.more_info .svg-icon--tenge + .text')) === null || _h === void 0 ? void 0 : _h.textContent) === null || _j === void 0 ? void 0 : _j.trim()) || '';
                    const ticketLinkElement = document.querySelector('.buy-ticket a.btn');
                    const ticketLink = ticketLinkElement ? ticketLinkElement.getAttribute('href') || '' : undefined;
                    return { title, date, description, time, venue, price, ticketLink };
                });
                if (details.date && isWithinTwoWeeks(details.date)) {
                    eventDetails.push(details);
                }
            }
            catch (error) {
                console.error('Timeout or navigation error:', error);
                continue;
            }
        }
        console.log('Number of events:', eventDetails.length);
        yield browser.close();
        console.log('Browser has been closed');
        saveEventsToFile(eventDetails);
        return eventDetails;
    });
}
function saveEventsToFile(events) {
    fs_1.default.writeFileSync('events.json', JSON.stringify(events, null, 2), 'utf-8');
    console.log('Event data has been saved to events.json');
}
app.listen(PORT, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log(`Parser server is running on port ${PORT}`);
}));
