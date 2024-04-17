import {Inject, Injectable, Service} from "@tsed/di";
import { Chat } from "../models/ChatModel";
import { MongooseModel } from "@tsed/mongoose";
import { Message } from "../models/MessageModel";
import { NotificationService } from "./NotificationService";
import { User } from "../models/UserModel";
import mongoose, { ObjectId } from "mongoose";
import { CustomSocketService } from "./CustomSocketService";
import { PlatformMulterFile } from "@tsed/common";
import * as fs from 'fs';
import * as path from 'path';
import { BadRequest } from "@tsed/exceptions";
import { ServiceProvider } from "../models/ServiceProviderModel";
@Service()
@Injectable()
export class ChatService {
    constructor(
        @Inject(Chat)private chatModel:MongooseModel<Chat>,
        @Inject(Message)private messageModel:MongooseModel<Message>,
        @Inject(NotificationService)private notService:NotificationService,
        @Inject(CustomSocketService)private socket:CustomSocketService,
        @Inject(User)private userModel:MongooseModel<User>,
        @Inject(ServiceProvider)private sproviderModel:MongooseModel<ServiceProvider>
        ){}
        async createNewChat(users:any[]){
            return await this.chatModel.create({users:users})
        }
        
        async createMessage(chatId:ObjectId,message : Partial<Message>){
            const chat=await this.chatModel.findById(chatId);
            if(!chat){
                return false;
            }
            const msg = await this.messageModel.create(message);
            chat.messages.push(msg);
            await chat.save();
            
            this.socket.sendEventToClient(message.receiver_id!.toString(),chat,"New Chat")
            return chat;
        }
        async getUserChats(userId: string) {
            const chats= await this.chatModel.find({ "users": userId }).populate([
            {
                path:"messages",
                model:"Message",
                options: { sort: { createdAt: -1 }}
            }
        ]);
        for(const chat of chats){
            const users=chat.users;
            chat.users=[];
            for(const user of chats){
                let u=await this.userModel.findById(user,{password:0});
                if(!u){
                    u=await this.sproviderModel.findById(user,{password:0});
                }
                if(u){
                    chat.users.push(u)
                }
            }
        }
        return chats;
        }
        async setChatAsRead(userId:string,chatId:string){
            const chat=await this.chatModel.findById(chatId).populate({path:"messages",model:"Message"});
            if(chat){
                for(const message of (chat.messages as Message[])){
                    message.is_seen=true;
                }
                await chat.save();
            }
        }
        
        async handleMessage(sender:string,message:Partial<Message>,file:PlatformMulterFile){
            const senderId=new mongoose.Types.ObjectId(sender);
            let chat=await this.chatModel.findOne({$or:[
                {users:[senderId,new mongoose.Types.ObjectId(message.receiver_id?.toString())]},
                {users:[new mongoose.Types.ObjectId(message.receiver_id?.toString()),senderId]}
            ]}).exec();
            if(!chat){
                chat =await this.createNewChat([senderId,new mongoose.Types.ObjectId(message.receiver_id?.toString())]);
            }
            const msg=await this.messageModel.create(message);
            if(message.type=="IMAGE"){
                if (file) {
                    const originalExtension = path.extname(file.originalname)
                    const uploadsDir = path.join( 'public', 'uploads', 'chats',chat._id.toString());
                    if (!fs.existsSync(uploadsDir)) {
                        fs.mkdirSync(uploadsDir, { recursive: true });
                    }
                    const targetPath = path.join(uploadsDir, msg._id.toString()+originalExtension);
                    fs.writeFileSync(targetPath, file.buffer);
                    msg.message = path.join('public','uploads', 'chats',chat._id.toString(), msg._id.toString()+originalExtension);
                    await msg.save();
                  }
                  else{
                    throw new BadRequest("No Image Provided");
                  }
            }
            chat!.messages.push(msg);
            await chat.save();
            this.socket.sendEventToClient(message.receiver_id!.toString(),{message:msg,chat:chat._id!},"New Message");
            return chat.populate([{path:"messages"},{path:"users",select:"-password"}]);
        }
    
}
