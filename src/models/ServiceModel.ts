import { Model, ObjectID, Ref } from "@tsed/mongoose";
import {Default, Property} from "@tsed/schema";
import { ServiceProvider } from "./ServiceProviderModel";
import { Gallery } from "./GalleryModel";
@Model()
export class Service {
  @ObjectID()
  _id: string;
  @Ref(ServiceProvider)
  provider_id:Ref<ServiceProvider>;
  
  @Property()
  @Default("")
  logo: string;

  @Property()
  @Default("")
  title: string;

  @Property()
  @Default(0)
  price: number;

  @Property()
  @Default("")
  description: string;

  @Property()
  @Default("")
  category: string;

  @Property()
  @Default([])
  cities: string[];

  @Property()
  @Default([])
  objectives: string[];

}
