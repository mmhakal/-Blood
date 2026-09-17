import { v4 as uuidv4 } from 'uuid';
import Logger from './logger';

export type JobType =
  | 'pdf_generate'
  | 'bulk_notification'
  | 'data_import'
  | 'db_backup'
  | 'analytics_rollup'
  | 'payment_reconciliation';

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed' | 'dead_letter';

export interface Job<T = any> {
  id: string;
  type: JobType;
  payload: T;
  status: JobStatus;
  progress: number;
  attempts: number;
  max_attempts: number;
  result?: any;
  error?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export type JobHandler<T = any> = (payload: T, updateProgress: (pct: number) => void) => Promise<any>;

export class QueueService {
  private static jobs = new Map<string, Job>();
  private static handlers = new Map<JobType, JobHandler>();
  private static isProcessing = false;
  private static queue: string[] = [];

  static registerHandler<T = any>(type: JobType, handler: JobHandler<T>) {
    this.handlers.set(type, handler);
  }

  /**
   * Enqueue a new background job with automatic retry parameters.
   */
  static async enqueue<T = any>(type: JobType, payload: T, maxAttempts = 3): Promise<Job<T>> {
    const id = `job-${uuidv4().substring(0, 8)}`;
    const job: Job<T> = {
      id,
      type,
      payload,
      status: 'queued',
      progress: 0,
      attempts: 0,
      max_attempts: maxAttempts,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.jobs.set(id, job);
    this.queue.push(id);
    Logger.info(`Job enqueued: ${id} (Type: ${type})`, { job_id: id, type });

    // Trigger queue processor asynchronously
    setTimeout(() => this.processNext(), 50);

    return job;
  }

  private static async processNext() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    const jobId = this.queue.shift();
    if (!jobId) {
      this.isProcessing = false;
      return;
    }

    const job = this.jobs.get(jobId);
    if (!job) {
      this.isProcessing = false;
      return;
    }

    const handler = this.handlers.get(job.type);
    if (!handler) {
      job.status = 'failed';
      job.error = `No handler registered for job type ${job.type}`;
      job.updated_at = new Date().toISOString();
      this.isProcessing = false;
      this.processNext();
      return;
    }

    job.status = 'processing';
    job.attempts++;
    job.updated_at = new Date().toISOString();

    const updateProgress = (pct: number) => {
      job.progress = Math.min(100, Math.max(0, pct));
      job.updated_at = new Date().toISOString();
    };

    try {
      Logger.info(`Processing job ${job.id} (Attempt ${job.attempts}/${job.max_attempts})`);
      const result = await handler(job.payload, updateProgress);
      job.status = 'completed';
      job.progress = 100;
      job.result = result;
      job.completed_at = new Date().toISOString();
      job.updated_at = new Date().toISOString();
      Logger.info(`Job completed successfully: ${job.id}`);
    } catch (err: any) {
      job.error = err.message || 'Unknown job execution failure';
      Logger.error(`Job failure in ${job.id}:`, err);

      if (job.attempts < job.max_attempts) {
        job.status = 'queued';
        // Exponential backoff retry
        setTimeout(() => {
          this.queue.push(job.id);
          this.processNext();
        }, Math.pow(2, job.attempts) * 500);
      } else {
        job.status = 'dead_letter';
        Logger.warn(`Job ${job.id} moved to Dead-Letter Queue after ${job.attempts} failed attempts`);
      }
    } finally {
      this.isProcessing = false;
      // Continue draining queue
      setTimeout(() => this.processNext(), 10);
    }
  }

  static getJob(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  static listJobs(type?: JobType, status?: JobStatus): Job[] {
    let list = Array.from(this.jobs.values());
    if (type) list = list.filter(j => j.type === type);
    if (status) list = list.filter(j => j.status === status);
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  static getMetrics() {
    const all = Array.from(this.jobs.values());
    return {
      total: all.length,
      queued: all.filter(j => j.status === 'queued').length,
      processing: all.filter(j => j.status === 'processing').length,
      completed: all.filter(j => j.status === 'completed').length,
      failed: all.filter(j => j.status === 'failed').length,
      dead_letter: all.filter(j => j.status === 'dead_letter').length
    };
  }
}

// Register standard background workers
QueueService.registerHandler('pdf_generate', async (payload, progress) => {
  progress(25);
  // Simulated or direct PDF background worker
  await new Promise(r => setTimeout(r, 100));
  progress(75);
  await new Promise(r => setTimeout(r, 50));
  return { generated_url: `/uploads/reports/REP-${Date.now()}.pdf`, size_bytes: 4096 };
});

QueueService.registerHandler('bulk_notification', async (payload, progress) => {
  progress(50);
  await new Promise(r => setTimeout(r, 80));
  return { dispatched_count: 1, channel: payload.channel || 'all' };
});

QueueService.registerHandler('db_backup', async (payload, progress) => {
  progress(50);
  await new Promise(r => setTimeout(r, 100));
  return { backup_id: `bak-${Date.now()}`, status: 'completed' };
});

export default QueueService;
