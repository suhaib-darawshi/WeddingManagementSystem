import {Injectable} from "@tsed/di";
import axios from "axios"
@Injectable()
export class SmsService {
    async sendVerification(phone: {country:string,number:string}, code: string) {
        // Ensure that all environment variables are defined
        const smsUrl = process.env.SMS_URL;
        const smsUsername = process.env.SMS_USERNAME;
        const smsApiKey = process.env.SMS_API_KEY;
        const smsSender = process.env.SMS_SENDER;
    
        if (!smsUrl || !smsUsername || !smsApiKey || !smsSender) {
            console.error('Environment variables for SMS configuration are not properly set.');
            return; // Exit the function if any critical environment variable is missing
        }
        const formattedCountryCode = phone.country.replace(/[+\s\-()]/g, '');
        const formattedNumber = phone.number.replace(/[\s\-()]/g, '');
        const phoneNumber = formattedCountryCode + formattedNumber;
        try {
            const response = await axios.post(smsUrl, {
                userName: smsUsername,
                apiKey: smsApiKey,
                numbers: phoneNumber, 
                userSender: smsSender,
                msg: `رمز التحقق هو : ${code}`,
                msgEncoding: "windows-1256"
            });
    
            return response;
        } catch (err) {
            console.error("Error sending SMS:", err);
            throw err; // Re-throw the error for further handling up the call stack
        }
    }
}
