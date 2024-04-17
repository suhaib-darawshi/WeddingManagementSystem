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
import { CUser } from "../interfaces/CUser";
import { MailServerService } from "./MailServerService";
import { Gallery } from "../models/GalleryModel";
import { Address } from "../models/AddressModel";
import { pipeline } from "stream";

@Injectable()
export class SProviderService {
    constructor(
        @Inject(ServiceService)private serviceService:ServiceService,
        @Inject(ServiceProvider) private sproviderModel:MongooseModel<ServiceProvider>,
        @Inject(AuthService)private auth:AuthService,
        @Inject(User)private userModel:MongooseModel<User>,
        @Inject(MailServerService)private mailServer :MailServerService,
        @Inject(Gallery)private galleryModel:MongooseModel<Gallery>,
        @Inject(Service)private serviceModel:MongooseModel<Service>,
        @Inject(Address)private addressModel:MongooseModel<Address>
    ){}
    async addAddres(id:string,address:Partial<Address>){
      const provider = await this.sproviderModel.findOne({user:id});
      if(!provider) throw new Exceptions.BadRequest("Provider not found");
      address.provider=provider;
      return await this.addressModel.create(address);
    }
    async updateAccount(id:string,updateData:Partial<CUser>,file?:PlatformMulterFile) {
      const user = await this.userModel.findById(id);
      if(!user) throw new  Exceptions.NotFound("User not found");
      if (file) {
        if (fs.existsSync(user.logo)) {
          fs.unlinkSync(user.logo); 
      }
          const originalExtension = path.extname(file.originalname)
          const uploadsDir = path.join( 'public', 'uploads', user._id.toString());
          if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
          }
          const targetPath = path.join(uploadsDir, 'logo'+originalExtension);
          fs.writeFileSync(targetPath, file.buffer);
          user.logo = path.join('public','uploads', user._id.toString(), 'logo'+originalExtension);
        }
        updateData.logo=user.logo;
        await this.sproviderModel.updateOne({user:user._id},updateData);
        return await this.userModel.findByIdAndUpdate(id,updateData);
    }
    async deleteService(id:string){
      return await this.serviceModel.findByIdAndDelete(id);
    }
    
    async updateServiceStatus(id:string,state:string){
      const service=await this.serviceModel.findById(id); 
      if(!service) throw new BadRequest("Service Not Found");
      return await this.serviceModel.findByIdAndUpdate(id,{status:state});  
    }
    async updateService(id:string,service:Partial<Service>,file:PlatformMulterFile|undefined){
      const srvc=await this.serviceModel.findById(id).populate({path:"provider_id",model:"ServiceProvicer"});
      if(!srvc) throw new Exceptions.NotFound('Service not found');
      if (file) {
        if (fs.existsSync(srvc.logo)) {
          fs.unlinkSync(srvc.logo); // Delete the old file
      }
          const originalExtension = path.extname(file.originalname)
          const uploadsDir = path.join( 'public', 'uploads', (srvc.provider_id as ServiceProvider)._id.toString(), 'services',srvc._id.toString());
          if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
          }
          const targetPath = path.join(uploadsDir, 'serviceLogo'+originalExtension);
          fs.writeFileSync(targetPath, file.buffer);
          srvc.logo = path.join('public','uploads', (srvc.provider_id as ServiceProvider)._id.toString(), 'services',srvc._id.toString(), 'serviceLogo'+originalExtension);
        }
      service.logo=srvc.logo;
      return await this.serviceModel.findByIdAndUpdate(id,service);
    }
    async updateProviderStatus(id: string, status: string){
      const provider=await this.sproviderModel.findOne({user:id});
      if (!provider)throw new Exceptions.NotFound('Not found Provider');
      provider.status=status;
      await provider.save();
      const  services = await this.serviceModel.find({provider_id:provider._id});
      for(const service of services){
        service.status=status;
        await service.save();
      }
      return provider;
    }
    async addWork(work:Partial<Gallery>,file:PlatformMulterFile|undefined){
      const provider=await this.sproviderModel.findOne({user:work.provider_id});
      if(!provider) throw new BadRequest("User Not Found");
      work.provider_id=provider;
      if (file) {
        const originalExtension = path.extname(file.originalname)
        const uploadsDir = path.join( 'public', 'uploads', (work.provider_id as ServiceProvider)._id.toString(),"works");
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        console.log(uploadsDir);
        const targetPath = path.join(uploadsDir, `${file.originalname}`);
        fs.writeFileSync(targetPath, file.buffer);
        work.url = path.join('public','uploads',  (work.provider_id as ServiceProvider)._id.toString(),"works", `${file.originalname}`);
        
      }
      return await this.galleryModel.create(work);
    }
    async getProvider(id:string){
      const doc= await this.userModel.aggregate(
        [
          {
            $match: {
                _id: id,
            }
        },
        {
          $lookup:{
            from:'serviceproviders',
            let :{ id:"$_id" },
            pipeline:[
              {$match: {
                $expr: {
                  $eq: ["$$id", "$user"] 
                }
              }},

            ],
            as: "info",
          }
        },
        {
          $addFields: {
            info: { $arrayElemAt: ["$info", 0] }
          }
        },
        {
          $lookup: {
              from: "services",
              let:{provider:"$info._id"}, 
              as: "services",
              pipeline:[
                  {
                      $match:{
                          $expr:{
                              $eq:["$$provider",'$provider_id']
                          }
                      }
                  },
                  
                  
              ]
          }
      },
      {
        $replaceRoot: {
            newRoot: {
                $mergeObjects: ["$$ROOT", "$info"]
            }
        }
    },
    {
      $project: {
          info: 0  
      }
  },
      
      {
          $limit: 1 
      }
        
        ]
      ).exec();
      if(doc.length==0){
        throw new BadRequest( 'Invalid provider id');
      }
      return  doc[0];
    }
    async signup(user:CUser){
        user.role="PROVIDER";
        const u=await this.userModel.findOne({$or:[
            {phone:user.phone}
        ]});
        if(u){
            throw new Exceptions.Conflict("USER_ALREADY_EXIST");
        }
        const s=await this.sproviderModel.findOne({$or:[
            {email:user.email},
        ]});
        if(s){
            throw new Exceptions.Conflict("EMAIL_ALREADY_EXIST");
        }
        const x: string = (Math.random() * 8999 + 1000).toFixed(0);
        console.log(x);
        user.password=x;
        console.log(user);
        await this.mailServer.sendAuthEmail(user.email,"Confirm your email for Rafeed",x);
        // TODO : send sms to verify
        return this.auth.generateToken(user);
    }
    async createAccount(user:CUser,file:PlatformMulterFile){
        user.password=await this.hashPassword(user.password);
        user.role="PROVIDER";
        const userMod=await this.userModel.create(user);
        user.user=userMod;
        const provider=await this.sproviderModel.create(user);
        if (file) {
            const originalExtension = path.extname(file.originalname)
            const uploadsDir = path.join( 'public', 'uploads', user._id.toString());
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            console.log(uploadsDir);
            const targetPath = path.join(uploadsDir, `logo${originalExtension}`);
            fs.writeFileSync(targetPath, file.buffer);
            userMod.logo = path.join('public','uploads', user._id.toString(), `logo${originalExtension}`);
            await userMod.save();
          }
          return {user : await this.getUserInfo(userMod),token:this.auth.generateToken(userMod)};
    }

    async getUserInfo(user:User){
        
        const userInfo=await this.userModel.aggregate([
            {
                $match: {
                    _id: user._id,
                }
            },
            {
              $lookup:{
                from:'serviceproviders',
                let :{ id:"$_id" },
                pipeline:[
                  {$match: {
                    $expr: {
                      $eq: ["$$id", "$user"] 
                    }
                  },
                  
                },
                {
                  $addFields:{pid: "$_id"}
                },
                {
                  $project:{
                    _id:0
                  }
                }
                ],
                
                as: "info",
              }
            },
            {
              $addFields: {
                info: { $arrayElemAt: ["$info", 0] }
              }
            },
            {
                $lookup: {
                    from: "notifications",
                    let: { userId: "$_id" },
                    pipeline:[
                        {
                      $match: {
                        $expr: {
                          $eq: ["$$userId", "$user_id"] 
                        }
                      }
                    },
                        { $sort: { createdAt: -1 } }
                      ],
                    as: "notifications",
                }
            },
            {
              $lookup:{
                from:"galleries",
                let:{provider:"$info.pid"}, 
                as:"works",
                pipeline:[
                  {
                    $match:{
                      $expr:{
                        $eq:["$$provider","$provider_id"]
                      }
                    }
                  }
                ]
              }
            },
            {
                $lookup: {
                    from: "services",
                    let:{provider:"$info.pid"}, 
                    as: "services",
                    pipeline:[
                        {
                            $match:{
                                $expr:{
                                    $eq:["$$provider",'$provider_id']
                                }
                            }
                        },
                        {
                            $lookup:{
                                from: "orders",
                                let:{service:"$_id"},
                                as: "orders",
                                pipeline:[
                                    {
                                        $match:{
                                            $expr:{
                                                $eq:["$$service","$service_id"]
                                            }
                                        }
                                    },
                                    {
                                        
                                        $lookup: {
                                          from: "users",
                                          let:{customer:"$customer_id"},
                                          as: "customer" ,
                                          pipeline:[
                                            {
                                                $match:{
                                                    $expr:{
                                                        eq:["$$customer","$_id"]
                                                    }
                                                }
                                            },
                                            {
                                                $set:{"password":0}
                                            }
                                          ]
                                        }
                                      },
                                      {
                                        $addFields: {
                                          customer: { $arrayElemAt: ["$customer", 0] }
                                        }
                                      },
                                      {
                                        $project:{
                                          customer_id:0,
                                          service_id:0
                                        }
                                      }
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
                          let:{userss:"$users"},
                          pipeline:[{
                            $match: {
                                $expr: {
                                  $in: ["$_id", "$$userss"] 
                                }
                              }
                          }],
                          
                          as: "users"
                        }
                      },
                      
                      {
                        $lookup: {
                          from: "messages", 
                          let:{messagess:"$messages"},
                          as: "messages",
                          pipeline:[
                            {
                                $match: {
                                    $expr: {
                                      $in: ["$_id", "$$messagess"] 
                                    }
                                  }
                              },
                            { $sort: { createdAt: -1 } }
                          ]
                        },
                        
                      },
                  ],
                  as: "chats"
                }
            },
            {
              $replaceRoot: {
                  newRoot: {
                      $mergeObjects: ["$$ROOT", "$info"]
                  }
              }
          },
          {
            $project: {
                info: 0  
            }
        },
        {
          $lookup:{
            from:"categories",
            as:"categories",
            pipeline:[]
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
      const user=await this.userModel.findById(id);
      if(!user){
        throw new BadRequest("USER_NOT_FOUND");
      }
        const provider=await this.sproviderModel.findOne({user:user.id});
        if(!provider){
            throw new BadRequest("PPROVIDER_NOT_FOUND");
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
