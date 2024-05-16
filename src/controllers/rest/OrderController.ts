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
  @Post("/:id/cancel")
  @Use(JwtMiddleware)
  cancelOrder(@MultipartFile("file")file:PlatformMulterFile,@PathParams("id")id:string){
    return this.userService.cancelOrder(id);
  }
  @Post("/:id/complete")
  @Use(JwtMiddleware)
  completeOrder(@MultipartFile("file")file:PlatformMulterFile,@PathParams("id")id:string,@Req()req:Req){
    return this.bookingService.completeOrder(id,req.user!._id);
  }
  @Put("/:id/tip")
  @Use(JwtMiddleware)
  putTip(@MultipartFile("file")file:PlatformMulterFile,@PathParams("id")id:string,@BodyParams()tip:{value:number,id:string}){
    return this.bookingService.putTip(id,tip);
  }
}
