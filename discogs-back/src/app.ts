import dotenv from 'dotenv'
dotenv.config();

// Map old DB_ environment variables to MY_SQL_DB_ format for backward compatibility
if (process.env.DB_HOST && !process.env.MY_SQL_DB_HOST) {
    process.env.MY_SQL_DB_HOST = process.env.DB_HOST;
}
if (process.env.DB_PORT && !process.env.MY_SQL_DB_PORT) {
    process.env.MY_SQL_DB_PORT = process.env.DB_PORT;
}
if (process.env.DB_USER && !process.env.MY_SQL_DB_USER) {
    process.env.MY_SQL_DB_USER = process.env.DB_USER;
}
if (process.env.DB_PASSWORD && !process.env.MY_SQL_DB_PASSWORD) {
    process.env.MY_SQL_DB_PASSWORD = process.env.DB_PASSWORD;
}
if (process.env.DB_NAME && !process.env.MY_SQL_DB_DATABASE) {
    process.env.MY_SQL_DB_DATABASE = process.env.DB_NAME;
}
if (process.env.DB_DATABASE && !process.env.MY_SQL_DB_DATABASE) {
    process.env.MY_SQL_DB_DATABASE = process.env.DB_DATABASE;
}

import express from 'express'
import recordRouter from './records/records.routes'
import collectionRouter from './collection/collection.routes'
import suggestionsRouter from './suggestions/suggestions.routes'
import userRoutes from './users/users.routes'
import followsRouter from './follows/follows.routes'
import adminRouter from './admin/admin.routes'
import foldersRouter from './folders/folders.routes'
import releasesRouter from './releases/releases.routes'
import mastersRouter from './masters/master.routes'
import labelsRouter from './labels/labels.routes'
import artistsRouter from './artists/artists.routes'
import entityFollowsRouter from './entity-follows/entity-follows.routes'
import cors from 'cors'
import helmet from 'helmet'
import { checkDbConnection, initializeMySqlConnector } from './services/mysql.connector'


const useDb = async (retries = 5, delay = 5000) => {
    for (let i = 0; i < retries; i++) {
        try {
            console.log(`[app] Attempting database connection (attempt ${i + 1}/${retries})...`);
            await checkDbConnection();
            console.log('[app] Database connection established successfully');
            return; // Success, exit function
        } catch (error: any) {
            console.error(`[app] Database connection attempt ${i + 1} failed:`, error?.message || error);
            if (i < retries - 1) {
                console.log(`[app] Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error('[app] All database connection attempts failed. Exiting...');
                console.error('[app] Database configuration:', {
                    host: process.env.MY_SQL_DB_HOST || 'db (default)',
                    port: process.env.MY_SQL_DB_PORT || '3306 (default)',
                    database: process.env.MY_SQL_DB_DATABASE,
                    user: process.env.MY_SQL_DB_USER
                });
                process.exit(1); // Exit the process with failure
            }
        }
    }
};

useDb();

const app = express();
const port = process.env.PORT;

console.log(port)

// Parse CORS origins from environment variable
const corsOrigins = process.env.CORS_ORIGIN 
    ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
    : ['*'];

console.log('CORS Origins:', corsOrigins);

// enable all CORS request with explicit origins for credentials
app.use(cors({
    origin: true, // Allow all origins temporarily for testing
    credentials: true,
    exposedHeaders: ['Authorization'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// parse json bodies
app.use(express.json());
// parse URL encoded bodies
app.use(express.urlencoded({ extended: true }));

// add a set of security middleware
app.use(helmet());

// Request logging middleware
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    const method = req.method;
    const url = req.url;
    
    console.log(`[REQUEST][${timestamp}] ${method} ${url} - IP: ${clientIP} - User-Agent: ${userAgent}`);
    
    // Log request body for POST/PUT requests (but mask sensitive data)
    if (['POST', 'PUT', 'PATCH'].includes(method) && req.body) {
        const bodyCopy = { ...req.body };
        // Mask sensitive fields
        if (bodyCopy.password) bodyCopy.password = '***MASKED***';
        if (bodyCopy.token) bodyCopy.token = '***MASKED***';
        console.log(`[REQUEST][${timestamp}] Body:`, JSON.stringify(bodyCopy, null, 2));
    }
    
    // Log response when it's sent
    const originalSend = res.send;
    res.send = function(data) {
        console.log(`[RESPONSE][${timestamp}] ${method} ${url} - Status: ${res.statusCode} - IP: ${clientIP}`);
        originalSend.call(this, data);
    };
    
    next();
});

console.log(process.env.MY_SQL_DB_DATABASE);

if(process.env.NODE_ENV == 'development') {
    // add logger middleware
    console.log(process.env.GREETING + ' in dev mode');
}

app.get('/', (req, res) => {
    res.send('<h1>Welcome to the Music API</h1>');
});

app.get('/api/health', (req: Request, res: Response) => {
    return res.status(200).json({ message: 'UP and running' });
})

// Test folders route directly in app.ts
app.get('/api/users/:username/folders-test', (req, res) => {
    console.log('[APP] Direct folders test route called');
    res.json({
        folders: [
            {
                id: 0,
                name: "All",
                count: 7,
                resource_url: "https://api.discogs.com/users/pskills/collection/folders/0"
            }
        ]
    });
})

app.use('/', recordRouter);
app.use('/', collectionRouter); // Register before foldersRouter to ensure username-based routes match first
app.use('/', foldersRouter);
app.use('/', suggestionsRouter);
app.use('/', userRoutes);
app.use('/', followsRouter);
app.use('/', adminRouter);
app.use('/', artistsRouter);
app.use('/', releasesRouter);
app.use('/', mastersRouter);
app.use('/', labelsRouter);
app.use('/', entityFollowsRouter);

// open the server at the defined port
app.listen(port, () => {
    // echo that the server is listening
    console.log('Example app listening at http://localhost:' + port);
})