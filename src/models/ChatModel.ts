import { Model, MongooseModel, ObjectID, Ref } from "@tsed/mongoose";
import {Default, Property} from "@tsed/schema";
import { User } from "./UserModel";
import { Message } from "./MessageModel";
@Model()
export class Chat {
  @ObjectID()
  _id: string;

  @Ref(User)
  users:Ref<User>[];
  

  @Ref(Message)
  messages: Ref<Message>[];

  @Property()
  @Default(Date.now())
  createdAt: Date;

  @Property()
  @Default(Date.now())
  lastUpdated:Date;
}
