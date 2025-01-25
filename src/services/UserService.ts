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
import { CUser } from "../interfaces/CUser";
import { pipeline } from "stream";
import { PlatformMulterFile } from "@tsed/common";
import * as fs from 'fs';
import * as path from 'path';
import { NotificationService } from "./NotificationService";
import { MailServerService } from "./MailServerService";
import { AdminService } from "./AdminService";
import { Category } from "../models/CategoryModel";
import { Favorite } from "../models/FavoriteModel";
import { SmsService } from "./SmsService";
import { MoyasarService } from "./MoyasarService";
@Injectable()
export class UserService {
    constructor(
        @Inject(User)private userModel:MongooseModel<User>,
        @Inject(AuthService)private auth:AuthService,
        @Inject(ServiceProvider)private sproviderModel:MongooseModel<ServiceProvider>,
        @Inject(SProviderService)private sproviderService:SProviderService,
        @Inject(BookingService)private bookingService:BookingService,
        @Inject(Service)private serviceModel:MongooseModel<Service>,
        @Inject(CustomSocketService)private socket:CustomSocketService,
        @Inject(NotificationService)private notService:NotificationService,
        @Inject(MailServerService)private mailServer :MailServerService,
        @Inject(AdminService)private adminService:AdminService,
        @Inject(Category)private categoryModel:MongooseModel<Category>,
        @Inject(Favorite)private favoriteModel:MongooseModel<Favorite>,
        @Inject(SmsService)private sms:SmsService,
        @Inject(MoyasarService)private  moyasarService: MoyasarService
        ){}
        async addToFavorite(userId:string,serviceId:string){
          const user=await this.userModel.findById(userId);
          if(!user) throw new Exceptions.BadRequest("User is not found!");
          const service=await this.serviceModel.findById(serviceId);
          if(!service) throw new Exceptions.BadRequest("Service is not found");
          const favorite = await this.favoriteModel.findOneAndUpdate(
            { customer_id: user._id, service_id: service._id },
            {},
            { upsert: true, new: true } 
          );
          return this.favoriteModel.findById(favorite._id);
        }
        async deleteFromFavorite(userId:string,serviceId:string){
          const user=await this.userModel.findById(userId);
          if(!user) throw new Exceptions.BadRequest("User is not found!");
          const service=await this.serviceModel.findById(serviceId);
          if(!service) throw new Exceptions.BadRequest("Service is not found");
          return this.favoriteModel.findOneAndDelete({customer_id: user._id, service_id: service._id})
        }
        async createByEmail(user:CUser,file?:PlatformMulterFile){
          user.role="CUSTOMER";
          user.createdByEmail=true;
          let searchConditions = [];

      if (user.phone && user.phone.number) {
          searchConditions.push({ "phone.number": user.phone.number });
      }
      
      
      let u = await this.userModel.findOne({ $or: searchConditions }).lean();
        if(u){
            throw new Exceptions.Conflict("USER_ALREADY_EXIST");
        }
        user.password=await this.hashPassword(user.password);
        const created=await this.userModel.create(user);
        if (file) {
          const originalExtension = path.extname(file.originalname)
          const uploadsDir = path.join( 'public', 'uploads', user._id.toString());
          if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
          }
          console.log(uploadsDir);
          const targetPath = path.join(uploadsDir, `logo${originalExtension}`);
          fs.writeFileSync(targetPath, file.buffer);
          created.logo = path.join('public','uploads', user._id.toString(), `logo${originalExtension}`);
          await created.save();
        }
        this.socket.onNewCustomer(created);
        return {user : await this.getUserInfo(created),token:this.auth.generateToken(created)};
        }
        async getCategories(){
          return this.adminService.getCategories();
        }
        async updateMarriageCalc(id:string,data:Map<String,number>){
          const user=await this.userModel.findById(id);
          if(!user)throw new Exceptions.BadRequest("User Not Found");
          user.marriageCalc=data;
          await user.save()
          return user;
        }
        async updateMarriageDate(id:string,date:Date){
          const user=await this.userModel.findById(id);
          if(!user) throw new Exceptions.BadRequest("User Not Found");
          user.marriageDate=date;
          await user.save()
          return user;
        }
    async updateProfile(id:string,user:any,file?:PlatformMulterFile){
      const oldUser = await this.userModel.findById(id);
      if(!oldUser) throw new Exceptions.BadRequest("USER_NOT_FOUND");
      if (file) {
        console.log("file")
        const originalExtension = path.extname(file.originalname)
        const uploadsDir = path.join( 'public', 'uploads', oldUser._id.toString());
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
            console.log("file3")
        }
        const targetPath = path.join(uploadsDir, `logo${originalExtension}`);
        fs.writeFileSync(targetPath, file.buffer);
        console.log("file4")
        user.logo = path.join('public','uploads', oldUser._id.toString(), `logo${originalExtension}`);
      }
      oldUser.logo=user.logo;
      oldUser.username=user.username;
      oldUser.gender=user.gender;
      await oldUser.save();
      return oldUser;
    }
    async cancelOrder(orderId:string){
      const order=await this.bookingService.getFullOrder(orderId);
      if(!order) throw new Exceptions.BadRequest("Order Not Found");
      if(order.status=="IDLE"){
        const res=await this.moyasarService.refundPayment(order.paymentId??"",(order.service_id as Service).price*100);
        this.socket.sendEventToClient((((order.service_id as Service).provider_id as ServiceProvider).user as User)._id.toString(),{id:orderId},"Order Canceled");
        return await this.bookingService.update(orderId,{status:"CANCLED"});
      }
      else{
        throw new Exceptions.Unauthorized("Order Already In Progress");
      }
    }
    async bookService(order:Partial<Order>,serviceId:string,userId:string){
        const user=await this.userModel.findById(userId,{password:0})
        if(!user){
            throw new Exceptions.BadRequest("User Not Found");
        }
        const service=await this.serviceModel.findById(serviceId).populate({
          path:"provider_id",
          model:"ServiceProvider",
          populate:{
            path:"user",
            model:"User"
          }
        });
        if(!service){
            throw new Exceptions.BadRequest("Service Not Found");
        }

        order.customer_id=user;
        order.service_id=service;
        if(!order.paymentId) throw new Exceptions.Unauthorized("Payment Id is required for auto accept services");
          const payment=await this.moyasarService.getPaymentInfo(order.paymentId );
          if(payment?.status!=200 || payment.data.status!="paid"){
            throw new Exceptions.Unauthorized("Payment Has Not Been Captured")
          }
        if(service.autoAccept) {
          order.status="ACCEPTED";
        }
        const orderr= await this.bookingService.addOrder(order);
        const o =await this.bookingService.getOrdersId(orderr!._id);
        await this.notService.createNotification({type:"New Order",user_id:((service.provider_id as ServiceProvider).user as User)._id,message:`${user.username}  قام بطلب خدمتك ${service.title}`});
        this.socket.onNewOrder(o)
        this.socket.sendEventToClient(((service.provider_id as ServiceProvider).user as User)._id.toString(),o,"New Order");
        return orderr;
    }
    async getById(id:string){
        try{
            return await this.userModel.findById(id);
        } catch(e){

        }
    }
    
    async forgetPassword(phone:{country:string,number:string}) {
        const u=await this.userModel.findOne({phone:phone});
        if(!u){
            throw  new Exceptions.NotFound('USER_NOT_FOUND');
        }
        const x: string = (Math.random() * 899999 + 100000).toFixed(0);
        console.log(x);
        u.password=x;
        // TODO : send sms to verify
        await this.sms.sendVerification(u.phone,x);
        return this.auth.generateToken(u);
    }
    async signup(user:CUser){
        const u=await this.userModel.findOne({$or:[
            {phone:user.phone,role:user.role}
        ]});
        if(u){
            throw new Exceptions.Conflict("USER_ALREADY_EXIST");
        }
        const x: string = (Math.random() * 8999 + 1000).toFixed(0);
        console.log(x);
        user.password=x;
        console.log(user);
        await this.mailServer.sendAuthEmail(user.email,"Confirm your email for Rafeed",x);
        // TODO : send sms to verify
        await this.sms.sendVerification(user.phone,x);
        return this.auth.generateToken(user);
    }
    async verifyCode(uid:string){
        const user=await this.userModel.findById(uid);
        if(!user){
            throw  new Exceptions.BadRequest("USER_NOT_FOUND");
        }
        return this.auth.generateToken(user);
    }
    async updatePassword(uid:string,pass:string){
        const  user=await this.userModel.findById(uid);
        if(!user){
            throw new Exceptions.BadRequest("USER_NOT_FOUND");
        }
        user.password=await this.hashPassword(pass);
        await user.save();
        user.password=pass;
        return await this.signin(user);

    }
    async signin(user:Partial<CUser>){
      let searchConditions = [];
      if(!user.role){
        user.role="ADMIN"
      }
      if (user.phone && user.phone.number) {
          searchConditions.push({ "phone.number": user.phone.number ,role:user.role});
      }
      
      
      if (user.email) {
        searchConditions.push({ email: user.email,role:user.role });
    }
    if (user.username) {
      searchConditions.push({ username: user.username,role:user.role });
  }
      
      let u = await this.userModel.findOne({ $or: searchConditions }).lean();
      if(!u){
          const p=await this.sproviderModel.findOne({email:user.email,role:user.role})
          if(!p){
            throw new Exceptions.Unauthorized("User not found or incorrect password.1");
          }
          u=await this.userModel.findById(p.user);
          if(!u){
            throw new Exceptions.Unauthorized("User not found or incorrect password.2");
          }
        }
        if(!(await bcrypt.compare(user.password!,u.password))){
            throw new Exceptions.Unauthorized("User not found or incorrect password.3");
        }
        if(u.role=="CUSTOMER"){
          // return (await this.sproviderService.getUserInfo(u) as Map<string,any>).set("token",this.auth.generateToken(u));
          const userData=await this.getUserInfo(u)
          return {user : userData["user"],ads:userData['ads'],settings:userData['settings'],services:userData["categories"],ratings:userData["ratings"],providers:userData["providers"],others:userData["others"], token:this.auth.generateToken(u)};
        }
        if(u.role=="ADMIN"){
          const userData=await this.adminService.getAdminData(u);
          return {userData:userData,token:this.auth.generateToken(u)};
        }
        
        return {user : await this.sproviderService.getUserInfo(u),token:this.auth.generateToken(u)};
        
    }
    async loginByAuth(id:string){
      let u = await this.userModel.findById(id).lean();
      if(!u) throw new Exceptions.BadRequest('Invalid token');
      if(u.role=="CUSTOMER"){
        // return (await this.sproviderService.getUserInfo(u) as Map<string,any>).set("token",this.auth.generateToken(u));
        const userData=await this.getUserInfo(u)
        return {user : userData["user"],ads:userData["ads"],settings:userData["settings"],services:userData["categories"],ratings:userData["ratings"],providers:userData["providers"],others:userData["others"], token:this.auth.generateToken(u)};
      }
      if(u.role=="ADMIN"){
        const userData=await this.adminService.getAdminData(u);
        return {userData:userData,token:this.auth.generateToken(u)};
      }
      
      return {user : await this.sproviderService.getUserInfo(u),token:this.auth.generateToken(u)};

    }
    async getUserInfo(user:User){
      let categories = await this.categoryModel.aggregate([
        {
            $project:{
              _id:1,
              name:1
            }
        }
    ]);

    
        const userInfo=await this.userModel.aggregate([
          
            {
                $match: {
                    phone: user.phone,
                    
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
                from:"gnotifications",
                as:"gnotifications",
                pipeline:[
                  {$match:{
                    $expr:{
                      $not:{$eq:["$type","PROVIDER"]}
                    }
                  }}
                ]
              }
            },
            {
              $lookup:{
                from:"favorites",
                as:"favorites",
                let:{uid:"$_id"},
                pipeline:[
                  {
                    $match:{
                      $expr:{
                        $eq:["$$uid","$customer_id"]
                      }
                    }
                  },
                  {
                    $lookup:{
                      from:"services",
                      as:"service",
                      let:{sid:"$service_id"} ,
                      pipeline:[
                        {
                          $match:{
                            $expr:{$and: [
                              { $eq: ["$$sid", "$_id"] },
                              { $eq: ["$status", "ACTIVE"] }
                            ]}
                          }
                        },
                        {
                          $lookup:{
                              from:"serviceproviders",
                              let:{provider_id: "$provider_id"},
                              as:"provider",
                              pipeline:[
                                  {
                                      $match: {
                                        $expr: {
                                          $eq: ["$$provider_id", "$_id"] 
                                        }
                                      }
                                    },
                                    {
                                      $lookup: {
                                          from: "categories",
                                          let: { id: "$_id" },
                                          as: "categoryDetails",
                                          pipeline: [
                                            {
                                              $match:{
                                                $expr:{
                                                  $eq:["$_id","$$id"]
                                                }
                                              }
                                            },
                                            {
                                              $limit:1
                                            }
                                          ]
                                      }
                                  },
                                  {
                                    $addFields: {
                                        category: {
                                            $arrayElemAt: ["$categoryDetails.name", 0]
                                        }
                                    }
                                },
                                {
                                    $project: {
                                        categoryDetails: 0  
                                    }
                                },
                                  {
                                      $set:{"password":0}
                                  },
                                  {
                                    $lookup:{
                                      from:"galleries",
                                      let:{provider:"$_id"}, 
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
                                    $lookup:{
                                      from:"addresses",
                                      let:{id:"$_id"},
                                      as:"addresses",
                                      pipeline:[
                                        {
                                          $match:{
                                            $expr:{
                                              $eq:["$$id","$provider"]
                                            }
                                          }
                                        }
                                      ]
                                    }
                                  },
                                  
                                  {
                                    $lookup:{
                                      from:'users',
                                      let:{user:'$user'},
                                      as:'user',
                                      pipeline:[
                                        {
                                          $match:{
                                            $expr:{
                                              $eq:["$$user","$_id"]
                                            }
                                          }
                                        },
                                        
                                      ]
                                    }
                                  },
                                  {
                                    $addFields: {
                                        user: { $arrayElemAt: ["$user", 0] }
                                    }
                                },
                                {
                                    $replaceRoot: {
                                        newRoot: { $mergeObjects: ["$$ROOT", "$user"] }
                                    }
                                },
                                {
                                  $project:{
                                    user:0,
                                    password:0
                                  }
                                }
                              ]
                          }
                      },
                      {
                          $addFields: {
                              provider: { $arrayElemAt: ["$provider", 0] }
                          }
                        }
                      ]
                    }
                  },
                  {
                    $addFields:{
                      service:{$arrayElemAt:["$service",0]},
                    }
                  }
                ]
              }
            },
            {
              $lookup:{
                from:"ratings",
                as:"ratings",
                let:{uid:"$_id"},
                pipeline:[
                  {
                    $match:{
                      $expr:{
                        $eq:["$$uid","$customer_id"]
                      }
                    }
                  },
                  {
                    $lookup:{
                      from:"services",
                      as:"service",
                      let:{sid:"$service_id"},
                      pipeline:[
                        {
                          $match:{
                            $expr:{
                              $and: [
                                { $eq: [ "$_id","$$sid"] },
                                { $eq: ["$status", "ACTIVE"] }
                              ]
                            }
                          }
                        },
                        {
                          $limit:1
                        },
                        {
                          $lookup: {
                              from: "categories",
                              let: { id: "$category" },
                              as: "categoryDetails",
                              pipeline: [
                                {
                                  $match:{
                                    $expr:{
                                      $eq:["$_id","$$id"]
                                    }
                                  }
                                },
                                {
                                  $limit:1
                                }
                              ]
                          }
                      },
                      ]
                    }
                    
                  },
                  {
                    $addFields: {
                        category: {
                            $arrayElemAt: ["$categoryDetails.name", 0]
                        }
                    }
                },
                {
                    $project: {
                        categoryDetails: 0  
                    }
                },
                  {
                    $addFields: {
                        user: { $arrayElemAt: ["$service", 0] }
                    }
                },
                ]
              }
            },
            {
                $lookup: {
                    from: "orders",
                    let: { customer_id: "$_id" },
                    as: "orders",
                    pipeline:[
                        {
                            $match: {
                              $expr: {
                                $eq: ["$$customer_id", "$customer_id"] 
                              }
                            }
                          },
                        {
                            $lookup:{
                                from:"services",
                                let: { service_id: "$service_id" },
                                as:"service",
                                pipeline:[
                                    {
                                        $match: {
                                          $expr: {
                                            $eq: ["$$service_id", "$_id"] 
                                          }
                                        }
                                      },
                                      {
                                        $limit:1
                                      },
                                      {
                                        $lookup: {
                                            from: "categories",
                                            let: { id: "$category" },
                                            as: "categoryDetails",
                                            pipeline: [
                                              {
                                                $match:{
                                                  $expr:{
                                                    $eq:["$_id","$$id"]
                                                  }
                                                }
                                              },
                                              {
                                                $limit:1
                                              }
                                            ]
                                        },
                                        
                                    },
                                    {
                                      $addFields: {
                                          category: {
                                              $arrayElemAt: ["$categoryDetails.name", 0]
                                          }
                                      }
                                  },
                                  {
                                      $project: {
                                          categoryDetails: 0  
                                      }
                                  },
                                      {
                                        $lookup:{
                                          from:"ratings",
                                          as:"ratings",
                                          let:{sid:"$_id" },
                                          pipeline:[
                                            {$match:{
                                              $expr:{
                                                $eq:["$service_id","$$sid"],
                                              }
                                            }
                                            },
                                            {
                                              $lookup:{
                                                from:"users",
                                                as:"user",
                                                let:{uid:"$customer_id"} ,
                                                pipeline:[
                                                  {$match:{
                                                    $expr:{
                                                      $eq:["$_id","$$uid"],
                                                    }
                                                  }
                                                  },
                                                  {$limit:1}
                                                ]
                                              }
                                            },
                                            {
                                              $addFields: {
                                                  user: { $arrayElemAt: ["$user", 0] }
                                              }
                                          },
                                          ]
                                        }
                                      },
                                    {
                                        $lookup:{
                                            from:"serviceproviders",
                                            let:{provider_id: "$provider_id"},
                                            as:"provider",
                                            pipeline:[
                                                {
                                                    $match: {
                                                      $expr: {
                                                        $eq: ["$$provider_id", "$_id"] 
                                                      }
                                                    }
                                                  },
                                                {
                                                    $set:{"password":0}
                                                },
                                                {
                                                  $lookup: {
                                                      from: "categories",
                                                      let: { id: "$category" },
                                                      as: "categoryDetails",
                                                      pipeline: [
                                                        {
                                                          $match:{
                                                            $expr:{
                                                              $eq:["$_id","$$id"]
                                                            }
                                                          }
                                                        },
                                                        {
                                                          $limit:1
                                                        },
                                                      ]
                                                  }
                                              },
                                              {
                                                $addFields: {
                                                    category: {
                                                        $arrayElemAt: ["$categoryDetails.name", 0]
                                                    }
                                                }
                                            },
                                            {
                                                $project: {
                                                    categoryDetails: 0  
                                                }
                                            },
                                                {
                                                  $lookup:{
                                                    from:"galleries",
                                                    let:{provider:"$_id"}, 
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
                                                  $lookup:{
                                                    from:"addresses",
                                                    let:{id:"$_id"},
                                                    as:"addresses",
                                                    pipeline:[
                                                      {
                                                        $match:{
                                                          $expr:{
                                                            $eq:["$$id","$provider"]
                                                          }
                                                        }
                                                      }
                                                    ]
                                                  }
                                                },
                                                
                                                {
                                                  $lookup:{
                                                    from:'users',
                                                    let:{user:'$user'},
                                                    as:'user',
                                                    pipeline:[
                                                      {
                                                        $match:{
                                                          $expr:{
                                                            $eq:["$$user","$_id"]
                                                          }
                                                        }
                                                      },
                                                      
                                                    ]
                                                  }
                                                },
                                                {
                                                  $addFields: {
                                                      user: { $arrayElemAt: ["$user", 0] }
                                                  }
                                              },
                                              {
                                                  $replaceRoot: {
                                                      newRoot: { $mergeObjects: ["$$ROOT", "$user"] }
                                                  }
                                              },
                                              {
                                                $project:{
                                                  user:0,
                                                  password:0
                                                }
                                              }
                                            ]
                                        }
                                    },
                                    {
                                        $addFields: {
                                            provider: { $arrayElemAt: ["$provider", 0] }
                                        }
                                      }
                                ],
                                
                            }
                        },
                        {
                            $addFields: {
                              service: { $arrayElemAt: ["$service", 0] }
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
              $lookup: {
                from: "categories",
                pipeline: [
                  {
                    $lookup: {
                      from: "services",
                      let:  { catId: "$_id" ,name:"$name"},  
                      pipeline: [
                        {
                          $match: {
                            $expr: {
                              $and:[
                                { $eq: ["$category", "$$catId"] },
                              { $eq: ["$status", "ACTIVE"] }
                            ]
      
                            }
                          }
                        },
                        {
                          $addFields: {
                              category: "$$name"
                          }
                      },
                        {
                          $lookup:{
                            from:"ratings",
                            as:"ratings",
                            let:{sid:"$_id" },
                            pipeline:[
                              {$match:{
                                $expr:{
                                  $eq:["$service_id","$$sid"],
                                }
                              }
                              },
                              {
                                $lookup:{
                                  from:"users",
                                  as:"user",
                                  let:{uid:"$customer_id"} ,
                                  pipeline:[
                                    {$match:{
                                      $expr:{
                                        $eq:["$_id","$$uid"],
                                      }
                                    }
                                    },
                                    {$limit:1}
                                  ]
                                }
                              },
                              {
                                $addFields: {
                                    user: { $arrayElemAt: ["$user", 0] }
                                }
                            },
                            ]
                          }
                        },
                        {
                          $lookup: {
                            from: "serviceproviders",
                            let: { provider_id: "$provider_id" ,catName:"$name"},
                            pipeline: [
                              {
                                $match: {
                                  $expr: {
                                    $eq: ["$$provider_id", "$_id"]
                                  }
                                }
                              },
                              {
                                $addFields: {
                                    category: "$$catName"
                                }
                            },
                              { $set: { "password": 0 } },
                              {
                                $lookup: {
                                  from: "users",
                                  let: { user: "$user" },
                                  pipeline: [
                                    {
                                      $match: {
                                        $expr: {
                                          $eq: ["$$user", "$_id"]
                                        }
                                      }
                                    }
                                  ],
                                  as: "user"
                                }
                              },
                              {
                                $addFields: {
                                  user: { $arrayElemAt: ["$user", 0] }
                                }
                              },
                              {
                                $replaceRoot: {
                                  newRoot: { $mergeObjects: ["$$ROOT", "$user"] }
                                }
                              },
                              {
                                $project: {
                                  user: 0,
                                  password: 0
                                }
                              }
                            ],
                            as: "provider"
                          }
                        },
                        {
                          $addFields: {
                            provider: { $arrayElemAt: ["$provider", 0] }
                          }
                        }
                      ],
                      as: "services"
                    }
                  },
                ],
                as: "categories"
              }
            },
            
          
            
            
            {
              $lookup: {
                from: "services",
                let: { catIds: categories.map(cat => cat._id) }  ,
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $not:  { $in: ["$category", "$$catIds"] }},
                          { $eq: ["$status", "ACTIVE"] }
                        ]
                        
                      }
                    }
                  },
                  {
                    $addFields: {
                        category: "others"
                    }
                },
                  {
                    $lookup:{
                      from:"ratings",
                      as:"ratings",
                      let:{sid:"$_id" },
                      pipeline:[
                        {$match:{
                          $expr:{
                            $eq:["$service_id","$$sid"],
                          }
                        }
                        },
                        
                        {
                          $lookup:{
                            from:"users",
                            as:"user",
                            let:{uid:"$customer_id"} ,
                            pipeline:[
                              {$match:{
                                $expr:{
                                  $eq:["$_id","$$uid"],
                                }
                              }
                              },
                              {$limit:1}
                            ]
                          }
                        },
                        {
                          $addFields: {
                              user: { $arrayElemAt: ["$user", 0] }
                          }
                      },
                      ]
                    }
                  },
                  {
                      $lookup: {
                        from: "serviceproviders",
                        let: { provider_id: "$provider_id",catName:"$name" },
                        pipeline: [
                          {
                            $match: {
                              $expr: {
                                $eq: ["$$provider_id", "$_id"]
                              }
                            }
                          },
                          { $set: { "password": 0 } },
                          {
                            $addFields:{pid: "$_id"}
                          },
                          {
                            $addFields: {
                                category: "$$catName"
                            }
                        },
                          {
                            $project:{
                              _id:0
                            }
                          },
                          {
                            $lookup: {
                              from: "users",
                              let: { user: "$user" },
                              pipeline: [
                                {
                                  $match: {
                                    $expr: {
                                      $eq: ["$$user", "$_id"]
                                    }
                                  }
                                }
                              ],
                              as: "user"
                            }
                          },
                          {
                            $addFields: {
                              user: { $arrayElemAt: ["$user", 0] }
                            }
                          },
                          {
                            $replaceRoot: {
                              newRoot: { $mergeObjects: ["$$ROOT", "$user"] }
                            }
                          },
                          {
                            $project: {
                              user: 0,
                              password: 0
                            }
                          }
                        ],
                        as: "provider"
                      }
                    },
                    {
                      $addFields: {
                        provider: { $arrayElemAt: ["$provider", 0] }
                      }
                    }
                ],
                as: "otherS"
              }
            },
            {
              $lookup:{
                  from:"serviceproviders",
                  
                  as:"providers",
                  pipeline:[
                    {
                      $lookup: {
                          from: "categories",
                          let: { id: "$category" },
                          as: "categoryDetails",
                          pipeline: [
                            {
                              $match:{
                                $expr:{
                                  $eq:["$_id","$$id"]
                                }
                              }
                            },
                            {
                              $limit:1
                            }
                          ]
                      }
                  },
                  {
                      $addFields: {
                          category: {
                              $arrayElemAt: ["$categoryDetails.name", 0]
                          }
                      }
                  },
                  {
                      $project: {
                          categoryDetails: 0  
                      }
                  },
                      {
                          $set:{"password":0}
                      },
                      {
                        $lookup:{
                          from:"galleries",
                          let:{provider:"$_id"}, 
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
                        $lookup:{
                          from:"services",
                          as:"services",
                          let:{pid: "$_id"},
                          pipeline:[
                            {$match:{
                              $expr:{
                                $and: [
                                  {$eq:["$provider_id","$$pid"]},
                                  { $eq: ["$status", "ACTIVE"] }
                                ]
                              }
                            }
                            },
                            {
                              $lookup: {
                                  from: "categories",
                                  let: { id: "$category" },
                                  as: "categoryDetails",
                                  pipeline: [
                                    {
                                      $match:{
                                        $expr:{
                                          $eq:["$_id","$$id"]
                                        }
                                      }
                                    },
                                    {
                                      $limit:1
                                    }
                                  ]
                              }
                          },
                          {
                              $addFields: {
                                  category: {
                                      $arrayElemAt: ["$categoryDetails.name", 0]
                                  }
                              }
                          },
                          {
                              $project: {
                                  categoryDetails: 0  
                              }
                          },
                            {
                              $lookup:{
                                from:"ratings",
                                as:"ratings",
                                let:{sid:"$_id" },
                                pipeline:[
                                  {$match:{
                                    $expr:{
                                      $eq:["$service_id","$$sid"],
                                    }
                                  }
                                  },
                                  {
                                    $lookup:{
                                      from:"users",
                                      as:"user",
                                      let:{uid:"$customer_id"} ,
                                      pipeline:[
                                        {$match:{
                                          $expr:{
                                            $eq:["$_id","$$uid"],
                                          }
                                        }
                                        },
                                        {$limit:1}
                                      ]
                                    }
                                  },
                                  {
                                    $addFields: {
                                        user: { $arrayElemAt: ["$user", 0] }
                                    }
                                },
                                ]
                              }
                            }
                          ]
                        }
                      },
                      {
                        $lookup:{
                          from:"addresses",
                          let:{id:"$_id"},
                          as:"addresses",
                          pipeline:[
                            {
                              $match:{
                                $expr:{
                                  $eq:["$$id","$provider"]
                                }
                              }
                            }
                          ]
                        }
                      },
                      
                      {
                        $lookup:{
                          from:'users',
                          let:{user:'$user'},
                          as:'user',
                          pipeline:[
                            {
                              $match:{
                                $expr:{
                                  $eq:["$$user","$_id"]
                                }
                              }
                            },
                            
                          ]
                        }
                      },
                      {
                        $addFields: {
                            user: { $arrayElemAt: ["$user", 0] }
                        }
                    },
                    {
                      $project:{
                        _id:0
                      }
                    },
                    {
                        $replaceRoot: {
                            newRoot: { $mergeObjects: ["$$ROOT", "$user"] }
                        }
                    },
                    {
                      $project:{
                        user:0,
                        password:0
                      }
                    }
                  ]
              }
          },
          {
            $lookup:{
              from:"ads",
              as:"ads",
              pipeline:[
                {
                  $lookup:{
                    from:"categories",
                    let:{cid: "$category" },
                    as:"category",
                    pipeline:[
                      {
                        $match:{
                          $expr:{
                            $eq:[ "$_id","$$cid" ] ,
                          }
                        }
                      },
                      {
                        $limit:1
                      },
                      {
                        $lookup:{
                            from:"serviceproviders",
                            let:{cid:"$_id"},
                            as:"providers",
                            pipeline:[
                              {
                                $match:{
                                  $expr:{
                                    $eq:["$category","$$cid"]
      
                                  }
                                }
                              },
                              {
                                $lookup: {
                                    from: "categories",
                                    let: { id: "$category" },
                                    as: "categoryDetails",
                                    pipeline: [
                                      {
                                        $match:{
                                          $expr:{
                                            $eq:["$_id","$$id"]
                                          }
                                        }
                                      },
                                      {
                                        $limit:1
                                      }
                                    ]
                                }
                            },
                            {
                                $addFields: {
                                    category: {
                                        $arrayElemAt: ["$categoryDetails.name", 0]
                                    }
                                }
                            },
                            {
                                $project: {
                                    categoryDetails: 0  
                                }
                            },
                                {
                                    $set:{"password":0}
                                },
                                {
                                  $lookup:{
                                    from:"galleries",
                                    let:{provider:"$_id"}, 
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
                                  $lookup:{
                                    from:"services",
                                    as:"services",
                                    let:{pid: "$_id"},
                                    pipeline:[
                                      {$match:{
                                        $expr:{
                                          $and: [
                                            {$eq:["$provider_id","$$pid"]},
                                            { $eq: ["$status", "ACTIVE"] }
                                          ]
                                        }
                                      }
                                      },
                                      {
                                        $lookup: {
                                            from: "categories",
                                            let: { id: "$category" },
                                            as: "categoryDetails",
                                            pipeline: [
                                              {
                                                $match:{
                                                  $expr:{
                                                    $eq:["$_id","$$id"]
                                                  }
                                                }
                                              },
                                              {
                                                $limit:1
                                              }
                                            ]
                                        }
                                    },
                                    {
                                        $addFields: {
                                            category: {
                                                $arrayElemAt: ["$categoryDetails.name", 0]
                                            }
                                        }
                                    },
                                    {
                                        $project: {
                                            categoryDetails: 0  
                                        }
                                    },
                                      {
                                        $lookup:{
                                          from:"ratings",
                                          as:"ratings",
                                          let:{sid:"$_id" },
                                          pipeline:[
                                            {$match:{
                                              $expr:{
                                                $eq:["$service_id","$$sid"],
                                              }
                                            }
                                            },
                                            {
                                              $lookup:{
                                                from:"users",
                                                as:"user",
                                                let:{uid:"$customer_id"} ,
                                                pipeline:[
                                                  {$match:{
                                                    $expr:{
                                                      $eq:["$_id","$$uid"],
                                                    }
                                                  }
                                                  },
                                                  {$limit:1}
                                                ]
                                              }
                                            },
                                            {
                                              $addFields: {
                                                  user: { $arrayElemAt: ["$user", 0] }
                                              }
                                          },
                                          ]
                                        }
                                      }
                                    ]
                                  }
                                },
                                {
                                  $lookup:{
                                    from:"addresses",
                                    let:{id:"$_id"},
                                    as:"addresses",
                                    pipeline:[
                                      {
                                        $match:{
                                          $expr:{
                                            $eq:["$$id","$provider"]
                                          }
                                        }
                                      }
                                    ]
                                  }
                                },
                                
                                {
                                  $lookup:{
                                    from:'users',
                                    let:{user:'$user'},
                                    as:'user',
                                    pipeline:[
                                      {
                                        $match:{
                                          $expr:{
                                            $eq:["$$user","$_id"]
                                          }
                                        }
                                      },
                                      
                                    ]
                                  }
                                },
                                {
                                  $addFields: {
                                      user: { $arrayElemAt: ["$user", 0] }
                                  }
                              },
                              {
                                $project:{
                                  _id:0
                                }
                              },
                              {
                                  $replaceRoot: {
                                      newRoot: { $mergeObjects: ["$$ROOT", "$user"] }
                                  }
                              },
                              {
                                $project:{
                                  user:0,
                                  password:0
                                }
                              }
                            ]
                        }
                    },
                      {$lookup:{
                        from:"services",
                        as:"services",
                        let:{cid:"$_id",name:"$name"},
                        pipeline:[
                          {
                            $match:{
                              $expr:{
                                $eq:["$category","$$cid"]
                              }
                            }
                          },
                          {
                            $lookup:{
                                from:"serviceproviders",
                                let:{provider_id: "$provider_id"},
                                as:"provider",
                                pipeline:[
                                    {
                                        $match: {
                                          $expr: {
                                            $eq: ["$$provider_id", "$_id"] 
                                          }
                                        }
                                      },
                                      
                                    {
                                      $addFields: {
                                          category: "$name"
                                      }
                                  },
                                  
                                    {
                                        $set:{"password":0}
                                    },
                                    {
                                      $lookup:{
                                        from:"galleries",
                                        let:{provider:"$_id"}, 
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
                                      $lookup:{
                                        from:"addresses",
                                        let:{id:"$_id"},
                                        as:"addresses",
                                        pipeline:[
                                          {
                                            $match:{
                                              $expr:{
                                                $eq:["$$id","$provider"]
                                              }
                                            }
                                          }
                                        ]
                                      }
                                    },
                                    
                                    {
                                      $lookup:{
                                        from:'users',
                                        let:{user:'$user'},
                                        as:'user',
                                        pipeline:[
                                          {
                                            $match:{
                                              $expr:{
                                                $eq:["$$user","$_id"]
                                              }
                                            }
                                          },
                                          
                                        ]
                                      }
                                    },
                                    {
                                      $addFields: {
                                          user: { $arrayElemAt: ["$user", 0] }
                                      }
                                  },
                                  {
                                      $replaceRoot: {
                                          newRoot: { $mergeObjects: ["$$ROOT", "$user"] }
                                      }
                                  },
                                  {
                                    $project:{
                                      user:0,
                                      password:0
                                    }
                                  }
                                ]
                            }
                        },
                        {
                            $addFields: {
                                provider: { $arrayElemAt: ["$provider", 0] }
                            }
                          }
                        ]
                      }}
                    ]
                  }
                },
                {
                  $addFields:{
                    category:{$arrayElemAt:["$category",0]}
                  }
                },
              ]
            }
          },
          {
            $lookup:{
              from:"settingsmodels",
              as:"settings",
              pipeline:[
                {
                  $limit:1
                }
              ]
            }
          },
          {
            $addFields:{
              settings:{$arrayElemAt:["$settings",0]}
            }
          },
            {
              $group: {
                  _id: "$_id",
                  username: { $first: "$username" },
                  phone: { $first: "$phone" },
                  password: { $first: "$password" },
                  gender: { $first: "$gender" },
                  marriageDate:{$first:"$marriageDate"},
                  marriageCalc:{$first:"$marriageCalc"},
                  role: { $first: "$role" },
                  logo: { $first: "$logo" },
                  notifications: { $first: "$notifications" },
                  gnotifications:{$first:"$gnotifications"},
                  orders: { $first: "$orders" },
                  ratings:{$first:"$ratings"},
                  chats: { $first: "$chats" },
                  favorites:{$first:"$favorites"},
                  categories: { $first:"$categories"},
                  ads:{$first:"$ads"},
                  providers:{$first: "$providers"},
                  others:{$first:"$otherS"},
                  settings:{$first:"$settings"}
              }
          },              
                               {
                        $project: {
                            user: {
                                _id: "$_id",
                                username: "$username",
                                phone: "$phone",
                                password: "$password",
                                gender: "$gender",
                                role: "$role",
                                logo: "$logo",
                                marriageDate:"$marriageDate",
                                marriageCalc:"$marriageCalc",
                                notifications: "$notifications",
                                gnotifications:"$gnotifications",
                                orders: "$orders",
                                chats: "$chats" ,
                                favorites:"$favorites"
                            },
                            settings:"$settings",
                            ads:"$ads",
                            ratings:"$ratings",
                            categories: "$categories",
                            others:"$others",
                            providers:"$providers"

                        }
                    },
            {
                $limit: 1 
            }
        ]).exec();
        return  userInfo[0];
    }
    async create(user:User){
        user.role="CUSTOMER";
        let searchConditions = [];

      if (user.phone && user.phone.number) {
          searchConditions.push({ "phone.number": user.phone.number,role:user.role });
      }
      
      
      if (user.email) {
          searchConditions.push({ email: user.email,role:user.role });
      }
      
        const u=await this.userModel.findOne({ $or: searchConditions });
        if(u){
            throw new Exceptions.Conflict("USER_ALREADY_EXIST");
        }
        user.password=await this.hashPassword(user.password);
        const created=await this.userModel.create(user);
        const userData=await this.getUserInfo(created);
        this.socket.onNewCustomer(created);
        return {user : userData["user"],services:userData["categories"],providers:userData["providers"],others:userData["others"], token:this.auth.generateToken(created)};
    }

    async  hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, await bcrypt.genSalt(10));
    }
}
