/**
 * Emit a webhook event to all registered listeners
 */
export declare const emitWebhookEvent: (eventType: string, data: any) => Promise<void>;
/**
 * Retry failed webhook deliveries
 */
export declare const retryFailedDeliveries: () => Promise<void>;
/**
 * Register a new webhook
 */
export declare const registerWebhook: (userId: string, url: string, eventTypes: string[], options?: {
    secret?: string;
    description?: string;
    headers?: Record<string, string>;
}) => Promise<string>;
/**
 * Unregister a webhook
 */
export declare const unregisterWebhook: (webhookId: string, userId: string) => Promise<void>;
/**
 * Get webhook delivery history
 */
export declare const getDeliveryHistory: (webhookId: string, limit?: number) => Promise<any[]>;
interface CreateWebhookInput {
    name: string;
    url: string;
    events: string[];
    createdBy: string;
    headers?: Record<string, string>;
}
interface CreateWebhookResult {
    webhook: any;
    secret: string;
}
/**
 * Create a new webhook (for integrations module)
 */
export declare const createWebhook: (input: CreateWebhookInput) => Promise<CreateWebhookResult>;
/**
 * Get all webhooks (for integrations module)
 */
export declare const getWebhooks: () => Promise<any[]>;
/**
 * Get single webhook by ID
 */
export declare const getWebhookById: (webhookId: string) => Promise<any | null>;
/**
 * Update webhook
 */
export declare const updateWebhook: (webhookId: string, updates: {
    name?: string;
    url?: string;
    events?: string[];
    headers?: Record<string, string>;
    is_active?: boolean;
}) => Promise<any | null>;
/**
 * Delete webhook
 */
export declare const deleteWebhook: (webhookId: string) => Promise<boolean>;
/**
 * Test webhook by sending a ping event
 */
export declare const testWebhook: (webhookId: string) => Promise<{
    success: boolean;
    message: string;
    statusCode?: number;
}>;
/**
 * Get webhook delivery logs
 */
export declare const getWebhookLogs: (webhookId: string, limit?: number) => Promise<any[]>;
/**
 * Manually trigger a webhook event
 */
export declare const triggerWebhook: (eventType: string, data: any) => Promise<{
    success: boolean;
    delivered: number;
    failed: number;
}>;
/**
 * Verify webhook signature
 */
export declare const verifySignature: (payload: string, signature: string, secret: string) => boolean;
export {};
//# sourceMappingURL=webhook.d.ts.map