import { BodyParams, MultipartFile, PlatformMulterFile, Use } from "@tsed/common";
import {Controller, Inject} from "@tsed/di";
import {Get, Put} from "@tsed/schema";
import { AdminMiddleware } from "../../middlewares/AdminMiddleware";
import { Category } from "../../models/CategoryModel";
import { AdminService } from "../../services/AdminService";

@Controller("/admin")
export class AdminController {
  constructor(@Inject(AdminService)private adminService:AdminService){}
  @Get("/")
  get() {
    return "hello";
  }
  @Put("/category")
  // @Use(AdminMiddleware)
  createCategory(@MultipartFile("file")file:PlatformMulterFile,@BodyParams()category:Category){
    return this.adminService.createCategory(category,file);
  }
}
