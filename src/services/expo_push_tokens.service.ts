import { CreateExpoPushTokenDto } from "@/dtos/expo_push_tokens.dto";
import { HttpException } from "@/exceptions/HttpException";
import { ExpoPushToken } from "@/interfaces/expo_push_tokens.interface";
import { Devices } from "@/models/devices.model";
import { ExpoPushTokens } from "@/models/expo_push_tokens.model";
import { Users } from "@/models/users.model";
import { UsersDevices } from "@/models/users_devices.model";
import { isEmpty } from "@/utils/util";
import { Expo } from 'expo-server-sdk';
import Objection from "objection";

class ExpoPushTokenService {
    public async createExpoPushToken(data: CreateExpoPushTokenDto, trx?: Objection.Transaction): Promise<ExpoPushToken> {
        if (isEmpty(data)) throw new HttpException(400, "data is empty");

        const findUser = await Users.query(trx).whereNotDeleted().findById(data.userId);
        if (!findUser) throw new HttpException(404, "User doesn't exist");

        const findDevice = await Devices.query(trx).whereNotDeleted().findById(data.deviceId);
        if (!findDevice) throw new HttpException(404, "Device doesn't exist");

        const findUserDevice = await UsersDevices.query(trx).whereNotDeleted().findOne({ userId: data.userId, deviceId: data.deviceId });
        if (!findUserDevice) throw new HttpException(404, "UserDevice doesn't exist");

        if (Expo.isExpoPushToken(data.token) === false) throw new HttpException(400, "Token is not a valid ExpoPushToken");

        const findExpoPushToken = await ExpoPushTokens.query(trx).findOne({token: data.token});
        if (findExpoPushToken) throw new HttpException(409, `This token ${data.token} already exists`);

        const findExpoPushTokenByUserIdAndDeviceId = await ExpoPushTokens.query(trx).findOne({userId: data.userId, deviceId: data.deviceId});
        if (findExpoPushTokenByUserIdAndDeviceId) throw new HttpException(409, `This device already has a token`);

        const createExpoPushTokenData: ExpoPushToken = await ExpoPushTokens.query(trx)
            .insert({ ...data })

        return createExpoPushTokenData;
    }

    public async deleteExpoPushTokensByUserId(userId: number, trx?: Objection.Transaction): Promise<void> {
        if (isEmpty(userId)) throw new HttpException(400, "userId is empty");

        const findUser = await Users.query(trx).whereNotDeleted().findById(userId);
        if (!findUser) throw new HttpException(404, "User doesn't exist");

        await ExpoPushTokens.query(trx).where({ userId }).delete();

        return;
    }

    public async deleteExpoPushTokenByUserIdAndDeviceId(userId: number, deviceId: number, trx?: Objection.Transaction): Promise<void> {
        if (isEmpty(userId)) throw new HttpException(400, "userId is empty");
        if (isEmpty(deviceId)) throw new HttpException(400, "deviceId is empty");

        const findUser = await Users.query(trx).whereNotDeleted().findById(userId);
        if (!findUser) throw new HttpException(404, "User doesn't exist");

        const findDevice = await Devices.query(trx).whereNotDeleted().findById(deviceId);
        if (!findDevice) throw new HttpException(404, "Device doesn't exist");

        await ExpoPushTokens.query(trx).where({ userId, deviceId }).delete();

        return;
    }
}

export default ExpoPushTokenService;