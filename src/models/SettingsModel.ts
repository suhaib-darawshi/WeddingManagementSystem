import { Model, ObjectID } from "@tsed/mongoose";
import {Default, Property} from "@tsed/schema";
@Model({
  schemaOptions: {
    timestamps: true,
  }
})
export class SettingsModel {
  @ObjectID()
  _id: string;

  @Property()
  facebook:string;

  @Property()
  instagram:string;

  @Property()
  twitter:string;

  @Property()
  google:string;

  @Property()
  youtube:string;

  @Property()
  @Default("")
  logo:string;

  @Property()
  cname:string;

  @Property()
  pname:string;

  @Property()
  description:string;

}
