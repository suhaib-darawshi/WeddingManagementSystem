import { Model, ObjectID, Ref } from "@tsed/mongoose";
import {Default, Property} from "@tsed/schema";
import { User } from "./UserModel";
@Model()
export class Message {
  @ObjectID()
  _id:string;
  
  @Ref(User)
  receiver_id: Ref<User>;

  @Property()
  @Default("")
  type:string

  @Property()
  @Default(Date.now())
  createdAt: Date;

  @Property()
  @Default("")
  message: string;
  @Property()
  latitude:number;
  @Property()
  longitude:number;
  @Property()
  @Default(false)
  is_seen: boolean;
}
