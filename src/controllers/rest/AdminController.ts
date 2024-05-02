import { BodyParams, MultipartFile, PathParams, PlatformMulterFile, Req, Res, Use } from "@tsed/common";
import {Controller, Inject} from "@tsed/di";
import {Delete, Get, Post, Put} from "@tsed/schema";
import { AdminMiddleware } from "../../middlewares/AdminMiddleware";
import { Category } from "../../models/CategoryModel";
import { AdminService } from "../../services/AdminService";
import { GNotification } from "../../models/GNotificationModel";

@Controller("/admin")
export class AdminController {
  constructor(@Inject(AdminService)private adminService:AdminService){}
  @Get("/")
  get() {
    return "hello";
  }
  @Post("/get-cloud")
  @Use(AdminMiddleware)
  async fetchHistory(@MultipartFile("file") file: PlatformMulterFile,@Req()req:Req,@Res()res:Res,@BodyParams("orders")orders:string[]){
    res.setHeader('Content-Disposition', 'attachment; filename="orders.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    const xfile= await this.adminService.getOrdersFile(orders);
    return xfile;
  }
  @Put("/category")
  // @Use(AdminMiddleware)
  createCategory(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()category:Category){
    return this.adminService.createCategory(category,file);
  }
  @Post("/category/update")
  @Use(AdminMiddleware)
  updateCategory(@MultipartFile("file")file:PlatformMulterFile,@BodyParams() category:Category){
    return this.adminService.updateCategory(category,file);
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
  create(@MultipartFile("file")file:PlatformMulterFile,@MultipartFile("file2")file2:PlatformMulterFile,@BodyParams()user:any){
    try{
      user.phone=JSON.parse(user.phone);
    }
    catch(e){

    }
    return this.adminService.createProvider(user,file);
  }
  @Post("/providers/update")
  @Use(AdminMiddleware)
  async updateProvide(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()user:any){
    try{
      user.phone=JSON.parse(user.phone);
    }
    catch(e){

    }
    return this.adminService.updateProvider(user);
  }
  @Put("/ads")
  @Use(AdminMiddleware)
  createAds(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()ad:any){
    return this.adminService.addAds(ad,file);
  } 
  @Delete("/ad/:id")
  @Use(AdminMiddleware)
  deleteAds(@PathParams("id")id:string){
    return this.adminService.deleteAds(id);
  } 
  @Put("/notifications")
  @Use(AdminMiddleware)
  createNotification(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()notification:GNotification){
    return this.adminService.createGNot(notification,file);
  }
  @Delete("/notifications/:id")
  @Use(AdminMiddleware)
  deleteNot(@PathParams("id")id:string){
    return this.adminService.deleteNot(id);
  }
  @Delete("/providers/:id")
  @Use(AdminMiddleware)
  async removeProv(@PathParams("id")id:string){
   return await this.adminService.deleteProvider(id);
  }
}
