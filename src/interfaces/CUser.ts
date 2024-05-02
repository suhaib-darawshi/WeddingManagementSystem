import { Ref } from "@tsed/mongoose";
import { Category } from "../models/CategoryModel";

export interface CUser{
    _id: string;
    username:string;
    phone:{country:string,number:string};
    password:string;
    gender:string;
    status:boolean;
    order_status:string;
    logo: string;
    role:string;
    email: string;
    latitude: number;
    longitude: number;
    marriageDate:Date;
    field: string;
    user:any;
    createdByEmail:boolean;
    location:string;
    marriageCalc:any;
    category:Ref<Category>
}