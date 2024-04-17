import { BodyParams, MulterOptions, MultipartFile, PathParams, PlatformMulterFile, Req, Use } from "@tsed/common";
import {Controller, Inject} from "@tsed/di";
import { BadRequest, Unauthorized } from "@tsed/exceptions";
import {Delete, Get, Post, Put} from "@tsed/schema";
import { JwtMiddleware } from "../../middlewares/JwtMiddleware";
import { SProviderService } from "../../services/SProviderService";
import { Service } from "../../models/ServiceModel";
import { CUser } from "../../interfaces/CUser";
import { Gallery } from "../../models/GalleryModel";
import { Address } from "../../models/AddressModel";

@Controller("/s-provider")
export class SProviderController {
  constructor(@Inject(SProviderService)private sproviderService:SProviderService){}
  @Get("/")
  get() {
    return "hello";
  }
  @Put("/create")
  @Use(JwtMiddleware)
  async create(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()user:any,@BodyParams("key")key:string,@Req() req:Req){
    if(req.user!.password!=key){
      throw new BadRequest('The provided key is incorrect.');
    }
    if (!file) {
      throw new BadRequest("No File Provided")
    }
    try {
      user.phone = JSON.parse(user.phone);
    } catch (e) {
      throw new BadRequest("Invalid user data");
    }
    return await this.sproviderService.createAccount(user,file);
  }
  @Put("/:id/service/add")
  @Use(JwtMiddleware)
  async createService(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()service:any,@Req() req:Req,@PathParams("id")id:string){
    if(req.user!._id!=id){
      throw new Unauthorized("Unauthorized")
    }
    if (!file) {
      throw new BadRequest("No File Provided")
    }
    try{
      service.cities=JSON.parse(service.cities);
      service.objectives=JSON.parse(service.objectives);
    }catch(e){

    }
    return await this.sproviderService.createService(service,id,file);
  }
  @Post("/signup")
  signup(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()user:CUser){
    return this.sproviderService.signup(user);
  }
  @Put("/add-work")
  @Use(JwtMiddleware)
  addWork(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()work:Gallery){
    work.type="URL"
    if(file){
      work.type="IMAGE";
    }
    return this.sproviderService.addWork(work,file);
  }
  @Post("/update-state/:state")
  @Use(JwtMiddleware)
  updateState(@MultipartFile("file")file:PlatformMulterFile,@Req() req:Req,@PathParams("state")state:string){
    if(!req.user?._id){
      throw new Unauthorized("User Not Found");
    }
    if(state=="activate"){
      return this.sproviderService.updateProviderStatus(req.user._id,"ACTIVE");
    }
    else if(state=="deactivate"){
      return this.sproviderService.updateProviderStatus(req.user._id,"INACTIVE");
    }
    throw new BadRequest("Invalid State Parameter");
  }
  @Post("/update-service-state/:id/:state")
  @Use(JwtMiddleware)
  async updateServiceState(@MultipartFile("file")file:PlatformMulterFile,@Req()req:Req,@PathParams("id")id:string,@PathParams("state")state:string){
    if(state=="activate"){
      return this.sproviderService.updateServiceStatus(id,"ACTIVE");
    }
    else if(state=="deactivate"){
      return this.sproviderService.updateServiceStatus(id,"INACTIVE");
    }
    throw new BadRequest("Invalid State Parameter");

  }
  @Post("/update-service/:id")
  @Use(JwtMiddleware)
  async updateService(@MultipartFile("file")file:PlatformMulterFile,@Req()req:Req,@PathParams("id")id:string,@BodyParams()service:Service){
    return await this.sproviderService.updateService(id,service,file);
  }

  @Delete("/delete-service/:id")
  @Use(JwtMiddleware)
  async deleteService(@Req() req:Req,@PathParams("id")id:string){
    return this.sproviderService.deleteService(id);
  }
  @Post("/update")
  @Use(JwtMiddleware)
  updateAccount(@MultipartFile("file")file:PlatformMulterFile,@Req()req:Req,@BodyParams()user:CUser){
    if(!req.user?._id){
      throw new Unauthorized("User Not Found");
    }
    return this.sproviderService.updateAccount(req.user._id,user,file);
  }
  @Put("/add-address")
  @Use(JwtMiddleware)
  addAddress(@MultipartFile("file")file:PlatformMulterFile,@PathParams('id') id:string,@BodyParams()address:Address,@Req()req:Req){
    if(!req.user?._id) throw new Unauthorized("user  not found");
    return this.sproviderService.addAddres(id,address);
  }
}
