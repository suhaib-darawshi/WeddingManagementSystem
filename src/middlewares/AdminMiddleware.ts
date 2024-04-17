import { Middleware, Req, Res, Next } from "@tsed/common";
import * as jwt from "jsonwebtoken";
import { User } from "../models/UserModel";

@Middleware()
export class AdminMiddleware {
  use(@Req() request: Req, @Res() response: Res, @Next() next: Next): void {
    const token = request.headers["authorization"]; 

    if (!token) {
      response.status(401).send({ message: "No token provided." });
      return;
    }

    jwt.verify(token, process.env.JWT_SECRET!, (err, decoded) => {
      if (err) {
        response.status(401).send({ message: "Failed to authenticate token." });
        return;
      }
      
      request.user = decoded as User;
      if(request.user.role!="ADMIN"){
        response.status(401).send({ message: "Unauthorized." });
        return;
      } 
      next();
    });
  }
}
