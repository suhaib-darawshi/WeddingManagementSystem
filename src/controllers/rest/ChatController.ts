import { BodyParams, MultipartFile ,PathParams,PlatformMulterFile, Req, Use} from "@tsed/common";
import {Controller, Inject} from "@tsed/di";
import {Get, Post, Put} from "@tsed/schema";
import { Message } from "../../models/MessageModel";
import { JwtMiddleware } from "../../middlewares/JwtMiddleware";
import { ChatService } from "../../services/ChatService";
import { Unauthorized } from "@tsed/exceptions";

@Controller("/chat")
export class ChatController {
  constructor(@Inject(ChatService)private chatService:ChatService){}
  @Put("/:id/message")
  @Use(JwtMiddleware)
  async message(@MultipartFile("file")file:PlatformMulterFile,@PathParams("id")id:string,@BodyParams()message:Message,@Req()req:Req){
    if(req.user!._id!=id){
      throw new Unauthorized("Unauthorized")
    }
    return this.chatService.handleMessage(id,message,file);
  }
  @Get("/:id/get")
  @Use(JwtMiddleware)
  async getUserChats(@MultipartFile("file")file:PlatformMulterFile,@PathParams("id")id:string){
    return await this.chatService.getUserChats(id);
  }
}
