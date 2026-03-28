import { Pool } from 'pg';
declare let pool: Pool | null;
export declare const initDatabase: () => Promise<Pool>;
export declare const runMigrations: () => Promise<void>;
export declare const query: (sql: string, params?: any[]) => Promise<any>;
export { pool };
export declare const transaction: <T>(callback: (client: any) => Promise<T>) => Promise<T>;
export default pool;
//# sourceMappingURL=index.d.ts.map