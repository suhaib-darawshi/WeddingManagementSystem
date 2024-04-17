import { Model, ObjectID, Ref } from "@tsed/mongoose";
import {Property} from "@tsed/schema";
import { ServiceProvider } from "./ServiceProviderModel";
@Model({
  schemaOptions: {
    timestamps: true, 
  }
})
export class Address {
  @ObjectID()
  _id: string;

  @Property()
  name:string

  @Property()
  latitude:number;

  @Property()
  longitude:number;

  @Property()
  phone:{country:string,number:string};

  @Property()
  city:string;

  @Ref(ServiceProvider)
  provider:Ref<ServiceProvider>
}
