import { Inject, InjectorService } from "@tsed/di";
import { MongooseModel } from "@tsed/mongoose";
import {IO, Nsp, Socket, SocketService, SocketSession} from "@tsed/socketio";
import * as SocketIO from "socket.io";
import { User } from "./../models/UserModel";
import { ChatService } from "./ChatService";
import { NotificationService } from "./NotificationService";
interface Client {
    sensors:string[]
    id: string;
  }
  
@SocketService("socket")
export class CustomSocketService {
  
    @Nsp nsp: SocketIO.Namespace;
    private clients: Map<string, SocketIO.Socket> = new Map();
  @Nsp("/")
  nspOther: SocketIO.Namespace; 

  constructor(
    @IO() private io: SocketIO.Server,
    @Inject(User)private userModel:MongooseModel<User>,
    // @Inject(ChatService)private chatService:ChatService,
    private injector: InjectorService,
    @Inject(NotificationService)private notService:NotificationService
    ) {}
  setIo(io:SocketIO.Server){
    this.io=io;
  }
  $onNamespaceInit(nsp: SocketIO.Namespace) {}
  $onConnection(@Socket socket: SocketIO.Socket, @SocketSession session: SocketSession) {
    socket.on("setId", (data: Client) => {
      this.clients.set(data.id, socket);
  });
    socket.on("open chat", async(data: any) => {
      try{
        const chatService = this.injector.get<ChatService>(ChatService);
        await chatService!.setChatAsRead(data.user,data.chat);
      } catch(e){
        
      }
  });
    socket.on("open nots", async(data: any) => {
      try{
        await this.notService.setNotsAsSeen(data.user);
      } catch(e){
        
      }
  });
  }
  $onDisconnect(@Socket socket: SocketIO.Socket) {
    this.clients.forEach((sockett, id) =>{
        if(socket.id==sockett.id){
            this.clients.delete(id);
            console.log(`${id} has disconnected`);
        }
    });
  }
  sendEventToClient(id: string, data: any,event:string) {
    const client = this.clients.get(id);
    if (client) {
      try{
        client.emit(event, data);
      }
      catch( e){

      }
      return id;
    }
    
  }
}
