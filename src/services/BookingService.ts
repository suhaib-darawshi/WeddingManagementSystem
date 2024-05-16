import {Inject, Injectable} from "@tsed/di";
import { Order } from "../models/OrderModel";
import { MongooseModel } from "@tsed/mongoose";
import { BadRequest, Unauthorized } from "@tsed/exceptions";
import { CustomSocketService } from "./CustomSocketService";
import { Service } from "../models/ServiceModel";
import { NotificationService } from "./NotificationService";
import { ServiceProvider } from "../models/ServiceProviderModel";
import { User } from "../models/UserModel";
import { MoyasarService } from "./MoyasarService";

@Injectable()
export class BookingService {
    constructor(
        @Inject(Order)private orderModel:MongooseModel<Order>,
        @Inject(CustomSocketService)private socket:CustomSocketService,
        @Inject(NotificationService)private notService:NotificationService,
        @Inject(MoyasarService)private  moyasarService: MoyasarService
        ){}
        async update(id:string,order:Partial<Order>){
            return await   this.orderModel.findByIdAndUpdate(id,order);
        }
    async addOrder(order:Partial<Order>){
        return await this.orderModel.create(order);
    }
    async  getOrdersId(id:string){
        return await this.orderModel.findById(id).populate([{path:"service_id",model:"Service"},{path:"customer_id",model:"User"}])
    }
    async getFullOrder(id:string){
        return await this.orderModel.findById(id).populate([{path:"service_id",model:"Service",populate:{model:"ServiceProvider",path:"provider_id",populate:{path:"user",model:"User"}}},{path:"customer_id",model:"User"}])
    }
    async acceptOrder(orderId:string,user:string){

        const order=await this.orderModel.findById(orderId).populate([{path:"service_id",model:"Service",populate:{model:"ServiceProvider",path:"provider_id",populate:{path:"user",model:"User"}}},{path:"customer_id",model:"User"}]);
        if(!order){
            throw new BadRequest("Order Not Found");
        }
        if((((order.service_id as Service).provider_id as ServiceProvider).user as User)._id.toString()!=user){
            throw new Unauthorized("Order Does Not Belong To you")
        }
        if(order.status=='CANCLED'){
            throw new BadRequest("Order Cancled");
        }
        order.status="ACCEPTED";
        await order.save();
        await this.notService.createNotification({type:"Order Accepted",user_id:order.customer_id,message:`${(((order.service_id as Service).provider_id as ServiceProvider).user as User).username} قبل طلبك لخدمة ${(order.service_id as Service).title}`});
        this.socket.onOrderUpdated(order);
        console.log((order.customer_id as User)._id.toString());
        this.socket.sendEventToClient(((order.customer_id as User)._id.toString()),order,"Order Accepted");

    }
    async completeOrder(id:string,user:string){
        const order=await this.orderModel.findById(id).populate([{path:"service_id",model:"Service",populate:{model:"ServiceProvider",path:"provider_id",populate:{path:"user",model:"User"}}},{path:"customer_id",model:"User"}]);
        if(!order) throw new BadRequest("Order Not Found");
        if((((order.service_id as Service).provider_id as ServiceProvider).user as User)._id.toString()!=user){
            throw new Unauthorized("Order Does Not Belong To you")
        }
        order.status='COMPLETED';
        await order.save()
        this.socket.sendEventToClient((order.customer_id as User)._id.toString(),order,"Order Completed");
        return order;
    }
    async putTip(orderId:string,tip:{value:number,id:string}){
        const order=await this.orderModel.findById(orderId).populate([{path:"service_id",model:"Service",populate:{model:"ServiceProvider",path:"provider_id",populate:{path:"user",model:"User"}}},{path:"customer_id",model:"User"}]);
        if(!order) throw new BadRequest('Order not found');
        order.tip=tip;
        await order.save();
        if(!tip.id) throw new Unauthorized("Payment Id is required for auto accept services");
          const payment=await this.moyasarService.getPaymentInfo(tip.id);
          if(payment?.status!=200 || payment.data.status!="paid"){
            throw new Unauthorized("Payment Has Not Been Captured")
          }
        this.socket.sendEventToClient(((((order.service_id)as Service).provider_id as ServiceProvider).user as User)._id.toString(),order,"Tip");
        return order;
    }
    async rejecttOrder(orderId:string,user:string){
        const order=await this.orderModel.findById(orderId).populate([{path:"service_id",model:"Service",populate:{model:"ServiceProvider",path:"provider_id",populate:{path:"user",model:"User"}}},{path:"customer_id",model:"User"}]);
        if(!order){
            throw new BadRequest("Order Not Found");
        }
        if((((order.service_id as Service).provider_id as ServiceProvider).user as User)._id.toString()!=user){
            throw new Unauthorized("Order Does Not Belong To you")
        }
        const res=await this.moyasarService.refundPayment(order.paymentId??"",(order.service_id as Service).price*100);
        order.status="REJECTED";
        await order.save();
        await this.notService.createNotification({type:"Order Rejected",user_id:order.customer_id,message:`${(((order.service_id as Service).provider_id as ServiceProvider).user as User).username} رفض طلبك لخدمة ${(order.service_id as Service).title}`});
        this.socket.sendEventToClient(((order.customer_id as User)._id.toString()),order,"Order Rejected");
    }
    async getById(id:string){
        return await this.orderModel.findById(id);
    }
    async deleteOrder(id:string){
        return await this.orderModel.findByIdAndDelete(id);
    }
}
