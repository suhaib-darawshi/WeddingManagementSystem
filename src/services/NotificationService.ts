import {Inject, Injectable, InjectorService, Service} from "@tsed/di";
import { Notification } from "../models/NotificationModel";
import { MongooseModel } from "@tsed/mongoose";
import mongoose from "mongoose";
import { CustomSocketService } from "./CustomSocketService";

@Service()
@Injectable()
export class NotificationService {
    constructor(@Inject(Notification)private notModel:MongooseModel<Notification>, 
       private injector: InjectorService,
    ){}
    async createNotification(notification : Partial<Notification>) {
        const not= await this.notModel.create(notification);
        this.injector.get<CustomSocketService>(CustomSocketService)?.sendEventToClient(notification.user_id!.toString(),not,"New Notification");
        return not;
    }
    async setNotsAsSeen(userId:string){
        const nots=await this.notModel.find({user_id:new mongoose.Types.ObjectId(userId),is_open:false});
        for (const n of nots) {
            n.is_open=true;
            await n.save();
        }
    }
}
