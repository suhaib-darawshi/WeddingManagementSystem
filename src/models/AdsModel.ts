import { Model, ObjectID, Ref } from "@tsed/mongoose";
import {Default, Property} from "@tsed/schema";
import { Category } from "./CategoryModel";
@Model({
  schemaOptions: {
    timestamps: true, 
  }
})
export class Ad {
  @ObjectID()
  _id: string;
  @Ref(Category)
  category: Ref<Category>;

  @Property()
  @Default(Date.now())
  startDate:Date;

  @Property()
  @Default(Date.now())
  endDate:Date;

  @Property()
  logo:string;

  @Property()
  message:string;
}
