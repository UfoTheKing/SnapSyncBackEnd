import { NextFunction, Response } from 'express';
import { HttpException } from '@exceptions/HttpException';
import { RequestWithCountry } from '@/interfaces/auth.interface';
import * as requestIp from 'request-ip';
import * as ip from 'ip';
import { WebServiceClient } from '@maxmind/geoip2-node';
import { MAXMIND_ACCOUNT_ID, MAXMIND_LICENSE_KEY } from '@/config';
import { Country } from '@/interfaces/countries.interface';
import { Countries } from '@/models/countries.model';

const countryMiddleware = async (req: RequestWithCountry, res: Response, next: NextFunction) => {
  try {
    // on localhost you'll see 127.0.0.1 if you're using IPv4
    // or ::1, ::ffff:127.0.0.1 if you're using IPv6
    const clientIp = requestIp.getClientIp(req);

    if (ip.isPrivate(clientIp)) {
      const country: Country = await Countries.query().whereNotDeleted().where('iso', 'IT').first();
      req.country = country;
    } else {
      const client = new WebServiceClient(MAXMIND_ACCOUNT_ID, MAXMIND_LICENSE_KEY);
      const response = await client.country(clientIp);
      const countryIso = response.country.isoCode;

      // Recupero la longitudine e la latitudine
      const city = await client.city(clientIp);
      req.location = city?.location;

      if (countryIso) {
        const country: Country = await Countries.query().whereNotDeleted().where('iso', countryIso).first();
        req.country = country;
      } else {
        req.country = null;
      }
    }

    next();
  } catch (error) {
    next(new HttpException(404, error.message));
  }
};

export default countryMiddleware;
