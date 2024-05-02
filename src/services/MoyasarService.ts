import {Injectable} from "@tsed/di";
import axios from "axios"
@Injectable()

export class MoyasarService {
    async getPaymentInfo(paymentId:string){
        const url = `https://api.moyasar.com/v1/payments/${paymentId}`;
        try {
            const response = await axios.get(url, {
                auth: {
                    username: process.env.MOYASAR_SECRET!,
                    password: ''
                }
            });
            console.log(response.data);
            return response;
        } catch (error) {
            console.error('Error fetching payment info:', error);
            return null;
        }
    }
    async refundPayment(paymentId:string,amount:number){
        const url = `https://api.moyasar.com/v1/payments/${paymentId}/refund`
        try {
            const response = await axios.post(url,{ amount }, {
                auth: {
                    username: process.env.MOYASAR_SECRET!,
                    password: ''
                }
            });
            console.log(response.data);
            return response;
        } catch (error) {
            console.error('Error refunding payment:', error);
            return null;
        }
    }
   
}
