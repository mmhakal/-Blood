/**
 * Privacy-Aware Product Telemetry Service
 * Tracks strictly permitted non-sensitive product milestones.
 * Never tracks browsing history, URLs, or patient data.
 */

import { extensionStorage } from '../storage/extensionStorage';
import logger from './logger';

export type TelemetryEvent =
  | 'extension_installed'
  | 'extension_updated'
  | 'login_success'
  | 'login_failure'
  | 'feature_opened'
  | 'api_error'
  | 'sync_started'
  | 'sync_completed'
  | 'search_performed';

class TelemetryService {
  public async track(event: TelemetryEvent, metadata?: Record<string, any>) {
    try {
      const settings = await extensionStorage.getSettings();
      if (!settings.telemetryEnabled) {
        return;
      }

      logger.debug(`[Telemetry] ${event}`, metadata || {});

      // Append to local diagnostic audit queue (max 50 events)
      const queue = (await extensionStorage.get<any[]>('telemetry_queue')) || [];
      queue.push({
        event,
        metadata,
        timestamp: new Date().toISOString()
      });
      if (queue.length > 50) queue.shift();
      await extensionStorage.set('telemetry_queue', queue);
    } catch {
      // Telemetry failures must NEVER degrade user experience
    }
  }

  public async getDiagnosticLogs(): Promise<any[]> {
    return (await extensionStorage.get<any[]>('telemetry_queue')) || [];
  }

  public async clearDiagnosticLogs(): Promise<void> {
    await extensionStorage.remove('telemetry_queue');
  }
}

export const telemetry = new TelemetryService();
export default telemetry;
