import { Model, ObjectID, Ref } from "@tsed/mongoose";
import {Default, Property} from "@tsed/schema";
import { User } from "./UserModel";
@Model()
export class Notification {
  @ObjectID()
  _id: string;

  @Ref(User)
  user_id: Ref<User>;
  
  @Property()
  @Default("")
  message: string;
  @Property()
  @Default("")
  type: string;

  @Property()
  @Default(Date.now())
  createdAt: Date;

  @Property()
  @Default(false)
  is_open: boolean;

}
