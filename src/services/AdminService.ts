import {Inject, Injectable, InjectorService} from "@tsed/di";
import { BadRequest, Conflict, Unauthorized } from "@tsed/exceptions";
import { MongooseModel } from "@tsed/mongoose";
import { Order } from "../models/OrderModel";
import { User } from "../models/UserModel";
import { AuthService } from "./AuthService";
import { Category } from "../models/CategoryModel";
import { PlatformMulterFile } from "@tsed/common";
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { CUser } from "../interfaces/CUser";
import { ServiceProvider } from "../models/ServiceProviderModel";
import { GNotification } from "../models/GNotificationModel";
import { Service } from "../models/ServiceModel";
import { Socket } from "@tsed/socketio";
import { CustomSocketService } from "./CustomSocketService";
import { Chat } from "../models/ChatModel";
import { Message } from "../models/MessageModel";
import { Rating } from "../models/RatingModel";
import { Ad } from "../models/AdsModel";
import * as ExcelJS from 'exceljs';

@Injectable()
export class AdminService {
    constructor(
        @Inject(Order)private orderModel:MongooseModel<Order>,
        @Inject(User)private userModel:MongooseModel<User>,
        @Inject(AuthService)private auth:AuthService,
        @Inject(Category)private categoryModel:MongooseModel<Category>,
        @Inject(ServiceProvider) private sproviderModel:MongooseModel<ServiceProvider>,
        @Inject(GNotification)private gnotModel:MongooseModel<GNotification>,
        @Inject(Service)private serviceModel:MongooseModel<Service>,
        private injector: InjectorService,
        @Inject(Chat)private chatModel:MongooseModel<Chat>,
        @Inject(Message)private messageModel:MongooseModel<Message>,
        @Inject(Rating)private ratingModel:MongooseModel<Rating>,
        @Inject(Ad)private adsModel:MongooseModel<Ad>
        ){}
        async getOrdersFile(ids:string[]){
          const orders = await this.orderModel.find({
            '_id': { $in: ids }
          }).populate([{path:"customer_id",model:"User"},{path:"service_id",model:"Service",populate:{path:"provider_id",model:"ServiceProvider",populate:{path:"user",model:"User"}}}]);
          return await this.createExcelFileForOrders(orders);
        }
        formatDate(date:Date){
          return  `${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
        }
        async createExcelFileForOrders(orders:any[]){
          const workbook = new ExcelJS.Workbook();
          const sheet = workbook.addWorksheet('Orders');
          const headerCellStyle: Partial<ExcelJS.Style> = {
            font: {
              bold: true,
              color: { argb: 'FF000000' } 
            },
            fill: {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFFFFFFF' },
              
            },
            alignment: {
              vertical: 'middle',
              horizontal: 'center', 
            },
            border: {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' },
              
            }
          };
          sheet.columns = [
            { header: 'كود الطلب', key: 'ID', width: 30 ,style: headerCellStyle},
            { header: 'تاريخ الطلب', key: 'odate', width: 30 ,style: headerCellStyle},
            { header: 'اسم الزبون', key: 'customerName', width: 30 ,style: headerCellStyle},
            { header: 'رقم هاتف الزبون', key: 'customerPh', width: 30 ,style: headerCellStyle},
            { header: 'المدينة', key: 'city', width: 30 ,style: headerCellStyle},
            { header: 'الحي', key: 'neigh', width: 30 ,style: headerCellStyle},
            { header: 'حالة الطلب', key: 'status', width: 30 ,style: headerCellStyle},
            { header: 'تاريخ الزواج', key: 'mdate', width: 30 ,style: headerCellStyle},
            { header: 'اسم الخدمة', key: 'sname', width: 30 ,style: headerCellStyle},
            { header: 'سعر الخدمة', key: 'sprice', width: 30 ,style: headerCellStyle},
            { header: 'اسم مزود الخدمة', key: 'spname', width: 30 ,style: headerCellStyle},
            { header: 'رقم هاتف المزود', key: 'spph', width: 30 ,style: headerCellStyle},
          ];
          orders.forEach(order => {
            const row=sheet.addRow({
              ID: order._id.toString(),
              odate: this.formatDate(order.createdAt),
              customerName:(order.customer_id as User).username,
              customerPh:(order.customer_id as User).phone.country+(order.customer_id as User).phone.number,
              city:order.city??"",
              neigh:order.neighborhood??"",
              status:order.status,
              mdate:this.formatDate(order.order_date),
              sname:(order.service_id as Service).title.toString(),
              sprice:(order.service_id as Service).price.toString(),
              spname:(((order.service_id as Service).provider_id as ServiceProvider).user as User).username.toString(),
              spph:((((order.service_id as Service).provider_id as ServiceProvider).user as User).phone.country+(((order.service_id as Service).provider_id as ServiceProvider).user as User).phone.number).toString()
            });
            row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
              cell.style = {
                fill: {
                  type: 'pattern',
                  pattern: 'solid',
                  // fgColor: { argb: this.getRiskColor(reading.reading.ht_data.rhum) }, 
                },
                font:{
                  color:{ argb: 'FF000000' }
                },
                border: {
                  top: { style: 'thin' },
                  left: { style: 'thin' },
                  bottom: { style: 'thin' },
                  right: { style: 'thin' },
                }
              };
              
              if (colNumber === 2) { 
                cell.style.numFmt = 'dd/mm/yyyy hh:mm:ss'; 
              }
            });
          });
        
          // Write to a buffer
          const buffer = await workbook.xlsx.writeBuffer();
          return buffer;
        }
        async deleteNot(id:string){
          return this.gnotModel.findByIdAndDelete(id);
        }
        async createGNot(notData:Partial<GNotification>,file?:PlatformMulterFile){
          const not =await this.gnotModel.create(notData);
          if(!file) throw new BadRequest( "Image is required");
          
            
            const originalExtension = path.extname(file.originalname)
            const uploadsDir = path.join( 'public', 'uploads', "notifications");
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            const targetPath = path.join(uploadsDir, `${not._id.toString()}${originalExtension}`);
            fs.writeFileSync(targetPath, file.buffer);
            not.logo = path.join('public','uploads', "notifications", `${not._id.toString()}${originalExtension}`);
            await not.save();
            const toEmtit=await this.gnotModel.findById(not._id);
            const socket = this.injector.get<CustomSocketService>(CustomSocketService)!;
            socket.onNewNotification(toEmtit);
            return not;
          
        }
        async deleteUser(id:string){
          await this.orderModel.deleteMany({customer_id:id});
          await this.messageModel.deleteMany({receiver_id:id});
          await this.chatModel.deleteMany({users:{$in:[id]}});
          await this.ratingModel.deleteMany({customer_id:id})
          return await this.userModel.findByIdAndDelete(id);
        }
        async deleteProvider(id:string){
          await this.userModel.findById(id);
          await this.messageModel.deleteMany({receiver_id:id});
          await this.chatModel.deleteMany({users:{$in:[id]}});
          const p=await this.sproviderModel.findOne({user:id});
          const services=await this.serviceModel.find({provider_id:p?._id});
          for(let i of services){
            await this.orderModel.deleteMany({service_id:i._id});
            await this.ratingModel.deleteMany({service_id:i._id})
            await i.deleteOne();
          }          
          await this.userModel.findByIdAndDelete(p!.user);
          await p?.deleteOne();
        }
        async updateUser(user:Partial<User>){
            return await this.userModel.findByIdAndUpdate(user._id,user);
        }
        async updateProvider(u:Partial<User>){
          
          const p=await this.sproviderModel.findOne({user:u._id});
          if(!p){
            throw new BadRequest("Invalid provider id");
          }

          // await this.sproviderModel.findByIdAndUpdate(p._id,u);
          return await this.userModel.findByIdAndUpdate(u._id,u);
        }
        async  hashPassword(password: string): Promise<string> {
            return bcrypt.hash(password, await bcrypt.genSalt(10));
        }
        async createUser(user:User,file?:PlatformMulterFile){
            user.role="CUSTOMER";
        const u=await this.userModel.findOne({$or:[
            {username:user.username},
            {phone:user.phone}
        ]});
        if(u){
            throw new Conflict("USER_ALREADY_EXIST");
        }
        user.password=await this.hashPassword(user.password);
        const createdUser= await this.userModel.create(user);
        if (file) {
            
            const originalExtension = path.extname(file.originalname)
            const uploadsDir = path.join( 'public', 'uploads', createdUser._id.toString());
            if (!fs.existsSync(uploadsDir)) {
                fs.mkdirSync(uploadsDir, { recursive: true });
            }
            const targetPath = path.join(uploadsDir, `logo${originalExtension}`);
            fs.writeFileSync(targetPath, file.buffer);
            createdUser.logo = path.join('public','uploads', createdUser._id.toString(), `logo${originalExtension}`);
            await createdUser.save()
          }
          const socket = this.injector.get<CustomSocketService>(CustomSocketService)!;
          socket.onNewCustomer(createdUser);
          return createdUser;
        }
    async getCategories(){
        return await this.categoryModel.find({active:true});
    }
    async updateCategory(data:Partial<Category>,file?:PlatformMulterFile){
      const c=await this.categoryModel.findById(data._id);
      if(!c) throw new BadRequest("Category Not Found");

      if(file){
        const originalExtension = path.extname(file.originalname)
        const uploadsDir = path.join( 'public', 'uploads', 'categories');
        if (fs.existsSync(data.logo!)) {
          fs.unlinkSync(data.logo!); 
      }
        const targetPath = path.join(uploadsDir, data.name+originalExtension);
        fs.writeFileSync(targetPath, file.buffer);
        data.logo = path.join('public','uploads', 'categories', data.name+originalExtension);
      }
         await this.categoryModel.updateOne({_id:data._id} , data);
         return await this.categoryModel.findById(data._id);
    }
    async deleteCategory(id:string){
        return this.categoryModel.findByIdAndDelete(id);
    }
    async signIn(userr:User){
        userr.role="ADMIN";
        const user=await this.userModel.findOne(userr);
        if(!user) throw new Unauthorized("ADMIN_NOT_FOUND");
        const userData=await this.getAdminData(user);
        return {user : userData["user"],services:userData["services"],token:this.auth.generateToken(user)};
    }
    async createCategory(categoryData:Category,file?:PlatformMulterFile){
        if(!file) throw new BadRequest("File Not Provided");
        const check=await this.categoryModel.findOne({name:categoryData.name});
        if(check) throw new BadRequest("Category Name Already Used");
        const originalExtension = path.extname(file.originalname)
        const uploadsDir = path.join( 'public', 'uploads', 'categories');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const targetPath = path.join(uploadsDir, categoryData.name+originalExtension);
        fs.writeFileSync(targetPath, file.buffer);
        categoryData.logo = path.join('public','uploads', 'categories', categoryData.name+originalExtension);
        
        const cat= await this.categoryModel.create(categoryData);
        const socket = this.injector.get<CustomSocketService>(CustomSocketService)!;
        if(cat.active==true) socket.onNewCategory(cat);
        return cat;
    }
    async createProvider(user:any,file:PlatformMulterFile,file2?:PlatformMulterFile){
      user.password=await this.hashPassword(user.password);
        user.role="PROVIDER";
        const userMod=await this.userModel.create(user);
        user.user=userMod;
        const category=await this.categoryModel.findOne({name:user.category});
        user.category=category;
        const provider=await this.sproviderModel.create(user);
        if (file) {
          const originalExtension = path.extname(file.originalname)
          const uploadsDir = path.join( 'public', 'uploads', userMod._id.toString());
          if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
          }
          console.log(uploadsDir);
          const targetPath = path.join(uploadsDir, `logo${originalExtension}`);
          fs.writeFileSync(targetPath, file.buffer);
          userMod.logo = path.join('public','uploads', userMod._id.toString(), `logo${originalExtension}`);
          await userMod.save();
            if(file2){
              const originalExtension2 = path.extname(file2.originalname)
            const uploadsDir2 = path.join( 'public', 'uploads', userMod._id.toString());
            if (!fs.existsSync(uploadsDir2)) {
                fs.mkdirSync(uploadsDir2, { recursive: true });
            }
            const targetPath2 = path.join(uploadsDir2, `blogo${originalExtension2}`);
            fs.writeFileSync(targetPath2, file2.buffer);
            userMod.logo = path.join('public','uploads', userMod._id.toString(), `blogo${originalExtension2}`);
            await userMod.save();
            }
          }
          const data=await this.sproviderModel.aggregate([
            {
              $lookup:{
                  from:"users",
                  let:{id:userMod._id},
                  as :"providers",
                  pipeline: [
                      {
                          $match:{
                              $expr:{
                                
                                  $eq:["$_id","$$id"]

                                
                              }
                          }
                      },
                      { $sort: { createdAt: -1 } }, 
                      { $limit: 100 },
                      
                      {
                          $lookup:{
                              from:"serviceproviders",
                              let:{userId:"$_id"},
                              as:"provider",
                              
                              pipeline:[  
                                  {
                                      $match:{
                                          $expr:{
                                              $eq:[ "$user", '$$userId']
                                          }
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
                                        from :"services",
                                        let:{id:"$_id"},
                                        as:"services",
                                        pipeline:[
                                          {
                                            $match:{
                                              $expr:{
                                                $eq:["$$id","$provider_id"]
                                              }
                                            }
                                          },
                                          
                                        ]
                                      }
                                    },
                                    {
                                      $lookup:{
                                        from:"galleries",
                                        let:{id:"$_id"},
                                        as:"works",
                                        pipeline:[
                                          {
                                            $match:{
                                              $expr:{
                                                $eq:["$$id","$provider_id"]
                                              }
                                            }
                                          }
                                        ]
                                      }
                                    },
                                  {$limit:1},
                                  {
                                      $addFields:{pid: "$_id"}
                                    },
                                    {
                                      $project:{
                                        _id:0
                                      }
                                    }
                              ]
                          }
                      },
                      {
                          $addFields: {
                              provider: { $arrayElemAt: ["$provider", 0] }
                          }
                      },
                      {
                          $replaceRoot: {
                              newRoot: { $mergeObjects: ["$$ROOT", "$provider"] }
                          }
                      },
                  ],
              },
              
          },
          {$limit:1}
          ]);
          const socket = this.injector.get<CustomSocketService>(CustomSocketService)!;
          socket.onNewProvider(data[0]["providers"][0]);
          return data[0]["providers"][0];
    }
    async addAds(ad:any,file?:PlatformMulterFile){
      const cat =await this.categoryModel.findOne({name:ad.category})
      if(!cat || !file) throw new BadRequest(" Category not found");
      ad.category=cat;
      const created=await this.adsModel.create(ad);
      const originalExtension = path.extname(file.originalname)
        const uploadsDir = path.join( 'public', 'uploads', 'ads');
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const targetPath = path.join(uploadsDir, created._id+originalExtension);
        fs.writeFileSync(targetPath, file.buffer);
        created.logo = path.join('public','uploads', 'ads', created._id+originalExtension);
        await created.save();
        const data=await this.adsModel.aggregate([
          {
            $match:{
              $expr:{
                $eq:["$_id",created._id]
              }
            }
          },
          {
            $limit:1
          },
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
        ]);
        const socket = this.injector.get<CustomSocketService>(CustomSocketService)!;
        socket.onNewAd(data[0]);
        return data[0];
    }
    async deleteAds(id:string){
      return await this.adsModel.findByIdAndDelete(id);
    }
    async getAdminData(user:User){
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
                _id: user._id,
                
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
                    from:"users",
                    let:{role:"CUSTOMER"},
                    as :"users",
                    pipeline: [
                        {
                            $match:{
                                $expr:{
                                    $eq:["$role","$$role"]
                                }
                            }
                        },
                        { $sort: { createdAt: -1 } }, 
                        { $limit: 100 }              
                    ],
                }
            },
            {
                $lookup:{
                    from:"users",
                    let:{role:"PROVIDER"},
                    as :"providers",
                    pipeline: [
                        {
                            $match:{
                                $expr:{
                                    $eq:["$role","$$role"]
                                }
                            }
                        },
                        { $sort: { createdAt: -1 } }, 
                        { $limit: 100 },
                        
                        {
                            $lookup:{
                                from:"serviceproviders",
                                let:{userId:"$_id"},
                                as:"provider",
                                
                                pipeline:[  
                                    {
                                        $match:{
                                            $expr:{
                                                $eq:[ "$user", '$$userId']
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
                                          from :"services",
                                          let:{id:"$_id"},
                                          as:"services",
                                          pipeline:[
                                            {
                                              $match:{
                                                $expr:{
                                                  $eq:["$$id","$provider_id"]
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
                                          ]
                                        }
                                      },
                                      {
                                        $lookup:{
                                          from:"galleries",
                                          let:{id:"$_id"},
                                          as:"works",
                                          pipeline:[
                                            {
                                              $match:{
                                                $expr:{
                                                  $eq:["$$id","$provider_id"]
                                                }
                                              }
                                            }
                                          ]
                                        }
                                      },
                                    {$limit:1},
                                    {
                                        $addFields:{pid: "$_id"}
                                      },
                                      {
                                        $project:{
                                          _id:0
                                        }
                                      }
                                ]
                            }
                        },
                        {
                            $addFields: {
                                provider: { $arrayElemAt: ["$provider", 0] }
                            }
                        },
                        {
                            $replaceRoot: {
                                newRoot: { $mergeObjects: ["$$ROOT", "$provider"] }
                            }
                        },
                    ],
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
                          },
                          
                        },
                        {
                          $lookup:{
                            from:"orders",
                            let:{sid:"$_id"},
                            as :"orders",
                            pipeline:[
                              {
                                $match:{
                                  $expr:{
                                    $eq:["$$sid","$service_id"]
                                  }
                                }
                              },
                              { $sort: { createdAt: -1 } },  
                            { $limit: 100 },
                            {
                                $lookup:{
                                    from:"users",
                                    let :{customerId:"$customer_id"},
                                    as :"customer",
                                    
                                    pipeline:[
                                        {
                                            $match:{
                                                $expr:{
                                                    $eq:["$$customerId", "$_id"]
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
                                    customer: { $arrayElemAt: ["$customer", 0] }
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
                                                          from:"galleries",
                                                          let:{id:"$_id"},
                                                          as:"works",
                                                          pipeline:[
                                                            {
                                                              $match:{
                                                                $expr:{
                                                                  $eq:["$$id","$provider_id"]
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
                            ]
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
                    chats: { $first: "$chats" },
                    ads:{$first:"$ads"},
                    categories: { $first:"$categories"},
                    users:{$first:"$users"},
                    providers:{$first:"$providers"},
                    others:{$first:"$otherS"}
                    
                }
            },
            {
                $lookup: {
                    from: "orders",
                    as: "orders",
                    pipeline:[
                        { $sort: { createdAt: -1 } },  
                        { $limit: 100 },
                        {
                            $lookup:{
                                from:"users",
                                let :{customerId:"$customer_id"},
                                as :"customer",
                                
                                pipeline:[
                                    {
                                        $match:{
                                            $expr:{
                                                $eq:["$$customerId", "$_id"]
                                            }
                                        }
                                        
                                    },
                                    {
                                        $limit:1
                                    },
                                    
                                ]
                            }
                        },
                      //   {
                      //     $addFields: {
                      //         customer: { $arrayElemAt: ["$customer", 0] }
                      //     }
                      // },
                        
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
                                                      from:"galleries",
                                                      let:{id:"$_id"},
                                                      as:"works",
                                                      pipeline:[
                                                        {
                                                          $match:{
                                                            $expr:{
                                                              $eq:["$$id","$provider_id"]
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
                              customer: { $arrayElemAt: ["$customer", 0] }
                          }
                      },
                        {
                            $addFields: {
                              service: { $arrayElemAt: ["$service", 0] }
                            }
                          },
                        
                      ]
                }
            },
            {
              $lookup:{
                from:"ratings",
                as:"ratings",
                pipeline:[
                  {
                    $lookup:{
                      from :"users",
                      as :"customers",
                      let :{cid:"$customer_id",sid:"$service_id"},
                      pipeline:[
                        {
                          $match:{
                            $expr:{
                              $eq:[ "$_id", '$$cid']
                            }
                          }
                        },
                        {$limit:1}
                      ]


                    }
                  },
                  {
                    $lookup:{
                      from :"services",
                      as :"services",
                      let :{cid:"$customer_id",sid:"$service_id"},
                      pipeline:[
                        {
                          $match:{
                            $expr:{
                              $eq:[ "$_id", '$$sid']
                            }
                          }
                        },
                        {$limit:1}
                      ]


                    }
                  },
                  {
                    $addFields:{
                      customer:{ $arrayElemAt: ["$customers", 0] }
                    }
                  },
                  {
                    $addFields:{
                      service:{ $arrayElemAt: ["$services", 0] }
                    }
                  }
                ]
              }
            },
            {
              $lookup:{
                from:"gnotifications",
                as:"gnotifications",
                pipeline:[]
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
                                
                                chats: "$chats"
                            },
                            gnotifications: "$gnotifications",
                            ratings:"$ratings",
                            categories: "$categories",
                            orders: "$orders",
                            users:"$users",
                            ads:"$ads",
                            providers:"$providers",
                            others:"$others"
                        }
                    },
            {
                $limit: 1 
            }
        ]).exec();
        return  userInfo[0];
    }
}
