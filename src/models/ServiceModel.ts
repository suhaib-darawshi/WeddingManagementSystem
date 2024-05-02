import { Model, ObjectID, Ref } from "@tsed/mongoose";
import {Default, Property} from "@tsed/schema";
import { ServiceProvider } from "./ServiceProviderModel";
import { Gallery } from "./GalleryModel";
import { Category } from "./CategoryModel";
@Model({
  schemaOptions: {
    timestamps: true, 
  }
})
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
  link: string;

  @Ref(Category)
  category: Ref<Category>;

  @Property()
  @Default([])
  cities: string[];

  @Property()
  @Default([])
  objectives: string[];

  @Property()
  @Default("ACTIVE")
  status: string ;

  @Property()
  @Default(true)
  autoAccept:boolean
}
