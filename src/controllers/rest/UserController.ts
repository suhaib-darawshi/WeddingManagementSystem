import {Controller, Inject} from "@tsed/di";
import { UserService } from "../../services/UserService";
import { Delete, Get, Post, Put } from "@tsed/schema";
import { BodyParams, MultipartFile, PathParams, PlatformMulterFile, Req, Use, UseAuth } from "@tsed/common";
import { User } from "../../models/UserModel";
import { JwtMiddleware } from "../../middlewares/JwtMiddleware";
import { BadRequest, Unauthorized } from "@tsed/exceptions";
import { CUser } from "../../interfaces/CUser";
import { SProviderService } from "../../services/SProviderService";
import { Rating } from "../../models/RatingModel";
import { ServiceService } from "../../services/ServiceService";

@Controller("/user")
export class UserController {
  constructor(@Inject(ServiceService)private serviceService:ServiceService,@Inject(UserService) private userService: UserService,@Inject(SProviderService)private sproviderService:SProviderService){}

  @Get("/provider/:id")
  @Use(JwtMiddleware)
  async getProviderProfile(@PathParams("id")id:string){
    return await this.sproviderService.getProvider(id);
  }
  @Get("/profile")
  @Use(JwtMiddleware)
  async getUserProfile(@Req()req:Req){
    return await this.userService.loginByAuth(req.user!._id!);
  }
  @Post("/signin")
  signIn(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()user:CUser){
    return this.userService.signin(user);
  }
  @Post("/signup")
  signup(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()user:CUser){
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
  @Put("/create-by-email")
  createByEmail(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()user:any){
    try {
      user.phone = JSON.parse(user.phone);
    } catch (e) {

    }
    return this.userService.createByEmail(user,file);
  }

  @Post("/:id/update")
  @Use(JwtMiddleware)
  updateProfile(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()user:any,@PathParams("id")id:string,@Req() req:Req){
    if(req.user?._id!=id){
      throw new Unauthorized("TOKEN_NOT_VALID");
    }
    try{
      user.phone=JSON.parse(user.phone);
    }
    catch{}
    return this.userService.updateProfile(id,user,file);
  }
  @Put("/marriage-date")
  @Use(JwtMiddleware)
  async putMarriageDate(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()user:any,@Req() req:Req){
    return await this.userService.updateMarriageDate(req.user!._id,user.date);
  }
  @Post("/marriage-calc")
  @Use(JwtMiddleware)
  async updateMarriageCalc(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()user:any,@Req() req:Req){
    try{
      user=JSON.parse(user);

    }catch{}
    return await this.userService.updateMarriageCalc(req.user!._id,user);
  }
  @Post("/forget")
  forgetPassword(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()phone:{country:string,number:string}){
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
  @Put("/rate/:orderId")
  @Use(JwtMiddleware)
  rateService(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()rating:Rating,@PathParams("orderId")orderId:string){
    return this.serviceService.RateService(rating,orderId);
  }
  @Get("/categories")
  getCategories(){
    return this.userService.getCategories();
  }
  @Put("/favorite/:service")
  @Use(JwtMiddleware)
  addToFavourites(@MultipartFile("file")file:PlatformMulterFile,@PathParams("service")service:string,@Req()req:Req){
    return this.userService.addToFavorite(req.user?._id??"",service);
  }
  @Delete("/favorite/:service")
  @Use(JwtMiddleware)
  deleteFavourites(@MultipartFile("file")file:PlatformMulterFile,@PathParams("service")service:string,@Req()req:Req){
    return this.userService.deleteFromFavorite(req.user?._id??"",service);
  }
  
}
