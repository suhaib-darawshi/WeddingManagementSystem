import { Model, ObjectID, Ref } from "@tsed/mongoose";
import {Default, Property} from "@tsed/schema";
import { User } from "./UserModel";
import { Service } from "./ServiceModel";
@Model({
  schemaOptions: {
    timestamps: true, 
  }
})
export class Rating {
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
  @Default([])
  replies:Reply[];
}
class Reply{
  message:string;
  createdAt:Date;
  user?:Ref<User>
}