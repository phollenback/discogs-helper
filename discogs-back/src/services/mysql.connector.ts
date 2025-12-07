import { createPool, Pool } from 'mysql'
let pool: Pool | null = null;

export const initializeMySqlConnector = () => {
    try
    {
        // Use docker service name 'db' as default for docker-compose, allow override via env
        const dbHost = process.env.MY_SQL_DB_HOST || 'db';
        const dbPort = process.env.MY_SQL_DB_PORT ? parseInt(process.env.MY_SQL_DB_PORT) : 3306;
        const dbUser = process.env.MY_SQL_DB_USER;
        const dbPassword = process.env.MY_SQL_DB_PASSWORD;
        const dbDatabase = process.env.MY_SQL_DB_DATABASE;
        const connectionLimit = process.env.MY_SQL_DB_CONNECTION_LIMIT ? parseInt(process.env.MY_SQL_DB_CONNECTION_LIMIT) : 10;

        if (!dbHost || !dbUser || !dbPassword || !dbDatabase) {
            throw new Error('Missing required database configuration. Check MY_SQL_DB_* environment variables.');
        }

        pool = createPool({
            connectionLimit,
            port: dbPort,
            host: dbHost,
            user: dbUser,
            password: dbPassword,
            database: dbDatabase,
            connectTimeout: 60000, // 60 seconds
            acquireTimeout: 60000, // 60 seconds
            timeout: 60000, // 60 seconds
            reconnect: true,
        });

        console.log('[mysql.connector] Pool configuration:');
        console.log('  MY_SQL_DB_HOST:', dbHost);
        console.log('  MY_SQL_DB_PORT:', dbPort);
        console.log('  MY_SQL_DB_DATABASE:', dbDatabase);
        console.log('  MY_SQL_DB_USER:', dbUser);
        console.log('  MY_SQL_DB_CONNECTION_LIMIT:', connectionLimit);

        
        pool.getConnection((err: any, connection: any) => {
            if(err) {
                console.error('[mysql.connector][initializeMySqlConnector] Failed to get connection:', err);
                console.error('[mysql.connector][initializeMySqlConnector] Error code:', err.code);
                console.error('[mysql.connector][initializeMySqlConnector] Error message:', err.message);
                throw new Error(`Failed to connect to database at ${dbHost}:${dbPort} - ${err.message}`);
            }
            else {
                console.log('[mysql.connector][initializeMySqlConnector] Successfully connected to database');
                connection.release();
            }
        })
    } catch (error) {
        console.error('[mysql.connector][initializeMySqlConnector][Error]: ', error);
        throw new Error(`Failed to initialize database pool: ${error instanceof Error ? error.message : 'Unknown error'}`); 
    }
}

export const execute = <T>(query: string, params: string[] | Object) : Promise<T> => {
    try {
        if(!pool) {
            initializeMySqlConnector();
        }
        
        return new Promise<T>((resolve, reject) => {
            pool!.query(query, params, (error: any, results: any) => {
                if(error){
                    console.error('[mysql.connector][execute] Query error:', error);
                    console.error('[mysql.connector][execute] Query:', query.substring(0, 100));
                    console.error('[mysql.connector][execute] Error code:', error.code);
                    console.error('[mysql.connector][execute] Error message:', error.message);
                    reject(error);
                } else {
                    resolve(results);
                }
            });
        });

    } catch(error) {
        console.error('[mysql.connector][execute][Error]: ', error);
        throw new Error(`Failed to execute MySql query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

export const checkDbConnection = (): Promise<boolean> => {
    return new Promise((resolve, reject) => {
        if (!pool) {
            try {
                console.log('[mysql.connector][checkDbConnection] Initializing connection pool...');
                initializeMySqlConnector();
            } catch (error: any) {
                console.error('[mysql.connector][checkDbConnection] Failed to initialize pool:', error);
                console.error('[mysql.connector][checkDbConnection] Error details:', {
                    message: error?.message,
                    stack: error?.stack
                });
                reject(new Error(`Failed to initialize pool: ${error?.message || 'Unknown error'}`));
                return;
            }
        }
        
        // Set a timeout for the connection attempt
        const timeout = setTimeout(() => {
            console.error('[mysql.connector][checkDbConnection] Connection timeout after 30 seconds');
            reject(new Error('Database connection timeout'));
        }, 30000);
        
        pool!.getConnection((err, connection) => {
            clearTimeout(timeout);
            
            if (err) {
                console.error('[mysql.connector][checkDbConnection] Connection failed:', err);
                console.error('[mysql.connector][checkDbConnection] Error code:', err.code);
                console.error('[mysql.connector][checkDbConnection] Error message:', err.message);
                console.error('[mysql.connector][checkDbConnection] Error errno:', err.errno);
                console.error('[mysql.connector][checkDbConnection] Error sqlState:', err.sqlState);
                reject(new Error(`Database connection failed: ${err.message} (code: ${err.code})`));
            } else {            
                console.log('[mysql.connector][checkDbConnection] Database connection successful');
                // Test the connection with a simple query
                connection.query('SELECT 1 as test', (queryErr) => {
                    connection.release();
                    if (queryErr) {
                        console.error('[mysql.connector][checkDbConnection] Query test failed:', queryErr);
                        reject(new Error(`Database query test failed: ${queryErr.message}`));
                    } else {
                        console.log('[mysql.connector][checkDbConnection] Database query test successful');
                        resolve(true);
                    }
                });
            }
        });
    });
}

// Function to close the pool (useful for tests)
export const closePool = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (pool) {
            pool.end((err) => {
                if (err) {
                    console.error('[mysql.connector][closePool][Error]: ', err);
                    reject(err);
                } else {
                    console.log('[mysql.connector][closePool] Pool closed successfully');
                    pool = null;
                    resolve();
                }
            });
        } else {
            resolve();
        }
    });
}
