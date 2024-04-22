import {Inject, Injectable} from "@tsed/di";
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

@Injectable()
export class AdminService {
    constructor(
        @Inject(Order)private orderModel:MongooseModel<Order>,
        @Inject(User)private userModel:MongooseModel<User>,
        @Inject(AuthService)private auth:AuthService,
        @Inject(Category)private categoryModel:MongooseModel<Category>,
        @Inject(ServiceProvider) private sproviderModel:MongooseModel<ServiceProvider>,
        @Inject(GNotification)private gnotModel:MongooseModel<GNotification>
        ){}
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
            return not;
          
        }
        async deleteUser(id:string){
            return await this.userModel.findByIdAndDelete(id);
        }
        async updateUser(user:Partial<User>){
            return await this.userModel.findByIdAndUpdate(user._id,user);
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
          return createdUser;
        }
    async getCategories(){
        return await this.categoryModel.find({active:true});
    }
    async updateCategory(data:Partial<Category>){
        return await this.categoryModel.updateOne({_id:data._id} , data);
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

        return await this.categoryModel.create(categoryData);
            
    }
    async createProvider(user:CUser,file:PlatformMulterFile){
      user.password=await this.hashPassword(user.password);
        user.role="PROVIDER";
        const userMod=await this.userModel.create(user);
        user.user=userMod;
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
          return data[0]["providers"][0];
    }
    async getAdminData(user:User){
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
                    categories: {
                        $push: {
                            _id: "$categories._id",
                            name: "$categories.name",
                            logo:"$categories.logo",
                            active:"$categories.active",
                            showOnMain:"$categories.showOnMain",
                            services: "$services"
                        }
                    },
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
                      let :{cid:"$customer_id",sid:"$service._id"},
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
                      let :{cid:"$customer_id",sid:"$service._id"},
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
