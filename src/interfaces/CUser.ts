
export interface CUser{
    _id: string;
    username:string;
    phone:{country:string,number:string};
    password:string;
    gender:string;
    logo: string;
    role:string;
    email: string;
    latitude: number;
    longitude: number;
    field: string;
    user:any;
}