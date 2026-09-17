import crypto from 'crypto';
import config from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

export class EncryptionService {
  private static getKey(): Buffer {
    const rawKey = config.ENCRYPTION_MASTER_KEY;
    // Derive 32 bytes key using SHA-256
    return crypto.createHash('sha256').update(rawKey).digest();
  }

  /**
   * Encrypt plaintext into ciphertext with authenticated tag (AES-256-GCM).
   * Format: iv:ciphertext:tag (hex encoded)
   */
  static encrypt(plaintext: string): string {
    if (!plaintext) return '';
    const iv = crypto.randomBytes(IV_LENGTH);
    const key = this.getKey();

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${encrypted}:${tag}`;
  }

  /**
   * Decrypt AES-256-GCM ciphertext back into plaintext.
   */
  static decrypt(payload: string): string {
    if (!payload) return '';
    const parts = payload.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted payload format');
    }

    const [ivHex, encryptedHex, tagHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const key = this.getKey();

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Cryptographic one-way hash with salt for secure reference storage.
   */
  static hash(text: string, salt?: string): string {
    const s = salt || 'mediflow-secure-salt';
    return crypto.createHmac('sha256', s).update(text).digest('hex');
  }
}

export default EncryptionService;
