import { CreateExpoPushTokenDto } from "@/dtos/expo_push_tokens.dto";
import { HttpException } from "@/exceptions/HttpException";
import { RequestWithDevice, RequestWithUser } from "@/interfaces/auth.interface";
import ExpoPushTokenService from "@/services/expo_push_tokens.service";
import { NextFunction, Response } from "express";
import * as yup from 'yup';

class NotificationsController {
    public expoPushTokenService = new ExpoPushTokenService();

    public createExpoPushToken = async (req: RequestWithUser & RequestWithDevice, res: Response, next: NextFunction) => {
        const validationSchema = yup.object().shape({
            token: yup.string().required(),
        });

        try {
            if (!req.device) throw new HttpException(404, "Device doesn't exist");

            const data: CreateExpoPushTokenDto = {
                userId: req.user.id,
                deviceId: req.device.id,
                token: req.body.token,
            };

            await validationSchema.validate(data, { abortEarly: false });

            await this.expoPushTokenService.createExpoPushToken(data);

            res.status(200).json({ message: 'ok' });
        } catch (error) {
            next(error);
        }
    };
}

export default NotificationsController;