import { Model, ObjectID, Ref } from "@tsed/mongoose";
import {Default, Property} from "@tsed/schema";
import { User } from "./UserModel";
import { Service } from "./ServiceModel";
@Model()
export class RatingModel {
  @ObjectID()
  _id: string;

  @Ref(User)
  customer_id:Ref<User>;

  @Ref(Service)
  service_id:Ref<Service>;

  @Property()
  @Default("")
  review: string;

  @Property()
  @Default(1)
  value: number;

  @Property()
  @Default(Date.now())
  createdAt: Date;
}
