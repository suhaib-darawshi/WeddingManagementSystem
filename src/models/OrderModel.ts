import { Model, ObjectID, Ref } from "@tsed/mongoose";
import {Default, Property} from "@tsed/schema";
import { User } from "./UserModel";
import { Service } from "./ServiceModel";
@Model()
export class Order {
  @ObjectID()
  _id: string;

  @Ref(User)
  customer_id:Ref<User>;

  @Ref(Service)
  service_id:Ref<Service>;

  @Property()
  @Default(Date.now())
  createdAt: Date;

  @Property()
  @Default(Date.now())
  order_date: Date;

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

}
