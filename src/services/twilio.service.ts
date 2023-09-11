import { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } from '@/config';

const client = require('twilio')(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

class TwilioService {
  public async sendOtp(phoneNumber: string) {
    let channel = 'sms';

    client.verify.v2
      .services('VAeb9e4258323447b4b94876b048c2af21')
      .verifications.create({ to: phoneNumber, channel: channel })
      .then(verification => console.log(verification.status));
  }

  public async verifyOtp(phoneNumber: string, code: string): Promise<boolean> {
    let s = await client.verify.v2.services('VAeb9e4258323447b4b94876b048c2af21').verificationChecks.create({ to: phoneNumber, code: code });

    if (s && s.status == 'approved') {
      return true;
    }

    return false;
  }
}

export default TwilioService;
