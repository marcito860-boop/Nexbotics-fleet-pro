"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
exports.transaction = transaction;
exports.runMigrations = runMigrations;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
// Use DATABASE_URL if available, otherwise fall back to individual env vars
const pool = process.env.DATABASE_URL
    ? new pg_1.Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    })
    : new pg_1.Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'nextbotics_fleet_pro',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
    });
exports.pool = pool;
// Query helper with company isolation
async function query(sql, params, context) {
    const client = await pool.connect();
    try {
        const result = await client.query(sql, params);
        return result.rows;
    }
    finally {
        client.release();
    }
}
// Transaction helper
async function transaction(callback, context) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
// Migration runner
async function runMigrations() {
    const client = await pool.connect();
    try {
        console.log('🔄 Running database migrations...');
        // Create migrations tracking table
        await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
        // Get list of applied migrations
        const appliedResult = await client.query('SELECT filename FROM schema_migrations');
        const appliedMigrations = new Set(appliedResult.rows.map(r => r.filename));
        // Find migration files
        const migrationsDir = path_1.default.join(__dirname, '../../database/migrations');
        // Check if migrations directory exists
        if (!fs_1.default.existsSync(migrationsDir)) {
            console.log('ℹ️ No migrations directory found, skipping migrations');
            return;
        }
        const migrationFiles = fs_1.default.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort(); // Run in order
        let appliedCount = 0;
        for (const filename of migrationFiles) {
            if (appliedMigrations.has(filename)) {
                console.log(`  ✓ ${filename} (already applied)`);
                continue;
            }
            console.log(`  📝 Applying ${filename}...`);
            const filePath = path_1.default.join(migrationsDir, filename);
            const sql = fs_1.default.readFileSync(filePath, 'utf-8');
            try {
                await client.query('BEGIN');
                await client.query(sql);
                await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
                await client.query('COMMIT');
                console.log(`  ✅ ${filename} applied successfully`);
                appliedCount++;
            }
            catch (error) {
                await client.query('ROLLBACK');
                console.error(`  ❌ Failed to apply ${filename}:`, error);
                throw error;
            }
        }
        if (appliedCount === 0) {
            console.log('✅ All migrations up to date');
        }
        else {
            console.log(`✅ Applied ${appliedCount} migration(s)`);
        }
    }
    finally {
        client.release();
    }
}
exports.default = pool;
//# sourceMappingURL=index.js.map