import { CreateEventDto } from "./dtos/CreateEvent.dto";
import { Request, Response } from 'express';
import EventModel from './models/Event';

class EventController {

    createEvents = async (req: Request, res: Response) => {
        try {
            const events: CreateEventDto[] = req.body;

            await EventModel.deleteMany({});
            console.log('Events deleted');
            
            const titles = events.map(event => event.title);


            const existingEvents = await EventModel.find({ title: { $in: titles } });
            const existingTitles = existingEvents.map(event => event.title);

            const uniqueEvents = events.filter(event => !existingTitles.includes(event.title));

            if (uniqueEvents.length > 0) {
                await EventModel.insertMany(uniqueEvents);
                console.log('Events received and saved', uniqueEvents.length);
                res.status(200).send('Unique events received and saved');
            } else {
                res.status(200).send('No unique events to save');
            }
        } catch (error) {
            console.error('Error saving events:', error);
            res.status(500).send('Error saving events');
        }
    }

    getEvents = async (req: Request, res: Response) => {
        try {
            const events = await EventModel.find();
            res.status(200).send(events);
        } catch (error) {
            console.error('Error getting events:', error);
            res.status(500).send('Error getting events');
        }
    }
}

export default EventController;
