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
        @Inject(Favorite)private favoriteModel:MongooseModel<Favorite>

        ){}
        async addToFavorite(userId:string,serviceId:string){
          const user=await this.userModel.findById(userId);
          if(!user) throw new Exceptions.BadRequest("User is not found!");
          const service=await this.serviceModel.findById(serviceId);
          if(!service) throw new Exceptions.BadRequest("Service is not found");
          return await this.favoriteModel.create({customer_id:user._id,service_id:service._id});
        }
        async createByEmail(user:CUser,file?:PlatformMulterFile){
          user.role="CUSTOMER";
          user.createdByEmail=true;
          let searchConditions = [];

      if (user.phone && user.phone.number) {
          searchConditions.push({ "phone.number": user.phone.number });
      }
      
      if (user.username) {
          searchConditions.push({ username: user.username });
      }
      
      if (user.email) {
          searchConditions.push({ email: user.email });
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
        return {user : await this.getUserInfo(created),token:this.auth.generateToken(created)};
        }
        async getCategories(){
          return this.adminService.getCategories();
        }
    async updateProfile(id:string,user:User,file:PlatformMulterFile|null){
      const oldUser = await this.getById(id);
      if(!oldUser) throw new Exceptions.BadRequest("USER_NOT_FOUND");
      if (file) {
        if (fs.existsSync(oldUser.logo)) {
          fs.unlinkSync(oldUser.logo); 
      }
        const originalExtension = path.extname(file.originalname)
        const uploadsDir = path.join( 'public', 'uploads', oldUser._id.toString());
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const targetPath = path.join(uploadsDir, `logo${originalExtension}`);
        fs.writeFileSync(targetPath, file.buffer);
        user.logo = path.join('public','uploads', oldUser._id.toString(), `logo${originalExtension}`);
      }
      oldUser.logo=user.logo;
      oldUser.username=user.username;
      oldUser.gender=user.gender;
      await oldUser.save();
      return oldUser;
    }
    async cancelOrder(orderId:string){
      const order=await this.bookingService.getById(orderId);
      if(!order) throw new Exceptions.BadRequest("Order Not Found");
      if(order.status=="IDLE"){
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
        if(service.autoAccept) {
          order.status="ACCEPTED";
        }
        const orderr= await this.bookingService.addOrder(order);
        await this.notService.createNotification({type:"New Order",user_id:((service.provider_id as ServiceProvider).user as User)._id,message:`${user.username} has requested for your service ${service.title}`});
        this.socket.sendEventToClient((service.provider_id as ServiceProvider).user.toString(),orderr,"New Order");
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
        return this.auth.generateToken(u);
    }
    async signup(user:CUser){
        const u=await this.userModel.findOne({$or:[
            {phone:user.phone}
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
    async signin(user:User){
      let searchConditions = [];
      if(!user.role){
        user.role="ADMIN"
      }
      if (user.phone && user.phone.number) {
          searchConditions.push({ "phone.number": user.phone.number ,role:user.role});
      }
      
      if (user.username) {
          searchConditions.push({ username: user.username ,role:user.role});
      }
      
      if (user.email) {
          searchConditions.push({ email: user.email,role:user.role });
      }
      
      let u = await this.userModel.findOne({ $or: searchConditions }).lean();
      if(!u){
          const p=await this.sproviderModel.findOne({email:user.email,role:user.role})
          if(!p){
            throw new Exceptions.Unauthorized("User not found or incorrect password.");
          }
          u=await this.userModel.findById(p.user);
          if(!u){
            throw new Exceptions.Unauthorized("User not found or incorrect password.");
          }
        }
        if(!(await bcrypt.compare(user.password,u.password))){
            throw new Exceptions.Unauthorized("User not found or incorrect password.");
        }
        if(u.role=="CUSTOMER"){
          // return (await this.sproviderService.getUserInfo(u) as Map<string,any>).set("token",this.auth.generateToken(u));
          const userData=await this.getUserInfo(u)
          return {user : userData["user"],services:userData["categories"],ratings:userData["ratings"],providers:userData["providers"],others:userData["others"], token:this.auth.generateToken(u)};
        }
        if(u.role=="ADMIN"){
          const userData=await this.adminService.getAdminData(u);
          return {userData:userData,token:this.auth.generateToken(u)};
        }
        
        return {user : await this.sproviderService.getUserInfo(u),token:this.auth.generateToken(u)};
        
    }
    
    async getUserInfo(user:User){
      let categoryNames = await this.categoryModel.aggregate([
        {
            $group: {
                _id: null,
                names: { $push: "$name" }
            }
        }
    ]);
    
    if (categoryNames.length > 0 && categoryNames[0].names.length > 0) {
        categoryNames = categoryNames[0].names;
    } else {
        categoryNames = []; 
    }
        const userInfo=await this.userModel.aggregate([
          {
            $addFields: {
                allCategoryNames: categoryNames
            }
        },
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
                            $expr:{
                              $eq:["$$sid", "$_id"]
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
                              $eq:["$$sid","$_id"]
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
                pipeline: [],
                as: "categories"
              }
            },
            {
              $unwind: {
                  path: "$categories", 
                  preserveNullAndEmptyArrays: true 
              }
          },
          
            {
              $lookup: {
                from: "services",
                let: { cat: "$categories.name" },  
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $eq: ["$category", "$$cat"]
                      }
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
                      let: { provider_id: "$provider_id" },
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
            
            {
              $lookup: {
                from: "services",
                let: { fetchedCats: "$allCategoryNames" },  
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $not: {
                          $in: ["$category", "$$fetchedCats"]
                        }
                      }
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
                        let: { provider_id: "$provider_id" },
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
                                $eq:["$provider_id","$$pid"],
                              }
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
              $group: {
                  _id: "$_id",
                  username: { $first: "$username" },
                  phone: { $first: "$phone" },
                  password: { $first: "$password" },
                  gender: { $first: "$gender" },
                  role: { $first: "$role" },
                  logo: { $first: "$logo" },
                  notifications: { $first: "$notifications" },
                  orders: { $first: "$orders" },
                  ratings:{$first:"$ratings"},
                  chats: { $first: "$chats" },
                  favorites:{$first:"$favorites"},
                  categories: {
                      $push: {
                          _id: "$categories._id",
                          name: "$categories.name",
                          logo: "$categories.logo",
                          services: "$services"
                      }
                  },
                  providers:{$first: "$providers"},
                  others:{$first:"$otherS"}
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
                                notifications: "$notifications",
                                orders: "$orders",
                                chats: "$chats" ,
                                favorites:"$favorites"
                            },
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
          searchConditions.push({ "phone.number": user.phone.number });
      }
      
      if (user.username) {
          searchConditions.push({ username: user.username });
      }
      
      if (user.email) {
          searchConditions.push({ email: user.email });
      }
      
        const u=await this.userModel.findOne({ $or: searchConditions });
        if(u){
            throw new Exceptions.Conflict("USER_ALREADY_EXIST");
        }
        user.password=await this.hashPassword(user.password);
        const created=await this.userModel.create(user);
        const userData=await this.getUserInfo(created)
        return {user : userData["user"],services:userData["categories"],providers:userData["providers"],others:userData["others"], token:this.auth.generateToken(created)};
    }

    async  hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, await bcrypt.genSalt(10));
    }
}
