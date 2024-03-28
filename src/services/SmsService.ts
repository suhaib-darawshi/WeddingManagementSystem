import {Injectable} from "@tsed/di";
import axios from "axios"
@Injectable()
export class SmsService {
    async sendVerification(phone: string, code: string) {
        try{
            const response = await axios.post(process.env.SMS_URL!,{
                userName:process.env.SMS_USERNAME,
                apiKey:process.env.SMS_API_KEY,
                numbers:[phone],
                userSender:process.env.SMS_SENDER,
                msg:`رمز التحقق هو : ${code}`,
                msgEncoding:"windows-1256"});
                return response;
        }catch(err){
            console.log("error", err);
        }
        
    }
}
