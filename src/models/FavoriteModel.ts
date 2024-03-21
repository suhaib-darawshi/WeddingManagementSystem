import { Model, MongooseModel, ObjectID, Ref } from "@tsed/mongoose";
import {Default, Property} from "@tsed/schema";
import { Service } from "./ServiceModel";
import { User } from "./UserModel";
@Model()
export class Favorite {
  @ObjectID()
  _id: string;

  @Ref(Service)
  service_id:Ref<Service>;

  @Ref(User)
  customer_id: Ref<User>

  @Property()
  @Default(Date.now())
  createdAt: Date;
}
export const FavoriteModel: MongooseModel<Favorite> = Favorite as MongooseModel<Favorite>;
