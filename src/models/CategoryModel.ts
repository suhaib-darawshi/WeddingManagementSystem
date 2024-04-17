import { Model, ObjectID, Unique, schemaOptions } from "@tsed/mongoose";
import { Default, Property} from "@tsed/schema";
@Model({schemaOptions:{
  timestamps:true
}})
export class Category {
  @ObjectID()
  _id: string;

  @Property()
  @Unique()
  name:string;

  @Property()
  logo:string;

  @Property()
  @Default(true)
  showOnMain:boolean;

  @Property()
  @Default(true)
  active:boolean;
}
