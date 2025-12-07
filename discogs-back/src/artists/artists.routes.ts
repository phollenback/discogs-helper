import { Router } from 'express';
import * as ArtistController from './artists.controller';

const artistsRouter = Router();

// More specific routes first
artistsRouter
    .route('/api/artists/:artistId/overview')
    .get(ArtistController.getArtistOverview);

artistsRouter
    .route('/api/artists/:artistId/releases')
    .get(ArtistController.readArtistReleases);

// General route last
artistsRouter
    .route('/api/artists/:artistId')
    .get(ArtistController.readArtistById);

export default artistsRouter;
