import { Pool, PoolClient } from 'pg';
declare const pool: Pool;
export interface CompanyContext {
    companyId: string | null;
    isSuperAdmin: boolean;
}
export declare function query(sql: string, params?: any[], context?: CompanyContext): Promise<any[]>;
export declare function transaction<T>(callback: (client: PoolClient) => Promise<T>, context?: CompanyContext): Promise<T>;
export declare function runMigrations(): Promise<void>;
export { pool };
export default pool;
//# sourceMappingURL=index.d.ts.map