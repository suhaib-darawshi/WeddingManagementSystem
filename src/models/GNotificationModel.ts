import { Model, ObjectID } from "@tsed/mongoose";
import {Default, Property} from "@tsed/schema";
@Model({
  schemaOptions: {
    timestamps: true, 
  }
})
export class GNotification {
  @ObjectID()
  _id: string;

  @Property()
  @Default("")
  message: string;

  @Property()
  @Default("")
  type: string;
  @Property()
  instruction:string;
  @Property()
  @Default("")
  logo:string;
}
