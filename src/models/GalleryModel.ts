import { Model, ObjectID, Ref } from "@tsed/mongoose";
import {Default, Property} from "@tsed/schema";
import { ServiceProvider } from "./ServiceProviderModel";
@Model({
  schemaOptions: {
    timestamps: true, 
  }
})
export class Gallery {
  @ObjectID()
  _id: string;

  @Ref(ServiceProvider)
  provider_id: Ref<ServiceProvider>;

  @Property()
  @Default("")
  url: string;
  
  @Property()
  @Default("")
  location: string;

  @Property()
  @Default("")
  description: string;

  @Property()
  @Default("")
  category: string;

  @Property()
  @Default("")
  type: string;

  
}
