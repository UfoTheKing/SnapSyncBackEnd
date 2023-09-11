import { Router } from 'express';
import { Routes } from '@/interfaces/project/routes.interface';
import authMiddleware from '@/middlewares/auth.middleware';
import SearchesController from '@/controllers/searches.controller';

class SearchesRoute implements Routes {
  public path = '/searches';
  public router = Router();
  public searchesController = new SearchesController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}`, authMiddleware, this.searchesController.searchUsers);
  }
}

export default SearchesRoute;
