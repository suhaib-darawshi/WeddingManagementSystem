import {Inject, Injectable} from "@tsed/di";
import { User } from "../models/UserModel";
import { MongooseModel } from "@tsed/mongoose";
import * as Exceptions from "@tsed/exceptions" ;
import { AuthService } from "./AuthService";
import * as bcrypt from 'bcryptjs';
import { ServiceProvider } from "../models/ServiceProviderModel";
import { SProviderService } from "./SProviderService";
import { BookingService } from "./BookingService";
import { Order } from "../models/OrderModel";
import { ServiceService } from "./ServiceService";
import { Service } from "../models/ServiceModel";
import { CustomSocketService } from "./CustomSocketService";

@Injectable()
export class UserService {
    constructor(
        @Inject(User)private userModel:MongooseModel<User>,
        @Inject(AuthService)private auth:AuthService,
        @Inject(ServiceProvider)private sproviderModel:MongooseModel<ServiceProvider>,
        @Inject(SProviderService)private sproviderService:SProviderService,
        @Inject(BookingService)private bookingService:BookingService,
        @Inject(Service)private serviceModel:MongooseModel<Service>,
        @Inject(CustomSocketService)private socket:CustomSocketService
        ){}

    async bookService(order:Partial<Order>,serviceId:string,userId:string){
        const user=await this.userModel.findById(userId,{password:0})
        if(!user){
            throw new Exceptions.BadRequest("User Not Found");
        }
        const service=await this.serviceModel.findById(serviceId);
        if(!service){
            throw new Exceptions.BadRequest("Service Not Found");
        }
        order.customer_id=user;
        order.service_id=service;
        const orderr= await this.bookingService.addOrder(order);
        this.socket.sendEventToClient(service.provider_id.toString(),orderr,"New Order");
        return orderr;
    }
    async getById(id:string){
        try{
            return await this.userModel.findById(id);
        } catch(e){

        }
    }

    async signup(user:User){
        const u=await this.userModel.findOne({$or:[
            {phone:user.phone}
        ]});
        if(u){
            throw new Exceptions.Conflict("USER_ALREADY_EXIST");
        }
        const s=await this.sproviderModel.findOne({$or:[
            {username:user.username},
            {phone:user.phone}
        ]});
        if(s){
            throw new Exceptions.Conflict("USER_ALREADY_EXIST");
        }
        const x: string = (Math.random() * 899999 + 100000).toFixed(0);
        console.log(x);
        user.password=x;
        // TODO : send sms to verify
        return this.auth.generateToken(user);
    }
    async signin(user:User){
        const u= await this.userModel.findOne({phone:user.phone}).lean();
        if(!u){
            const p=await this.sproviderModel.findOne({phone:user.phone}).lean();
            if(!p){
                throw new Exceptions.Unauthorized("User not found or incorrect password.");
            }
            if(!(await bcrypt.compare(user.password,p.password))){
                throw new Exceptions.Unauthorized("User not found or incorrect password.");
            }
            return {user : await this.sproviderService.getUserInfo(p),token:this.auth.generateToken(p)};

        }
        if(!(await bcrypt.compare(user.password,u.password))){
            throw new Exceptions.Unauthorized("User not found or incorrect password.");
        }

        return {user : await this.getUserInfo(u),token:this.auth.generateToken(u)};
    }
    async getUserInfo(user:User){
        
        const userInfo=await this.userModel.aggregate([
            {
                $match: {
                    phone: user.phone,
                    password: user.password 
                }
            },
            {
                $lookup: {
                    from: "notifications",
                    localField: "_id",
                    foreignField: "user_id", 
                    as: "notifications",
                    pipeline:[
                        { $sort: { createdAt: -1 } }
                      ]
                }
            },
            {
                $lookup: {
                    from: "orders",
                    localField: "_id",
                    foreignField: "customer_id", 
                    as: "orders",
                    pipeline:[
                        {
                            $lookup:{
                                from:"services",
                                localField:"service_id",
                                foreignField:"_id",
                                as:"service",
                                
                                pipeline:[
                                    {
                                        $lookup:{
                                            from:"serviceproviders",
                                            localField:"provider_id",
                                            foreignField:"_id",
                                            as:"provider",
                                            pipeline:[
                                                {
                                                    $set:{"password":0}
                                                }
                                            ]
                                        }
                                    }
                                ]
                            }
                        },
                        { $sort: { createdAt: -1 } }
                      ]
                }
            },
            
            {
                $lookup: {
                  from: "chats", 
                  let: { userId: "$_id" },
                  pipeline: [
                    {
                      $match: {
                        $expr: {
                          $in: ["$$userId", "$users"] 
                        }
                      }
                    },
                    {
                        $sort:{lastUpdated:-1}
                    },
                    {
                        $lookup: {
                          from: "users", 
                          localField: "users",
                          foreignField: "_id",
                          as: "users"
                        }
                      },
                      
                      {
                        $lookup: {
                          from: "messages", 
                          localField: "messages",
                          foreignField: "_id",
                          as: "messages",
                          pipeline:[
                            { $sort: { createdAt: -1 } }
                          ]
                        },
                        
                      },
                  ],
                  as: "chats"
                }
            },
            
            {
                $limit: 1 
            }
        ]).exec();
        return  userInfo[0];
    }
    async create(user:User){
        
        const u=await this.userModel.findOne({$or:[
            {username:user.username},
            {phone:user.phone}
        ]});
        if(u){
            throw new Exceptions.Conflict("USER_ALREADY_EXIST");
        }
        user.password=await this.hashPassword(user.password);
        await this.userModel.create(user);
        return await this.signin(user);
    }

    async  hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, await bcrypt.genSalt(10));
    }
}
