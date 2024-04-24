import {Inject, Injectable} from "@tsed/di";
import { Order } from "../models/OrderModel";
import { MongooseModel } from "@tsed/mongoose";
import { BadRequest, Unauthorized } from "@tsed/exceptions";
import { CustomSocketService } from "./CustomSocketService";
import { Service } from "../models/ServiceModel";
import { NotificationService } from "./NotificationService";
import { ServiceProvider } from "../models/ServiceProviderModel";
import { User } from "../models/UserModel";

@Injectable()
export class BookingService {
    constructor(
        @Inject(Order)private orderModel:MongooseModel<Order>,
        @Inject(CustomSocketService)private socket:CustomSocketService,
        @Inject(NotificationService)private notService:NotificationService
        ){}
        async update(id:string,order:Partial<Order>){
            return await   this.orderModel.findByIdAndUpdate(id,order);
        }
    async addOrder(order:Partial<Order>){
        return await this.orderModel.create(order);
    }
    async acceptOrder(orderId:string,user:string){

        const order=await this.orderModel.findById(orderId).populate([{path:"service_id",model:"Service",populate:{model:"ServiceProvider",path:"provider_id",populate:{path:"user",model:"User"}}},{path:"customer_id",model:"User"}]);
        if(!order){
            throw new BadRequest("Order Not Found");
        }
        if(((order.service_id as Service).provider_id as ServiceProvider)._id!=user){
            throw new Unauthorized("Order Does Not Belong To you")
        }
        if(order.status=='CANCLED'){
            throw new BadRequest("Order Cancled");
        }
        order.status="ACCEPTED";
        await order.save();
        await this.notService.createNotification({type:"Order Accepted",user_id:order.customer_id,message:`${(((order.service_id as Service).provider_id as ServiceProvider).user as User).username} has accepted your order for ${(order.service_id as Service).title}`});
        this.socket.sendEventToClient(((order.customer_id as User)._id.toString()),order,"Order Accepted");

    }
    async completeOrder(id:string){
        const order=await this.orderModel.findById(id);
        if(!order) throw new BadRequest("Order Not Found");
        order.status='COMPLETED';
        await order.save()
        return order;
    }
    async rejecttOrder(orderId:string,user:string){
        const order=await this.orderModel.findById(orderId).populate({path:"service_id",model:"Service"})
        if(!order){
            throw new BadRequest("Order Not Found");
        }
        if(((order.service_id as Service).provider_id as ServiceProvider)._id!=user){
            throw new Unauthorized("Order Does Not Belong To you")
        }
        order.status="REJECTED";
        await order.save();
        await this.notService.createNotification({type:"Order Rejected",user_id:order.customer_id,message:`${(((order.service_id as Service).provider_id as ServiceProvider).user as User).username} has rejected your order for ${(order.service_id as Service).title}`});
        this.socket.sendEventToClient(((order.customer_id as User)._id.toString()),order,"Order Rejected");
    }
    async getById(id:string){
        return await this.orderModel.findById(id);
    }
    async deleteOrder(id:string){
        return await this.orderModel.findByIdAndDelete(id);
    }
}
