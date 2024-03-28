import {Controller, Inject} from "@tsed/di";
import { UserService } from "../../services/UserService";
import { Post, Put } from "@tsed/schema";
import { BodyParams, MultipartFile, PathParams, PlatformMulterFile, Req, Use } from "@tsed/common";
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
  @Post("/forget/:phone")
  forgetPassword(@MultipartFile("file")file:PlatformMulterFile,@PathParams("phone")phone:string){
    return this.userService.forgetPassword(phone);
  }
  @Post("/verify/:key")
  @Use(JwtMiddleware)
  verifyCode(@MultipartFile("file")file:PlatformMulterFile,@PathParams("key")key:string,@Req()req:Req){
    if(req.user!.password!=key){
      console.log(req.user)
      console.log(key)
      throw new BadRequest('The provided key is incorrect.');
    }
    return this.userService.verifyCode(req.user?._id!)
  }
  @Post("/update-pass/:pass")
  @Use(JwtMiddleware)
  async updatePass(@MultipartFile("file")file:PlatformMulterFile,@PathParams("pass")pass:string,@Req()req:Req){
    return await this.userService.updatePassword(req.user!._id!,pass);
  }
}
