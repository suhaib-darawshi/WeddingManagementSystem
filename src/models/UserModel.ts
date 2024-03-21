import {Default, Property} from "@tsed/schema";
import { Model, ObjectID, Unique } from "@tsed/mongoose";
@Model()
export class User {
  @ObjectID("_id")
  _id: string;
  @Property()
  username:string;
  @Property()
  @Unique()
  phone:string;
  @Property()
  password:string;
  @Property()
  gender:string;
  @Property()
  @Default("CUSTOMER")
  role:string;

}
