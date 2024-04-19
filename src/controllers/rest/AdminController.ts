import { BodyParams, MultipartFile, PathParams, PlatformMulterFile, Use } from "@tsed/common";
import {Controller, Inject} from "@tsed/di";
import {Delete, Get, Post, Put} from "@tsed/schema";
import { AdminMiddleware } from "../../middlewares/AdminMiddleware";
import { Category } from "../../models/CategoryModel";
import { AdminService } from "../../services/AdminService";
import { CUser } from "src/interfaces/CUser";
import { log } from "console";

@Controller("/admin")
export class AdminController {
  constructor(@Inject(AdminService)private adminService:AdminService){}
  @Get("/")
  get() {
    return "hello";
  }
  @Put("/category")
  @Use(AdminMiddleware)
  createCategory(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()category:Category){
    return this.adminService.createCategory(category,file);
  }
  @Post("/category/update")
  @Use(AdminMiddleware)
  updateCategory(@MultipartFile("file")file:PlatformMulterFile,@BodyParams() category:Category){
    return this.adminService.updateCategory(category);
  }
  @Delete("/category/:id")
  @Use(AdminMiddleware)
  deleteCategory(@PathParams("id") id:string){
    return this.adminService.deleteCategory(id);
  }
  @Put("/users/create")
  @Use(AdminMiddleware)
  createUser(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()user:any){
    try {
      user.phone = JSON.parse(user.phone);
    } catch (e) {

    }
    return this.adminService.createUser(user,file);
  }
  @Post("/users/update")
  @Use(AdminMiddleware)
  updateUser(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()user:any){
    try {
      user.phone = JSON.parse(user.phone);
    } catch (e) {

    }
    console.log(user);
    return this.adminService.updateUser(user)
  }
  @Delete("/users/:id")
  @Use(AdminMiddleware)
  deleteUser(@PathParams("id")id:string){
    return this.adminService.deleteUser(id);
  }
  @Put("/providers")
  @Use(AdminMiddleware)
  create(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()user:any){
    try{
      user.phone=JSON.parse(user.phone);
    }
    catch(e){

    }
    
  }
}
