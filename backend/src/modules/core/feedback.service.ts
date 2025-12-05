import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import type { Order } from './orders.service';

export type FeedbackRecord = {
  orderId: string;
  shortCode: string;
  ease: number; // 1..5
  speed: number; // 1..5
  quality: number; // 1..5
  avg: number; // 1..5
  comment?: string;
  createdAt: string; // ISO
};

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger('FeedbackService');
  private readonly FEEDBACK_KEY_PREFIX = 'feedback#';
  private readonly ZSET_BAD = 'feedback:bad';
  private readonly HASH_STATS = 'feedback:stats'; // fields: count, sum_ease, sum_speed, sum_quality

  constructor(private readonly redis: RedisService) {}

  private key(orderId: string) { return `${this.FEEDBACK_KEY_PREFIX}${orderId}`; }

  async has(orderId: string): Promise<boolean> {
    const r = this.redis.redis;
    const exists = await r.exists(this.key(orderId));
    return exists > 0;
  }

  private normalizeScore(v: any): number {
    const n = Number(v);
    if (!Number.isFinite(n)) return 0;
    if (n < 1) return 1;
    if (n > 5) return 5;
    return Math.round(n);
  }

  async submit(order: Order, input: { ease: any; speed: any; quality: any; comment?: string | null }): Promise<FeedbackRecord> {
    const ease = this.normalizeScore(input?.ease);
    const speed = this.normalizeScore(input?.speed);
    const quality = this.normalizeScore(input?.quality);
    const avg = Math.round(((ease + speed + quality) / 3) * 10) / 10; // one decimal for storage
    const comment = (input?.comment || '').toString().trim();
    const rec: FeedbackRecord = {
      orderId: order.id,
      shortCode: order.shortCode,
      ease,
      speed,
      quality,
      avg,
      comment: comment || undefined,
      createdAt: new Date().toISOString(),
    };

    const r = this.redis.redis;
    const key = this.key(order.id);
    // Set feedback atomically only if not exists
    const ok = await r.set(key, JSON.stringify(rec), 'NX');
    if (ok !== 'OK') {
      throw new Error('feedback_already_exists');
    }

    // Update aggregates and bad list
    try {
      const multi = r.multi();
      multi.hincrby(this.HASH_STATS, 'count', 1);
      // Use floats for sums
      multi.hincrbyfloat(this.HASH_STATS, 'sum_ease', ease);
      multi.hincrbyfloat(this.HASH_STATS, 'sum_speed', speed);
      multi.hincrbyfloat(this.HASH_STATS, 'sum_quality', quality);
      if (avg < 3) {
        multi.zadd(this.ZSET_BAD, Date.now(), order.id);
        // Optional trimming to keep structure small (keep latest 200 bad entries)
        multi.zremrangebyrank(this.ZSET_BAD, 0, -201);
      }
      await multi.exec();
    } catch (e) {
      // Do not throw; feedback already stored. Just log.
      this.logger.warn(`Failed to update feedback aggregates for order ${order.id}: ${String((e as any)?.message || e)}`);
    }

    return rec;
  }

  async summary(limitBad = 50): Promise<{
    count: number;
    overallAvg: number;
    perCategory: { ease: number; speed: number; quality: number };
    latestBad: Array<FeedbackRecord>;
  }> {
    const r = this.redis.redis;
    let count = 0, sum_ease = 0, sum_speed = 0, sum_quality = 0;
    try {
      const stats = await r.hgetall(this.HASH_STATS);
      if (stats) {
        count = Number(stats.count || 0) || 0;
        sum_ease = Number(stats.sum_ease || 0) || 0;
        sum_speed = Number(stats.sum_speed || 0) || 0;
        sum_quality = Number(stats.sum_quality || 0) || 0;
      }
    } catch { /* no-op */ void 0; }

    const perCategory = {
      ease: count > 0 ? Math.round((sum_ease / count) * 10) / 10 : 0,
      speed: count > 0 ? Math.round((sum_speed / count) * 10) / 10 : 0,
      quality: count > 0 ? Math.round((sum_quality / count) * 10) / 10 : 0,
    };
    const overallAvg = count > 0 ? Math.round(((sum_ease + sum_speed + sum_quality) / (3 * count)) * 10) / 10 : 0;

    // Latest bad feedbacks (avg < 3)
    const badIds = await r.zrevrange(this.ZSET_BAD, 0, Math.max(0, limitBad - 1));
    let latestBad: FeedbackRecord[] = [];
    if (badIds.length) {
      const keys = badIds.map((id) => this.key(id));
      const rows = await r.mget(...keys);
      latestBad = rows
        .map((raw) => {
          try { return raw ? (JSON.parse(raw) as FeedbackRecord) : null; } catch { return null; }
        })
        .filter((x): x is FeedbackRecord => !!x && typeof x.avg === 'number' && x.avg < 3)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    }

    return { count, overallAvg, perCategory, latestBad };
  }
}
