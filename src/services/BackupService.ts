import { Inject, Injectable } from "@tsed/common";
import { MongooseModel, MongooseService, getSchema } from "@tsed/mongoose";
import { Model } from "mongoose";
import { User } from "../models/UserModel";
import * as mongoose from 'mongoose';
import { ServiceProvider } from "../models/ServiceProviderModel";
import { Chat } from "../models/ChatModel";
import { Message } from "../models/MessageModel";
import { Rating } from "../models/RatingModel";
import { Order } from "../models/OrderModel";
import { Notification } from "../models/NotificationModel";
import * as cron from "node-cron";
import { Service } from "../models/ServiceModel";
import { Category } from "../models/CategoryModel";
import { Address } from "../models/AddressModel";
import { Gallery } from "../models/GalleryModel";
import { Favorite } from "../models/FavoriteModel";
@Injectable()
export class BackupService {
    
    private cloudDb;
  constructor(private mongooseService: MongooseService,
    @Inject(User)private userModel:MongooseModel<User>,
    @Inject(ServiceProvider)private sproviderModel:MongooseModel<ServiceProvider>,
    @Inject(Chat)private chatModel:MongooseModel<Chat>,
    @Inject(Message)private messageModel:MongooseModel<Message>,
    @Inject(Rating)private ratingModel:MongooseModel<Rating>,
    @Inject(Order)private orderModel:MongooseModel<Order>,
    @Inject(Notification)private notificationModel:MongooseModel<Notification>,
    @Inject(Category)private categoryModel:MongooseModel<Category>,
    @Inject(Address)private addressModel:MongooseModel<Address>,
    @Inject(Gallery)private galleryModel:MongooseModel<Gallery>,
    @Inject(Favorite)private favoriteModel:MongooseModel<Favorite>

    ) {
        cron.schedule("0 0 * * *",this.performBackup.bind(this));
     this.cloudDb = mongoose.createConnection('mongodb+srv://rafeed1sa:JCrIH9AY75E1R6Pq@rafeed.wx7a2zc.mongodb.net/?retryWrites=true&w=majority&appName=Rafeed');
    // this.userModel = this.mongooseService.get("default")!.model("User");
    // this.backupUserModel = this.mongooseService.get("backup")!.model("User", User);   // backup database
  }

  async performBackup() {
    const lastBackupDate = new Date(Date.now() - (1000 * 60 * 60 * 24));

    await this.performBulkUpdate(this.messageModel, this.cloudDb.model('Message', getSchema(Message)), lastBackupDate);
    await this.performBulkUpdate(this.chatModel, this.cloudDb.model('Chat', getSchema(Chat)), lastBackupDate);
    await this.performBulkUpdate(this.messageModel, this.cloudDb.model('Service', getSchema(Service)), lastBackupDate);
    await this.performBulkUpdate(this.ratingModel, this.cloudDb.model('Rating', getSchema(Rating)), lastBackupDate);
    await this.performBulkUpdate(this.orderModel, this.cloudDb.model('Order', getSchema(Order)), lastBackupDate);
    await this.performBulkUpdate(this.notificationModel, this.cloudDb.model('Notification', getSchema(Notification)), lastBackupDate);
    await this.performBulkUpdate(this.userModel, this.cloudDb.model('User', getSchema(User)), lastBackupDate);
    await this.performBulkUpdate(this.sproviderModel, this.cloudDb.model('ServiceProvider', getSchema(ServiceProvider)), lastBackupDate);
    await this.performBulkUpdate(this.categoryModel, this.cloudDb.model('Category', getSchema(Category)), lastBackupDate);
    await this.performBulkUpdate(this.addressModel, this.cloudDb.model('Address', getSchema(Address)), lastBackupDate);
    await this.performBulkUpdate(this.galleryModel, this.cloudDb.model('Gallery', getSchema(Gallery)), lastBackupDate);
    await this.performBulkUpdate(this.favoriteModel, this.cloudDb.model('Favorite', getSchema(Favorite)), lastBackupDate);

    console.log('Backup completed successfully');
}

async performBulkUpdate(localModel: Model<any>, 
    cloudModel: Model<any>, 
    lastBackupDate: Date) {
    const itemsToUpdate = await localModel.find({
        updatedAt: { $gt: lastBackupDate }
    }).lean();

    const bulkOps = itemsToUpdate.map(item => ({
        updateOne: {
            filter: { _id: item._id },
            update: item,
            upsert: true
        }
    }));

    if (bulkOps.length > 0) {
        await cloudModel.bulkWrite(bulkOps);
    }
}
}

