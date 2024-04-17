import {Injectable} from "@tsed/di";
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailServerService {
    private transporter: nodemailer.Transporter;

    constructor() {
      
      this.transporter = nodemailer.createTransport({
        host: 'mail.rafeedsa.com',
        port: 465,
        secure: true,
        auth: {
          user: process.env.MAILER_EMAIL,
          pass: process.env.MAILER_PASSWORD,
        },
      });
    }
    async sendAuthEmail(to: string, subject: string, code: string): Promise<void> {
      const htmlContent = `
        <div style="font-family: 'Arial', sans-serif; color: #333;">
          <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: auto;">
            <tr>
              <td style="background-color: #fff; text-align: center; padding: 20px;">
                <img src="cid:logo" style="max-width: 200px;" />
              </td>
            </tr>
            <tr>
              <td style="background-color: #f7f7f7; text-align: center; padding: 40px;">
                <h1 style="color: #d32f2f; margin-bottom: 10px;">Confirm your email</h1>
                <p>To finish the set up of your Rafeed account, please verify your email.</p>
                <p>Enter the code below into the form provided.</p>
                <div style="background-color: #fff; margin: 20px 0; padding: 10px;">
                  <strong>${code}</strong>
                </div>
              </td>
            </tr>
            <tr>
              <td style="background-color: #fff; text-align: center; padding: 20px; font-size: 12px;">
                 © 2024
              </td>
            </tr>
          </table>
        </div>
      `;
    
      const mailOptions: nodemailer.SendMailOptions = {
        from: process.env.MAILER_EMAIL, 
        to: to, 
        subject: subject,
        html: htmlContent, // Use 'html' instead of 'text'
        attachments: [{
          filename: 'logo.png',
          path: 'public/logos/logo.png', // Update with the path to your logo image
          cid: 'logo' // Same CID value as in the html img src
        }]
      };
    
      
      try {
        await this.transporter.sendMail(mailOptions);
      } catch (error) {
        console.error(error);
      }
    }

    async sendAlertAuthEmail(to: string, subject: string, code: string): Promise<void> {
      const htmlContent = `
        <div style="font-family: 'Arial', sans-serif; color: #333;">
          <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: auto;">
            <tr>
              <td style="background-color: #fff; text-align: center; padding: 20px;">
                <img src="cid:logo" style="max-width: 200px;" />
              </td>
            </tr>
            <tr>
              <td style="background-color: #f7f7f7; text-align: center; padding: 40px;">
                <h1 style="color: #d32f2f; margin-bottom: 10px;">Confirm your Alert</h1>
                <p>To finish the set up of your Sensor Alert, please verify your alert.</p>
                <p>Enter the code below into the form provided.</p>
                <div style="background-color: #fff; margin: 20px 0; padding: 10px;">
                  <strong>${code}</strong>
                </div>
                <a href="#" style="background-color: #d32f2f; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 5px;">Verify</a>
              </td>
            </tr>
            <tr>
              <td style="background-color: #fff; text-align: center; padding: 20px; font-size: 12px;">
                MouldAlerts is owned by Multi Sensory Technology Limited © 2024
              </td>
            </tr>
          </table>
        </div>
      `;
    
      const mailOptions: nodemailer.SendMailOptions = {
        from: 'noreply@mouldalerts.com', 
        to: to, 
        subject: subject,
        html: htmlContent, // Use 'html' instead of 'text'
        attachments: [{
          filename: 'logo.png',
          path: 'public/logos/logo.png', // Update with the path to your logo image
          cid: 'logo' // Same CID value as in the html img src
        }]
      };
    
      
      try {
        await this.transporter.sendMail(mailOptions);
      } catch (error) {
        console.error(error);
      }
    }

    async sendAlert(to: string,alert:string): Promise<void> {
      const htmlContent = `
        <div style="font-family: 'Arial', sans-serif; color: #333;">
          <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: auto;">
            <tr>
              <td style="background-color: #fff; text-align: center; padding: 20px;">
                <img src="cid:logo" style="max-width: 200px;" />
              </td>
            </tr>
            <tr>
              <td style="background-color: #f7f7f7; text-align: center; padding: 40px;">
                <h1 style="color: #d32f2f; margin-bottom: 10px;">Critical Condition Detected</h1>
                <p> ${alert} </p>
                
              </td>
            </tr>
            <tr>
              <td style="background-color: #fff; text-align: center; padding: 20px; font-size: 12px;">
                MouldAlerts is owned by Multi Sensory Technology Limited © 2024
              </td>
            </tr>
          </table>
        </div>
      `;
    
      const mailOptions: nodemailer.SendMailOptions = {
        from: 'noreply@mouldalerts.com', 
        to: to, 
        subject: "Mould Alert",
        html: htmlContent, // Use 'html' instead of 'text'
        attachments: [{
          filename: 'logo.png',
          path: 'public/logos/logo.png', // Update with the path to your logo image
          cid: 'logo' // Same CID value as in the html img src
        }]
      };
    
      
      try {
        await this.transporter.sendMail(mailOptions);
      } catch (error) {
        console.error(error);
      }
    }
}
