import { Model, ObjectID, Ref } from "@tsed/mongoose";
import {Default, Property} from "@tsed/schema";
import { Service } from "./ServiceModel";
@Model()
export class Gallery {
  @ObjectID()
  _id: string;

  @Ref(Service)
  service_id: Ref<Service>;

  @Property()
  @Default("")
  name: string;
  
  @Property()
  @Default("")
  type: string;

  
  @Property()
  @Default(Date.now())
  createdAt: Date;
}
