import {Inject, Injectable, Service} from "@tsed/di";
import { Notification } from "../models/NotificationModel";
import { MongooseModel } from "@tsed/mongoose";
import mongoose from "mongoose";

@Service()
@Injectable()
export class NotificationService {
    constructor(@Inject(Notification)private notModel:MongooseModel<Notification>){}
    async createNotification(notification : Partial<Notification>) {

    }
    async setNotsAsSeen(userId:string){
        const nots=await this.notModel.find({user_id:new mongoose.Types.ObjectId(userId),is_open:false});
        for (const n of nots) {
            n.is_open=true;
            await n.save();
        }
    }
}
