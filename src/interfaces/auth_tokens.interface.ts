import { Device } from "./devices.interface";
import { User } from "./users.interface";
import { UserDevice } from "./users_devices.interface";

export interface AuthToken {
    id: number;
    userId: number;
    deviceId: number;
    userDeviceId: number;
    selector: string;
    hashedValidator: string;
    lastUsedAt: Date | null;

    createdAt: Date;
    updatedAt: Date;

    userDevice?: UserDevice
    user?: User
    device?: Device
}