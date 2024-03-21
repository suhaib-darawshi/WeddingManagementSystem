import { BodyParams, MultipartFile, PathParams, PlatformMulterFile, Req, Use } from "@tsed/common";
import {Controller, Inject} from "@tsed/di";
import { BadRequest, Unauthorized } from "@tsed/exceptions";
import {Get, Post, Put} from "@tsed/schema";
import { JwtMiddleware } from "../../middlewares/JwtMiddleware";
import { SProviderService } from "../../services/SProviderService";
import { ServiceProvider } from "../../models/ServiceProviderModel";
import { Service } from "../../models/ServiceModel";
import * as fs from 'fs';
import * as path from 'path';
import { UploadMiddleware } from "src/middlewares/UploadMiddleware";

@Controller("/s-provider")
export class SProviderController {
  constructor(@Inject(SProviderService)private sproviderService:SProviderService){}
  @Get("/")
  get() {
    return "hello";
  }
  @Put("/create")
  @Use(JwtMiddleware)
  async create(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()user:ServiceProvider,@BodyParams("key")key:string,@Req() req:Req){
    if(req.user!.password!=key){
      throw new BadRequest('The provided key is incorrect.');
    }
    if (!file) {
      throw new BadRequest("No File Provided")
    }
    return await this.sproviderService.createAccount(user,file);
  }
  @Put("/:id/service/add")
  @Use(JwtMiddleware)
  async createService(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()service:Service,@Req() req:Req,@PathParams("id")id:string){
    if(req.user!._id!=id){
      throw new Unauthorized("Unauthorized")
    }
    if (!file) {
      throw new BadRequest("No File Provided")
    }
    return await this.sproviderService.createService(service,id,file);
  }
  @Post("/signup")
  signup(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()user:ServiceProvider){
    return this.sproviderService.signup(user);
  }
}
