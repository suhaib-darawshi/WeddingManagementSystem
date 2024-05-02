import {Default, Property} from "@tsed/schema";
import { User } from "./UserModel";
import { Model, ObjectID, Ref } from "@tsed/mongoose";
import { Schema } from "mongoose";
import { Category } from "./CategoryModel";
@Model({
  schemaOptions: {
    timestamps: true, 
  }
})
export class ServiceProvider {
  @ObjectID("_id")
  _id: string;
  
  @Ref(User)
  user: Ref<User>;

  @Property()
  email: string;

  @Property()
  latitude: number;

  @Property()
  longitude: number;

  @Property()
  field: string;

  @Property()
  @Default("public/uploads/defaultImage.jpg")
  blogo: string;

  @Ref(Category)
  category: Ref<Category> ;
  @Property()
  @Default(true)
  confirmed: boolean;

  @Property()
  location:string;

  @Property()
  @Default("ACTIVE")
  order_status:string
}
