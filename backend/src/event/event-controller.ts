import { CreateEventDto } from "./dtos/CreateEvent.dto";
import { Request, Response } from 'express';
import EventModel  from './models/Event';

class EventController {

  
    createEvents = async(req: Request, res: Response) => {
      try {
        const events: CreateEventDto[] = req.body;
            await EventModel.insertMany(events);
            console.log('Events received and saved', events.length);
            
            res.status(200).send('Events received and saved');
          } catch (error) {
            console.error('Error saving events:', error);
            res.status(500).send('Error saving events');
          }  
    }

    getEvents = async(req: Request, res: Response) => {
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
  