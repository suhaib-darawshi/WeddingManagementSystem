import {Inject, Injectable} from "@tsed/di";
import { BadRequest, Unauthorized } from "@tsed/exceptions";
import { MongooseModel } from "@tsed/mongoose";
import { Order } from "../models/OrderModel";
import { User } from "../models/UserModel";
import { AuthService } from "./AuthService";
import { Category } from "../models/CategoryModel";
import { PlatformMulterFile } from "@tsed/common";
import * as fs from 'fs';
import * as path from 'path';
@Injectable()
export class AdminService {
    constructor(
        @Inject(Order)private orderModel:MongooseModel<Order>,
        @Inject(User)private userModel:MongooseModel<User>,
        @Inject(AuthService)private auth:AuthService,
        @Inject(Category)private categoryModel:MongooseModel<Category>
        ){}
    async getCategories(){
        return await this.categoryModel.find({active:true});
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
    async getAdminData(user:User){
        let categoryNames = await this.categoryModel.aggregate([
            {
                $group: {
                    _id: null,
                    names: { $push: "$name" }
                }
            }
        ]);
        const userInfo=await this.userModel.aggregate([
            {
                $addFields: {
                    allCategoryNames: categoryNames[0].names  // Assuming category names are stored in a single document array
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
                  let: { fetchedCats: "$allCategoryNames" },  // This assumes you have the category names collected in a previous step
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
                        { $sort: { createdAt: -1 } },  // Sorting orders by creation date in descending order
                        { $limit: 100 },
                        {
                            $lookup:{
                                from:"users",
                                let :{customerId:"$customer_id"},
                                as :"customer_info",
                                
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
                                customer: { $arrayElemAt: ["$customer_info", 0] }
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
