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
    role:string
  }
  
@SocketService("socket")
export class CustomSocketService {
  
    @Nsp nsp: SocketIO.Namespace;
    private clients: Map<string, SocketIO.Socket[]> = new Map();
    private customers:SocketIO.Socket[]=[];
    private providers:SocketIO.Socket[]=[];
    private admins:SocketIO.Socket[]=[];
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
    console.log("connected")
    socket.on("setId", (data: Client) => {
      if (!this.clients.has(data.id)){
        this.clients.set(data.id, [socket]);
      }
      else{
        let cls=this.clients.get(data.id)!;
        cls.push(socket);
        this.clients.set(data.id,cls);
      }
      switch(data.role){
        case "CUSTOMER":
          this.customers.push(socket);
          break;
        case "PROVIDER":
          this.providers.push(socket);
          break;
        case "ADMIN":
          this.admins.push(socket);
          break;
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
      console.log("services: "+services);
      console.log(this.clients.size);
      console.log(socket.id)
      this.clients.forEach((socketA, id) =>{
        for(const sockett of  socketA){
          console.log(socket.id)
          if(socket.id==sockett.id){
            console.log("true");
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
    for(const i of this.admins){
      if(socket.id==i.id){
        this.admins = this.admins.filter(admin => admin.id !== socket.id);
      }
    }
    for(const i of this.customers){
      if(socket.id==i.id){
        this.customers = this.customers.filter(admin => admin.id !== socket.id);
      }
    }
    for(const i of this.providers){
      if(socket.id==i.id){
        this.providers = this.providers.filter(admin => admin.id !== socket.id);
      }
    }
  }
  onNewCustomer(user:any){
    for(const socket of this.admins){
      try{
        socket.emit("New Customer", user);
      }
      catch(e){
  
      }
    }
  }
  onNewNotification(data:any){
    if(data['type']!="PROVIDER"){
      for(const socket of this.customers){
        try{
          socket.emit("New Notification", data);
        }
        catch(e){
    
        }
      }
    }
    if(data['type']!="CUSTOMER"){
      for(const socket of this.providers){
        try{
          socket.emit("New Notification", data);
        }
        catch(e){
    
        }
      }
    }
  }
  onNewProvider(provider:any){
    for(const socket of this.admins){
      try{
        socket.emit("New Provider", provider);
      }
      catch(e){
  
      }
    }
    for(const socket of this.customers){
      try{
        socket.emit("New Provider", provider);
      }
      catch(e){
  
      }
    }
  }
  onNewCategory(category:any){
    for(const socket of this.customers){
      try{
        socket.emit("New Category", category);
      }
      catch(e){
  
      }
    }
    for(const socket of this.providers){
      try{
        socket.emit("New Category", category);
      }
      catch(e){
  
      }
    }
    for(const socket of this.admins){
      try{
        socket.emit("New Category", category);
      }
      catch(e){
  
      }
    }
  }
  onNewService(service:any) {
    for(const socket of this.customers){
      try{
        socket.emit("New Service", service);
      }
      catch(e){
  
      }
    }
    for(const socket of this.admins){
      try{
        socket.emit("New Service", service);
      }
      catch(e){
  
      }
    }
  }
  onNewOrder(order:any){
    for(const socket of this.admins){
      try{
        socket.emit("New Order", order);
      }
      catch(e){
  
      }
    }
  }
  onNewAd(data:any){
    for(const socket of this.customers){
      try{
        socket.emit("Ads Updated", data);
      }
      catch(e){
  
      }
    }
    for(const socket of this.admins){
      try{
        socket.emit("Ads Updated", data);
      }
      catch(e){
  
      }
    }
  }
  onOrderUpdated(data:any){
    for(const socket of this.admins){
      try{
        socket.emit("Order Updated", data);
      }
      catch(e){
  
      }
    }
  }
  sendEventToClient(id: string, data: any,event:string) {
    const client = this.clients.get(id);
    console.log(data);
    if(event.includes("rder")){
      this.onOrderUpdated(data);
    }
    if (client) {
      for(const sockett of  client){
        try{
          console.log("emited");
          sockett.emit(event, data);
        }
        catch(e){
  
        }
      }
      
      return id;
    }
    
  }
}
