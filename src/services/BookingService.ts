import {Inject, Injectable} from "@tsed/di";
import { Order } from "../models/OrderModel";
import { MongooseModel } from "@tsed/mongoose";
import { BadRequest, Unauthorized } from "@tsed/exceptions";
import { CustomSocketService } from "./CustomSocketService";
import { Service } from "src/models/ServiceModel";

@Injectable()
export class BookingService {
    constructor(@Inject(Order)private orderModel:MongooseModel<Order>,@Inject(CustomSocketService)private socket:CustomSocketService){}
    async addOrder(order:Partial<Order>){
        return await this.orderModel.create(order);
    }
    async acceptOrder(orderId:string,user:string){

        const order=await this.orderModel.findById(orderId).populate({path:"service_id",model:"Service"});
        if(!order){
            throw new BadRequest("Order Not Found");
        }
        if((order.service_id as Service).provider_id!=user){
            throw new Unauthorized("Order Does Not Belong To you")
        }
        order.status="ACCEPTED";
        await order.save();
        this.socket.sendEventToClient((order.customer_id.toString()),order,"Order Accepted");

    }
    async rejecttOrder(orderId:string){
        const order=await this.orderModel.findById(orderId).populate({path:"service_id",model:"Service"})
        if(!order){
            throw new BadRequest("Order Not Found");
        }
        order.status="REJECTED";
        await order.save();
        this.socket.sendEventToClient((order.customer_id.toString()),order,"Order Rejected");
    }
}
