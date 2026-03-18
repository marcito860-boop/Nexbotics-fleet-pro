import { Router, Request, Response } from 'express';
import { authMiddleware, requireRole } from '../utils/auth';
import { query } from '../database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.use(authMiddleware);

// ==========================================
// INTEGRATION PROVIDERS (ERP, Telematics, etc.)
// ==========================================

// Get all integrations for company
router.get('/', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId;
    const result = await query(`
      SELECT * FROM integration_providers
      WHERE company_id = $1
      ORDER BY created_at DESC
    `, [companyId]);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching integrations:', error);
    res.status(500).json({ error: 'Failed to fetch integrations' });
  }
});

// Get integration by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await query(`
      SELECT * FROM integration_providers
      WHERE id = $1
    `, [id]);
    
    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error fetching integration:', error);
    res.status(500).json({ error: 'Failed to fetch integration' });
  }
});

// Create new integration
router.post('/', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId;
    const { name, type, provider, description, config, features } = req.body;
    
    const result = await query(`
      INSERT INTO integration_providers (
        id, company_id, name, type, provider, description, config, features, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'disconnected')
      RETURNING *
    `, [uuidv4(), companyId, name, type, provider, description, JSON.stringify(config), features]);
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating integration:', error);
    res.status(500).json({ error: 'Failed to create integration' });
  }
});

// Update integration
router.put('/:id', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, config, features, status } = req.body;
    
    const result = await query(`
      UPDATE integration_providers
      SET name = $1, description = $2, config = $3, features = $4, status = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `, [name, description, JSON.stringify(config), features, status, id]);
    
    if (!result || result.length === 0) {
      return res.status(404).json({ error: 'Integration not found' });
    }
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating integration:', error);
    res.status(500).json({ error: 'Failed to update integration' });
  }
});

// Delete integration
router.delete('/:id', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    await query('DELETE FROM integration_providers WHERE id = $1', [id]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting integration:', error);
    res.status(500).json({ error: 'Failed to delete integration' });
  }
});

// ==========================================
// API KEYS
// ==========================================

router.get('/api-keys', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId;
    const result = await query(`
      SELECT id, name, key_prefix, permissions, rate_limit, usage_count, 
             last_used_at, expires_at, is_active, created_at
      FROM api_keys
      WHERE company_id = $1
      ORDER BY created_at DESC
    `, [companyId]);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

router.post('/api-keys', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId;
    const userId = (req as any).user?.userId;
    const { name, permissions, rateLimit, expiresAt } = req.body;
    
    // Generate API key
    const keyPrefix = 'pk_' + Math.random().toString(36).substring(2, 8);
    const keySecret = Math.random().toString(36).substring(2, 34);
    const fullKey = keyPrefix + '_' + keySecret;
    
    // Hash the key for storage
    const keyHash = await import('crypto').then(c => 
      c.createHash('sha256').update(fullKey).digest('hex')
    );
    
    const result = await query(`
      INSERT INTO api_keys (
        id, company_id, name, key_hash, key_prefix, permissions, rate_limit, expires_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, name, key_prefix, permissions, rate_limit, expires_at, created_at
    `, [uuidv4(), companyId, name, keyHash, keyPrefix, permissions, rateLimit, expiresAt, userId]);
    
    // Return the full key only once
    res.status(201).json({
      ...result[0],
      fullKey
    });
  } catch (error) {
    console.error('Error creating API key:', error);
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

router.delete('/api-keys/:id', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM api_keys WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting API key:', error);
    res.status(500).json({ error: 'Failed to delete API key' });
  }
});

// ==========================================
// WEBHOOKS
// ==========================================

router.get('/webhooks', async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId;
    const result = await query(`
      SELECT * FROM webhooks
      WHERE company_id = $1
      ORDER BY created_at DESC
    `, [companyId]);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching webhooks:', error);
    res.status(500).json({ error: 'Failed to fetch webhooks' });
  }
});

router.post('/webhooks', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const companyId = (req as any).user?.companyId;
    const userId = (req as any).user?.userId;
    const { name, url, secret, events, retryCount, timeoutSeconds } = req.body;
    
    const result = await query(`
      INSERT INTO webhooks (
        id, company_id, name, url, secret, events, retry_count, timeout_seconds, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [uuidv4(), companyId, name, url, secret, events, retryCount || 3, timeoutSeconds || 30, userId]);
    
    res.status(201).json(result[0]);
  } catch (error) {
    console.error('Error creating webhook:', error);
    res.status(500).json({ error: 'Failed to create webhook' });
  }
});

router.put('/webhooks/:id', requireRole(['admin', 'manager']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, url, secret, events, isActive, retryCount, timeoutSeconds } = req.body;
    
    const result = await query(`
      UPDATE webhooks
      SET name = $1, url = $2, secret = $3, events = $4, is_active = $5,
          retry_count = $6, timeout_seconds = $7, updated_at = CURRENT_TIMESTAMP
      WHERE id = $8
      RETURNING *
    `, [name, url, secret, events, isActive, retryCount, timeoutSeconds, id]);
    
    res.json(result[0]);
  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(500).json({ error: 'Failed to update webhook' });
  }
});

router.delete('/webhooks/:id', requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await query('DELETE FROM webhooks WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({ error: 'Failed to delete webhook' });
  }
});

// Get webhook logs
router.get('/webhooks/:id/logs', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    
    const result = await query(`
      SELECT * FROM webhook_logs
      WHERE webhook_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [id, limit]);
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching webhook logs:', error);
    res.status(500).json({ error: 'Failed to fetch webhook logs' });
  }
});

export default router;
