import {Default, Property} from "@tsed/schema";
import { Model, ObjectID, Unique } from "@tsed/mongoose";
import { Schema } from "mongoose";
@Model({
  schemaOptions: {
    timestamps: true,
  }
})
export class User {
  @ObjectID("_id")
  _id: string;

  @Property()
  username:string;

  @Property()
  phone:{country:string, number:string};

  @Property()
  password:string;

  @Property()
  gender:string;

  @Property()
  @Default(true)
  status:boolean;

  @Property()
  marriageDate:Date;
  @Property()
  email: string;
  @Property()
  marriageCalc:any;
  @Property()
  @Default("CUSTOMER")
  role:string;

  @Property()
  @Default(false)
  createdByEmail: boolean;

  @Property()
  @Default("public/uploads/defaultImage.jpg")
  logo: string;

}
