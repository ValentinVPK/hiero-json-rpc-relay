// SPDX-License-Identifier: Apache-2.0

/**
 * A lookup from an ethereum transaction hash to the Hedera consensus timestamp of the transaction it
 * belongs to.
 *
 * The Mirror Node files every record by consensus timestamp and indexes it by hash separately, so a record
 * can already be queryable by timestamp while its hash index is still being written. This index keeps the
 * timestamp the relay has already seen while serving a block, so a later by-hash request for the same
 * transaction can be resolved by timestamp instead.
 *
 * Only synthetic transactions are recorded - the fabricated records the Mirror Node creates for
 * HTS transfers. They are the ones with no by-hash route of their own, and the read side builds a
 * synthetic receipt from whatever it finds, so a normal transaction must never end up here.
 *
 * Timestamps are stored verbatim in the Mirror Node's `seconds.nanoseconds` form (e.g.
 * `1786958468.715212954`): the full nanosecond precision identifies exactly one transaction, so the value
 * is never truncated or converted to a number.
 */
export interface ITransactionTimestampIndex {
  /**
   * Records the hash to consensus timestamp mapping for a batch of transactions, overwriting any existing
   * entry for the same hash.
   *
   * Writers hand over a whole block's worth of entries at once, so implementations persist them in a single
   * round trip rather than one call per entry.
   *
   * @param entries - `[hash, consensusTimestamp]` pairs; the hash is 0x-prefixed hex, the timestamp is the
   *   Mirror Node's `seconds.nanoseconds` string.
   */
  setMany(entries: ReadonlyArray<readonly [hash: string, consensusTimestamp: string]>): Promise<void>;

  /**
   * Retrieves the consensus timestamp recorded for a transaction hash.
   *
   * @param hash - The transaction's 0x-prefixed hash.
   * @returns The `seconds.nanoseconds` consensus timestamp, or null when nothing is recorded.
   */
  get(hash: string): Promise<string | null>;
}
