import { Inject, InjectorService } from "@tsed/di";
import { MongooseModel } from "@tsed/mongoose";
import {IO, Nsp, Socket, SocketService, SocketSession} from "@tsed/socketio";
import * as SocketIO from "socket.io";
import { User } from "./../models/UserModel";
import { ChatService } from "./ChatService";
import { NotificationService } from "./NotificationService";
import { ServiceService } from "./ServiceService";
interface Client {
    id: string;
  }
  
@SocketService("socket")
export class CustomSocketService {
  
    @Nsp nsp: SocketIO.Namespace;
    private clients: Map<string, SocketIO.Socket[]> = new Map();
  @Nsp("/")
  nspOther: SocketIO.Namespace; 

  constructor(
    @IO() private io: SocketIO.Server,
    private injector: InjectorService,
    ) {}
  setIo(io:SocketIO.Server){
    this.io=io;
  }
  $onNamespaceInit(nsp: SocketIO.Namespace) {}
  $onConnection(@Socket socket: SocketIO.Socket, @SocketSession session: SocketSession) {
    socket.on("setId", (data: Client) => {
      if (!this.clients.has(data.id)){
        this.clients.set(data.id, [socket]);
      }
      else{
        let cls=this.clients.get(data.id)!;
        cls.push(socket);
        this.clients.set(data.id,cls);
      }
  });
    socket.on("open chat", async(data: any) => {
      try{
        const chatService = this.injector.get<ChatService>(ChatService);
        await chatService!.setChatAsRead(data.user,data.chat);
      } catch(e){
        
      }
  });
    socket.on("search",async(data:any)=>{
      const serviceService=this.injector.get<ServiceService>(ServiceService)!;
      const services=await serviceService.searchService(data);
      this.clients.forEach((socketA, id) =>{
        for(const sockett of  socketA){
          if(socket.id==sockett.id){
            this.sendEventToClient(id,services, "search results");
        }
        }
    });
    })
    socket.on("open nots", async(data: any) => {
      try{
        const notService=this.injector.get<NotificationService>(NotificationService)!;
        await notService.setNotsAsSeen(data.user);
      } catch(e){
        
      }
  });
  }
  $onDisconnect(@Socket socket: SocketIO.Socket) {
    this.clients.forEach((socketA, id) =>{
        
          for(const sockett of  socketA){
            if(socket.id==sockett.id){
              this.clients.delete(id);
            console.log(`${id} has disconnected`);
          }
        }
            
        
    });
  }
  sendEventToClient(id: string, data: any,event:string) {
    const client = this.clients.get(id);
    if (client) {
      for(const sockett of  client){
        try{
          sockett.emit(event, data);
        }
        catch(e){
  
        }
      }
      
      return id;
    }
    
  }
}
