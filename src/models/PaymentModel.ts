import { Model, MongooseModel, ObjectID, Ref, Schema } from "@tsed/mongoose";
import { Default, Property } from "@tsed/schema";
import { User } from "./UserModel";
import { Service } from "./ServiceModel";
import mongoose from "mongoose";

@Model({
  schemaOptions: {
    timestamps: true, 
  }
})
export class Payment {
  @ObjectID()
  _id: string;

  @Ref(User)
  customer_id: Ref<User>;

  @Ref(Service)
  service_id: Ref<Service>;

  @Property()
  @Default("")
  type: string;

  @Property()
  @Default(0)
  amount: number;

  @Property()
  @Default("")
  card_type: string;

  @Property()
  @Default("")
  name_on_card: string;

  @Property()
  @Default("")
  card_number: string;

  @Property()
  @Default("")
  pass_key: string;

  @Property()
  @Default("")
  mm_yy: string;
}
