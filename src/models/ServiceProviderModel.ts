import {Property} from "@tsed/schema";
import { User } from "./UserModel";
import { Model } from "@tsed/mongoose";
@Model()
export class ServiceProvider extends User {
  @Property()
  logo: string;
  @Property()
  email: string;

  @Property()
  latitude: number;
  @Property()
  longitude: number;
  @Property()
  field: string;
}
