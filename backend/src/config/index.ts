import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const configSchema = z.object({
  // Environment & Server
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  API_BASE_URL: z.string().default('http://localhost:5000'),
  CLIENT_BASE_URL: z.string().default('http://localhost:3000'),

  // Database
  DATABASE_DRIVER: z.enum(['sqlite', 'postgres']).default('sqlite'),
  DATABASE_URL: z.string().optional(),
  SQLITE_FILE_PATH: z.string().default('./data/blood_lis.db'),

  // Authentication & Tokens
  JWT_SECRET: z.string().default('mediflow-dev-insecure-secret-key-32bytes-min'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  JWT_REFRESH_SECRET: z.string().default('mediflow-dev-refresh-secret-key-32bytes'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // Master Encryption Key (32 bytes hex or string for AES-256-GCM)
  ENCRYPTION_MASTER_KEY: z.string().default('0123456789abcdef0123456789abcdef'),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 mins
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(500),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(10), // Max login attempts before lockout

  // Storage
  STORAGE_PROVIDER: z.enum(['local', 's3', 'gcs']).default('local'),
  LOCAL_UPLOAD_PATH: z.string().default('./uploads'),
  MAX_FILE_SIZE_BYTES: z.coerce.number().default(20 * 1024 * 1024), // 20 MB

  // Email / SMS / WhatsApp Notification Gateways
  SMTP_HOST: z.string().optional().default('smtp.mailgun.org'),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMS_PROVIDER_API_KEY: z.string().optional(),
  WHATSAPP_API_TOKEN: z.string().optional(),

  // Payment Gateways
  PAYMENT_PROVIDER: z.enum(['mock', 'razorpay', 'stripe']).default('mock'),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),

  // Monitoring & Telemetry
  ENABLE_METRICS: z.coerce.boolean().default(true),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.format());
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Fatal: Invalid production environment variables');
  }
}

export const config = parsed.success ? parsed.data : configSchema.parse({});
export default config;
