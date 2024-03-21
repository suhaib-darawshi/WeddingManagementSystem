import {Injectable} from "@tsed/di";
import * as jwt from 'jsonwebtoken';
import { User } from "../models/UserModel";

@Injectable()
export class AuthService {
  generateToken(user: User): string {
    const payload = {
      _id: user._id,
      password: user.password,
      username: user.username,
      role: user.role,
    };

    const secret = process.env.JWT_SECRET; 
    const options = { expiresIn: '7d' }; 

    const token = jwt.sign(payload, secret!, options);

    return token;
  }
  generateGeneralToken(alert: string): string {
    const payload = {
      key:alert
    };

    const secret = process.env.JWT_SECRET; 
    const options = { expiresIn: '7d' }; 

    const token = jwt.sign(payload, secret!, options);

    return token;
  }
}
