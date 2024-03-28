import {Injectable} from "@tsed/di";
import axios from 'axios';
@Injectable()
export class TapPaymentService {
    private readonly baseUrl = 'https://api.tap.company/v1'; 
    private readonly apiKey: string;
    private readonly apiSecret: string;
    constructor(){
        this.apiKey=process.env.TAP_API_KEY!;
        this.apiSecret=process.env.TAP_SECRET!;
    }
    
}
