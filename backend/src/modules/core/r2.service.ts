import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type PresignOptions = {
  filename: string;
  contentType?: string;
};

export type PresignResult = {
  uploadUrl: string;
  fileUrl: string;
  key: string;
  contentType: string | undefined;
};

@Injectable()
export class R2Service {
  private s3: S3Client | null = null;
  private bucket: string | null = null;
  private publicBase: string | null = null;
  private keyPrefix: string = 'menu';

  private ensureClient() {
    if (this.s3) return;
    const accountId = process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    const bucket = process.env.R2_BUCKET;
    const endpoint = process.env.R2_S3_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);
    this.publicBase = process.env.R2_PUBLIC_BASE || null;
    // Allow configuring the object key prefix (defaults to "menu")
    const rawPrefix = process.env.R2_UPLOAD_PREFIX;
    if (rawPrefix != null) {
      // normalize: trim spaces and slashes to avoid duplicate separators
      const normalized = rawPrefix.trim().replace(/^\/+|\/+$/g, '');
      this.keyPrefix = normalized.length ? normalized : '';
    }
    if (!accessKeyId || !secretAccessKey || !bucket || !endpoint) {
      // Leave s3 null to signal disabled; callers should handle gracefully.
      this.s3 = null;
      this.bucket = null;
      return;
    }
    this.bucket = bucket;
    this.s3 = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  isEnabled(): boolean {
    this.ensureClient();
    return !!(this.s3 && this.bucket);
  }

  async presignPut(opts: PresignOptions): Promise<PresignResult> {
    this.ensureClient();
    if (!this.s3 || !this.bucket) {
      throw new Error('R2 not configured');
    }
    const safeName = (opts.filename || 'file').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const ext = safeName.includes('.') ? safeName.split('.').pop() : undefined;
    const uid = Math.random().toString(36).slice(2, 10);
    // Flat path under configured prefix (no date subfolders)
    const prefix = this.keyPrefix ? `${this.keyPrefix.replace(/\/+$/,'')}/` : '';
    const key = `${prefix}${uid}-${safeName}`;
    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: opts.contentType,
      ACL: undefined, // R2 ignores
    });
    const uploadUrl = await getSignedUrl(this.s3, cmd, { expiresIn: 60 * 5 });
    const fileUrl = this.publicBase
      ? `${this.publicBase.replace(/\/$/, '')}/${key}`
      : // Default R2 public URL when bucket has a public domain set; if not, this can be used by a CDN configured by user
        `${uploadUrl.split('?')[0]}`;
    return { uploadUrl, fileUrl, key, contentType: opts.contentType };
  }
}
