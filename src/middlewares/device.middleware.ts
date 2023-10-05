import { NextFunction, Response } from 'express';
import { HttpException } from '@exceptions/HttpException';
import { RequestWithDevice } from '@/interfaces/auth.interface';
import { validate as uuidValidate } from 'uuid';
import { version as uuidVersion } from 'uuid';
import { Device } from '@/interfaces/devices.interface';
import { Devices } from '@/models/devices.model';

function uuidValidateV4(uuid) {
  return uuidValidate(uuid) && uuidVersion(uuid) === 4;
}

const deviceMiddleware = async (req: RequestWithDevice, res: Response, next: NextFunction) => {
  try {
    const deviceUuid = req.cookies['DeviceUuid'] || (req.header('DeviceUuid') ? req.header('DeviceUuid') : null);
    console.log('deviceUuid', deviceUuid);

    // Controllo se il deviceUuid è stato passato ed è valido
    if (deviceUuid && deviceUuid.length > 0) {
      // Provo a recuperare il device
      var device: Device | null = null;

      try {
        device = await Devices.query().whereNotDeleted().andWhere('uuid', deviceUuid).first();
      } catch (error) {
        device = null;
      }

      req.device = device;
    } else {
      req.device = null;
    }

    next();
  } catch (error) {
    next(new HttpException(500, error.message));
  }
};

export default deviceMiddleware;
