/**
 * MediFlow LIS — Centralized Domain Event Bus
 * 
 * Enforces Module Ownership, Dependency Boundaries, and Failure Isolation:
 * - 13-field standard Domain Event envelope (Section 26)
 * - Idempotency tracking (eventId + consumerId) (Section 27)
 * - Failure Isolation: Failures in asynchronous event subscribers NEVER disrupt
 *   authoritative clinical or financial transactions.
 */

import { v4 as uuidv4 } from 'uuid';
import { DomainEvent, DomainEventType } from '../types/moduleContracts';
import { eventIdempotencyRepository } from '../repositories/AnalyzerQCIdempotencyRepositories';
import Logger from './logger';

export type EventHandler<T = any> = (event: DomainEvent<T>) => Promise<void> | void;

export class DomainEventBus {
  private static subscribers = new Map<DomainEventType, Set<EventHandler>>();
  private static globalSubscribers = new Set<EventHandler>();

  /**
   * Register a subscriber for a specific domain event type.
   */
  static subscribe<T = any>(eventType: DomainEventType, handler: EventHandler<T>): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    const handlers = this.subscribers.get(eventType)!;
    handlers.add(handler as EventHandler);

    return () => {
      handlers.delete(handler as EventHandler);
    };
  }

  /**
   * Register an idempotent subscriber tracked by consumerId (Section 27).
   */
  static subscribeIdempotent<T = any>(
    consumerId: string,
    eventType: DomainEventType,
    handler: EventHandler<T>
  ): () => void {
    const wrappedHandler: EventHandler<T> = async (event: DomainEvent<T>) => {
      const eventId = event.eventId || event.id || '';
      if (eventId) {
        const alreadyProcessed = await eventIdempotencyRepository.isProcessed(eventId, consumerId);
        if (alreadyProcessed) {
          Logger.info(`[DomainEventBus] Skipping duplicate event ${eventId} for consumer ${consumerId}`);
          return;
        }
      }

      await handler(event);

      if (eventId) {
        await eventIdempotencyRepository.markProcessed({
          id: `idemp-${uuidv4().substring(0, 8)}`,
          eventId,
          consumerId,
          eventType: event.eventType || event.type || 'unknown',
          tenantId: event.tenantId || event.tenant_id || 'default'
        });
      }
    };

    return this.subscribe<T>(eventType, wrappedHandler);
  }

  /**
   * Register a global subscriber (e.g. for audit or analytics stream).
   */
  static subscribeAll(handler: EventHandler): () => void {
    this.globalSubscribers.add(handler);
    return () => {
      this.globalSubscribers.delete(handler);
    };
  }

  /**
   * Publish a domain event with standard 13-field envelope and strict failure isolation.
   */
  static async publish<T = any>(
    type: DomainEventType,
    tenantId: string,
    data: T,
    options: {
      organizationId?: string | null;
      branchId?: string | null;
      actorId?: string | null;
      actorRole?: string | null;
      correlationId?: string;
      causationId?: string | null;
      aggregateId?: string;
      aggregateType?: string;
      metadata?: Record<string, any>;
    } = {}
  ): Promise<DomainEvent<T>> {
    const eventId = `evt-${uuidv4().substring(0, 12)}`;
    const timestamp = new Date().toISOString();
    const correlationId = options.correlationId || uuidv4();
    const aggId = options.aggregateId || (data as any)?.id || (data as any)?.order_id || (data as any)?.result_id || uuidv4();
    const aggType = options.aggregateType || type.split('.')[0];

    const event: DomainEvent<T> = {
      // 13 standard fields (Section 26)
      eventId,
      eventType: type,
      eventVersion: '1.0',
      tenantId,
      organizationId: options.organizationId || null,
      branchId: options.branchId || null,
      aggregateId: aggId,
      aggregateType: aggType,
      actorId: options.actorId || null,
      timestamp,
      correlationId,
      causationId: options.causationId || null,
      payload: data,

      // Backwards-compatibility aliases
      id: eventId,
      type,
      tenant_id: tenantId,
      branch_id: options.branchId || null,
      actor_id: options.actorId || null,
      actor_role: options.actorRole || null,
      correlation_id: correlationId,
      data,
      metadata: options.metadata
    };

    Logger.info(`[DomainEvent] ${event.eventType} emitted (ID: ${event.eventId}, Tenant: ${event.tenantId})`, {
      eventId: event.eventId,
      type: event.eventType,
      tenantId: event.tenantId
    });

    // Notify specific type subscribers
    const typeHandlers = Array.from(this.subscribers.get(type) || []);
    const allHandlers = [...typeHandlers, ...Array.from(this.globalSubscribers)];

    // Execute handlers with failure isolation (Failure in downstream subscriber never disrupts caller)
    Promise.allSettled(
      allHandlers.map(async (handler) => {
        try {
          await handler(event);
        } catch (err: any) {
          Logger.error(`[DomainEvent Error] Subscriber failed for event ${event.eventType} (${event.eventId}):`, {
            error: err.message || err,
            stack: err.stack,
            eventId: event.eventId,
            eventType: event.eventType
          });
        }
      })
    ).catch(() => {
      // Guard against unhandled promise rejection
    });

    return event;
  }

  /**
   * Reset all subscribers (for tests and teardown).
   */
  static clear(): void {
    this.subscribers.clear();
    this.globalSubscribers.clear();
  }
}

export default DomainEventBus;
