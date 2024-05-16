import { Model, ObjectID, Ref } from "@tsed/mongoose";
import {Default, Property} from "@tsed/schema";
import { User } from "./UserModel";
import { Service } from "./ServiceModel";
import { Rating } from "./RatingModel";
@Model({
  schemaOptions: {
    timestamps: true, 
  }
})
export class Order {
  @ObjectID()
  _id: string;

  @Ref(User)
  customer_id:Ref<User>;

  @Ref(Service)
  service_id:Ref<Service>;

  @Property()
  @Default(Date.now())
  order_date: Date;

  @Property()
  paymentId:string;
  
  @Property()
  @Default("IDLE")
  status:string;  

  @Property()
  @Default("")
  city:string;

  @Property()
  @Default("")
  neighborhood:string;

  @Property()
  @Default("")
  hall:string;

  @Ref(Rating)
  rating: Ref<Rating>;

  @Property()
  tip:{value:number,id:string};
}
