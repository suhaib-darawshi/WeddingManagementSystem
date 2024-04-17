import { Model, MongooseModel, ObjectID, Ref } from "@tsed/mongoose";
import {Default, Property} from "@tsed/schema";
import { User } from "./UserModel";
import { Message } from "./MessageModel";
@Model({
  schemaOptions: {
    timestamps: true, 
  }
})
export class Chat {
  @ObjectID()
  _id: string;

  @Ref(User)
  users:Ref<User>[];
  

  @Ref(Message)
  messages: Ref<Message>[];

  
}
