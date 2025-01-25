import {Controller, Inject} from "@tsed/di";
import { BodyParams } from "@tsed/platform-params";
import {Get, Post} from "@tsed/schema";
import { CustomSocketService } from "src/services/CustomSocketService";

@Controller("/hello")
export class HelloController {
  constructor(@Inject(CustomSocketService)private soc:CustomSocketService){}
  @Get("/")
  get() {
    return "hello";
  }
  @Post("/")
  post(@BodyParams("title")title:string,@BodyParams("content")content:string) {
    this.soc.sendEventToClient("id",{"content":content,"title":title},"fromserver");
  }
}
