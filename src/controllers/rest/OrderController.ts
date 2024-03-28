import { BodyParams, MultipartFile, PathParams, PlatformMulterFile, Req } from "@tsed/common";
import {Controller, Inject} from "@tsed/di";
import { Use } from "@tsed/platform-middlewares";
import {Get, Post, Put} from "@tsed/schema";
import { JwtMiddleware } from "../../middlewares/JwtMiddleware";
import { Order } from "../../models/OrderModel";
import { UserService } from "../../services/UserService";
import { BookingService } from "../../services/BookingService";

@Controller("/order")
export class OrderController {
  constructor(@Inject(UserService)private userService:UserService,@Inject(BookingService)private bookingService:BookingService){}
  @Get("/")
  get() {
    return "hello";
  }
  @Put("/create/:service")
  @Use(JwtMiddleware)
  async createOrder(@MultipartFile("file")file:PlatformMulterFile,@PathParams("service")service:string,@BodyParams()order:Partial<Order>,@Req()req:Req){
    return await this.userService.bookService(order,service,req.user?._id!);
  }
  @Post("/:id/accept")
  @Use(JwtMiddleware)
  async acceptOrder(@MultipartFile("file")file:PlatformMulterFile,@PathParams("id")order:string,@Req()req:Req){
    return await this.bookingService.acceptOrder(order,req.user!._id!)
  }
  @Post("/:id/reject")
  @Use(JwtMiddleware)
  async rejectOrder(@MultipartFile("file")file:PlatformMulterFile,@PathParams("id")order:string,@Req()req:Req){
    return await this.bookingService.rejecttOrder(order,req.user!._id!)
  }
}
