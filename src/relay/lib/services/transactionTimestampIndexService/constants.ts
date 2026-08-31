// SPDX-License-Identifier: Apache-2.0

/**
 * Key namespace for hash to consensus timestamp entries, shared by the local and Redis implementations so
 * the two cannot drift.
 *
 * The physical keys still differ by backing store - {@link LocalLRUCache} prepends its own `cache:` prefix -
 * but both resolve the same logical namespace from this single definition.
 */
export const TIMESTAMP_INDEX_KEY_PREFIX = 'txtimestamp:hash:';
