/**
 * MediFlow LIS — Webhook Dispatch & Event Delivery Service
 * Signs outgoing payloads with HMAC-SHA256 and records delivery logs
 */

import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/database';

export async function dispatchWebhookEvent(
  labId: string,
  event: string,
  payload: any
): Promise<void> {
  try {
    const webhooks = await db.query<{
      id: string;
      name: string;
      target_url: string;
      secret: string;
      subscribed_events: string;
    }>(
      `SELECT * FROM webhooks WHERE lab_id = $1 AND is_active = 1`,
      [labId]
    );

    const payloadString = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      lab_id: labId,
      data: payload
    });

    for (const wh of webhooks) {
      let isSubscribed = false;
      try {
        const events = JSON.parse(wh.subscribed_events || '[]');
        if (Array.isArray(events) && (events.includes('*') || events.includes(event))) {
          isSubscribed = true;
        }
      } catch {
        isSubscribed = true;
      }

      if (!isSubscribed) continue;

      const deliveryId = `deliv-${uuidv4().substring(0, 8)}`;
      const signature = crypto
        .createHmac('sha256', wh.secret || 'mediflow_secret')
        .update(payloadString)
        .digest('hex');

      // Attempt non-blocking HTTP dispatch
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(wh.target_url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-MediFlow-Event': event,
            'X-MediFlow-Signature': signature,
            'User-Agent': 'MediFlow-LIS-Webhook-Engine/1.0'
          },
          body: payloadString,
          signal: controller.signal
        }).catch((err) => ({ ok: false, status: 504, error: err.message }));

        clearTimeout(timeoutId);

        const statusCode = (res as any).status || 500;
        const status = (res as any).ok ? 'success' : 'failed';
        const errMsg = (res as any).ok ? null : ((res as any).error || `HTTP ${statusCode}`);

        await db.execute(
          `INSERT INTO webhook_deliveries (id, lab_id, webhook_id, event, payload, status_code, attempts, status, error_message)
           VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8)`,
          [deliveryId, labId, wh.id, event, payloadString, statusCode, status, errMsg]
        );
      } catch (err: any) {
        await db.execute(
          `INSERT INTO webhook_deliveries (id, lab_id, webhook_id, event, payload, status_code, attempts, status, error_message)
           VALUES ($1, $2, $3, $4, $5, 500, 1, 'failed', $6)`,
          [deliveryId, labId, wh.id, event, payloadString, err.message]
        );
      }
    }
  } catch (err: any) {
    console.error('Webhook dispatch error:', err.message);
  }
}
