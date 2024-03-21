import {Inject, Injectable} from "@tsed/di";
import { ServiceService } from "./ServiceService";
import { ServiceProvider } from "../models/ServiceProviderModel";
import { MongooseModel } from "@tsed/mongoose";
import { AuthService } from "./AuthService";
import * as bcrypt from 'bcryptjs';
import { Service } from "../models/ServiceModel";
import { BadRequest } from "@tsed/exceptions";
import { PlatformMulterFile } from "@tsed/common";
import * as fs from 'fs';
import * as path from 'path';
import * as Exceptions from "@tsed/exceptions" ;
import { User } from "../models/UserModel";

@Injectable()
export class SProviderService {
    constructor(
        @Inject(ServiceService)private serviceService:ServiceService,
        @Inject(ServiceProvider) private sproviderModel:MongooseModel<ServiceProvider>,
        @Inject(AuthService)private auth:AuthService,
        @Inject(User)private userModel:MongooseModel<User>,
    ){}
    async signup(user:ServiceProvider){
        user.role="PROVIDER";
        const u=await this.userModel.findOne({$or:[
            {phone:user.phone}
        ]});
        if(u){
            throw new Exceptions.Conflict("USER_ALREADY_EXIST");
        }
        const s=await this.sproviderModel.findOne({$or:[
            {email:user.email},
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
    async createAccount(user:ServiceProvider,file:PlatformMulterFile){
        user.password=await this.hashPassword(user.password);
        user.role="PROVIDER";
        const provider=await this.sproviderModel.create(user);
        if (file) {
            const originalExtension = path.extname(file.originalname)
            const uploadsDir = path.join( 'public', 'uploads', provider._id.toString());
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            console.log(uploadsDir);
            const targetPath = path.join(uploadsDir, `logo${originalExtension}`);
            fs.writeFileSync(targetPath, file.buffer);
            provider.logo = path.join('public','uploads', provider._id.toString(), `logo${originalExtension}`);
            await provider.save();
          }
        return  {user : await this.getUserInfo(provider),token:this.auth.generateToken(provider)};;
    }

    async getUserInfo(user:User){
        
        const userInfo=await this.sproviderModel.aggregate([
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
                    from: "services",
                    localField: "_id",
                    foreignField: "provider_id", 
                    as: "services",
                    pipeline:[
                        {
                            $lookup:{
                                from: "orders",
                                localField: "_id",
                                foreignField: "service_id", 
                                as: "orders",
                                pipeline:[
                                    {
                                        $lookup: {
                                          from: "users",
                                          localField: "customer_id", 
                                          foreignField: "_id", 
                                          as: "customer" ,
                                          pipeline:[
                                            {
                                                $set:{"password":0}
                                            }
                                          ]
                                        }
                                      },
                                ]
                            }
                        },
                        
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
    async  hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, await bcrypt.genSalt(10));
    }
    async createService(service:Service,id:string,file:PlatformMulterFile){
        const provider=await this.sproviderModel.findById(id);
        if(!provider){
            throw new BadRequest("Provider not found");
        }
        service.provider_id=provider;
        const srvc=await this.serviceService.createService(service);
        if (file) {
            const originalExtension = path.extname(file.originalname)
            const uploadsDir = path.join( 'public', 'uploads', id, 'services',srvc._id.toString());
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            const targetPath = path.join(uploadsDir, 'serviceLogo'+originalExtension);
            fs.writeFileSync(targetPath, file.buffer);
            srvc.logo = path.join('public','uploads', id, 'services',srvc._id.toString(), 'serviceLogo'+originalExtension);
          }
        await srvc.save();
        return srvc;
    }
}
