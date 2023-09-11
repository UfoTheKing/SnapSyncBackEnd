import { Router } from 'express';
import IndexController from '@controllers/index.controller';
import { Routes } from '@/interfaces/project/routes.interface';
import LocationsController from '@/controllers/locations.controller';

class LocationsRoute implements Routes {
  public path = '/locations';
  public router = Router();
  public locationsController = new LocationsController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    // this.router.get(`${this.path}/search`, this.locationsController.locationSearch);
  }
}

export default LocationsRoute;
