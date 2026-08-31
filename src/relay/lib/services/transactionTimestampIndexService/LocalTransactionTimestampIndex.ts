// SPDX-License-Identifier: Apache-2.0

import { type Logger } from 'pino';
import { Registry } from 'prom-client';

import { LocalLRUCache } from '../../clients/cache/localLRUCache';
import { type ITransactionTimestampIndex } from '../../types/transactionTimestampIndex';
import { TIMESTAMP_INDEX_KEY_PREFIX } from './constants';

/**
 * Local in-memory implementation of {@link ITransactionTimestampIndex}.
 *
 * Delegates to an internal {@link LocalLRUCache} for per-entry TTL and a size bound. A private
 * {@link Registry} is used for that cache so its `rpc_relay_cache` gauge does not clash with the shared
 * relay cache's gauge on the main registry.
 *
 * The entry bound comes from `TX_TIMESTAMP_INDEX_MAX_ENTRIES` rather than the shared `CACHE_MAX`: a busy
 * block contributes many entries at once, which would evict live block, balance and gas price data were the
 * two to share the same pool.
 *
 * Overflowing this cache is harmless - the oldest entries drop early and a by-hash request falls back to the
 * behaviour it had before this index existed.
 */
export class LocalTransactionTimestampIndex implements ITransactionTimestampIndex {
  private readonly cache: LocalLRUCache;

  /** Per-entry TTL in milliseconds (`0`/`-1` = eternal). */
  private readonly ttlMs: number;

  /**
   * @param logger - Logger passed through to the internal cache.
   * @param ttlMs - Per-entry TTL in milliseconds (`0`/`-1` = eternal).
   * @param maxEntries - Upper bound on retained entries.
   */
  constructor(logger: Logger, ttlMs: number, maxEntries: number) {
    this.ttlMs = ttlMs;
    this.cache = new LocalLRUCache(
      logger.child({ name: 'tx-timestamp-index-cache' }),
      new Registry(),
      undefined,
      maxEntries,
    );
  }

  /**
   * TTL as {@link LocalLRUCache.set} expects it: a positive ms value, or `0` for indefinite retention.
   *
   * A consensus timestamp never changes once assigned, so retention here is purely about memory: an expired
   * entry costs a fallback, never correctness.
   *
   * @returns The per-entry TTL in ms, or `0` for indefinite retention.
   */
  private resolveTtl(): number {
    return this.ttlMs > 0 ? this.ttlMs : 0;
  }

  private hashKey(hash: string): string {
    return `${TIMESTAMP_INDEX_KEY_PREFIX}${hash}`;
  }

  async setMany(entries: ReadonlyArray<readonly [string, string]>): Promise<void> {
    for (const [hash, consensusTimestamp] of entries) {
      await this.cache.set(this.hashKey(hash), consensusTimestamp, this.setMany.name, this.resolveTtl());
    }
  }

  async get(hash: string): Promise<string | null> {
    return (await this.cache.get(this.hashKey(hash), this.get.name)) ?? null;
  }
}
