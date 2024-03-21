import {Inject, Injectable} from "@tsed/di";
import { Service } from "../models/ServiceModel";
import { MongooseModel } from "@tsed/mongoose";
@Injectable()
export class ServiceService {
    constructor(@Inject(Service)private serviceModel:MongooseModel<Service>){}
    async createService(service: Partial<Service>) {
        return await this.serviceModel.create(service);
    }
}
