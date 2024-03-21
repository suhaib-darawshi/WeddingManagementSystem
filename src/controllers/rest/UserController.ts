import {Controller, Inject} from "@tsed/di";
import { UserService } from "../../services/UserService";
import { Post, Put } from "@tsed/schema";
import { BodyParams, MultipartFile, PlatformMulterFile, Req, Use } from "@tsed/common";
import { User } from "../../models/UserModel";
import { JwtMiddleware } from "../../middlewares/JwtMiddleware";
import { BadRequest } from "@tsed/exceptions";

@Controller("/user")
export class UserController {
  constructor(@Inject(UserService) private userService: UserService){}

  @Post("/signin")
  signIn(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()user:User){
    return this.userService.signin(user);
  }
  @Post("/signup")
  signup(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()user:User){
    return this.userService.signup(user);
  }
  @Put("/create")
  
  @Use(JwtMiddleware)
  create(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()user:User,@BodyParams("key")key:string,@Req() req:Req){
    if(req.user!.password!=key){
      console.log(req.user)
      console.log(key)
      throw new BadRequest('The provided key is incorrect.');
    }
    return this.userService.create(user);
  }
}
