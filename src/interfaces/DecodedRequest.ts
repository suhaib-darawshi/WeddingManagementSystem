import { User } from "../models/UserModel";

declare module "@tsed/common" {
    interface Req {
      user?: User; 
      key:any
    }
  }
