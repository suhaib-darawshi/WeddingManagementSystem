import {Inject, Injectable} from "@tsed/di";
import { Service } from "../models/ServiceModel";
import { MongooseModel } from "@tsed/mongoose";
import { Rating } from "../models/RatingModel";
import { User } from "../models/UserModel";
import { BadRequest } from "@tsed/exceptions";
import { Order } from "../models/OrderModel";

@Injectable()
export class ServiceService {
    constructor(@Inject(Service)private serviceModel:MongooseModel<Service>,@Inject(User)private userModel:MongooseModel<User>,@Inject(Rating)private ratingModel:MongooseModel<Rating>,@Inject(Order)private orderModel:MongooseModel<Order>){}
    async createService(service: Partial<Service>) {
        return await this.serviceModel.create(service);
    }
    async getExtraServices(cat:string,skip:number){
        const services =  await this.serviceModel.find({category: cat}).skip(skip).limit(20).exec();
    }
    async RateService(rating:Partial<Rating>,orderId:string){
        
        const customer=await this.userModel.findById(rating.customer_id);
        if(!customer)  throw new BadRequest("Customer not found");
        const  service=await this.serviceModel.findById(rating.service_id);
        if(!service)  throw new BadRequest("Service not found");
        const order=await this.orderModel.findById(orderId);
        if(!order)  throw new BadRequest('Order Not Found');
        if(order.rating!=null){
            await this.ratingModel.findByIdAndDelete(order.rating!);
        }
        const storedRating =await this.ratingModel.create(rating);
        order.rating=storedRating;
        await order.save();
        return rating;
    }
    async searchService(searchText:string){
        if(searchText.length==0) {
            const services = await this.serviceModel.aggregate([
                
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
            ]);
            return services;
        }
        const services = await this.serviceModel.aggregate([
            {
                $match: {
                  title: { $regex: searchText, $options: 'i' },
                },
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
        ]);
        return services;
    }
}
