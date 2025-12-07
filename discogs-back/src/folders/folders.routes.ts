import express from 'express';
import * as FoldersController from './folders.controller';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

console.log('[FOLDERS ROUTER] Initializing folders routes');

// Test route
router.get('/api/test-folders', (req, res) => {
    console.log('[FOLDERS ROUTER] Test route called');
    res.json({ message: 'Folders router is working!' });
});

// Get user's collection folders (public endpoint, but uses user's token if authenticated)
router.get('/api/users/:username/folders', FoldersController.getUserFolders);

// Create a new folder (requires authentication)
router.post('/api/users/:username/folders', authenticateToken, FoldersController.createUserFolder);

// Get folder metadata (public endpoint, but uses user's token if authenticated)
router.get('/api/users/:username/folders/:folderId', authenticateToken, FoldersController.getFolderMetadata);

// Update a folder (requires authentication)
router.put('/api/users/:username/folders/:folderId', authenticateToken, FoldersController.updateUserFolder);

// Delete a folder (requires authentication)
router.delete('/api/users/:username/folders/:folderId', authenticateToken, FoldersController.deleteUserFolder);

// Get folder items (public endpoint, but uses user's token if authenticated)
router.get('/api/users/:username/folders/:folderId/releases', authenticateToken, FoldersController.getFolderItems);

// Add a release to a folder (requires authentication)
router.post('/api/users/:username/folders/:folderId/releases/:releaseId', authenticateToken, FoldersController.addReleaseToFolder);

// Get release instances (public endpoint, but uses user's token if authenticated)
router.get('/api/users/:username/collection/releases/:releaseId', authenticateToken, FoldersController.getReleaseInstances);

// Update release instance (requires authentication)
router.post('/api/users/:username/folders/:folderId/releases/:releaseId/instances/:instanceId', authenticateToken, FoldersController.updateReleaseInstance);

// Delete release instance (requires authentication)
router.delete('/api/users/:username/folders/:folderId/releases/:releaseId/instances/:instanceId', authenticateToken, FoldersController.deleteReleaseInstance);

// Move a release between folders (requires authentication)
router.put('/api/users/:username/releases/:releaseId/move', authenticateToken, FoldersController.moveReleaseBetweenFolders);

// Get collection value (requires authentication as owner)
router.get('/api/users/:username/collection/value', authenticateToken, FoldersController.getCollectionValue);

// Get collection fields (public endpoint, but uses user's token if authenticated)
router.get('/api/users/:username/collection/fields', authenticateToken, FoldersController.getCollectionFields);

console.log('[FOLDERS ROUTER] Routes registered:');
console.log('  GET    /api/users/:username/folders (get user folders)');
console.log('  POST   /api/users/:username/folders (create folder)');
console.log('  GET    /api/users/:username/folders/:folderId (get folder metadata)');
console.log('  PUT    /api/users/:username/folders/:folderId (update folder)');
console.log('  DELETE /api/users/:username/folders/:folderId (delete folder)');
console.log('  GET    /api/users/:username/folders/:folderId/releases (get folder items)');
console.log('  POST   /api/users/:username/folders/:folderId/releases/:releaseId (add release to folder)');
console.log('  GET    /api/users/:username/collection/releases/:releaseId (get release instances)');
console.log('  POST   /api/users/:username/folders/:folderId/releases/:releaseId/instances/:instanceId (update release instance)');
console.log('  DELETE /api/users/:username/folders/:folderId/releases/:releaseId/instances/:instanceId (delete release instance)');
console.log('  PUT    /api/users/:username/releases/:releaseId/move (move release between folders)');
console.log('  GET    /api/users/:username/collection/value (get collection value)');
console.log('  GET    /api/users/:username/collection/fields (get collection fields)');

export default router;
