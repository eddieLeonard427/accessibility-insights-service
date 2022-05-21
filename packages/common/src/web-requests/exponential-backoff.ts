// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { backOff, IBackOffOptions } from 'exponential-backoff';

export const backOffOptions: Partial<IBackOffOptions> = {
    numOfAttempts: 7,
    startingDelay: 500,
    maxDelay: 15000,
};

/**
 * Delay algorithm:
 * ```typescript
 * const proposedDelay = options.startingDelay * Math.pow(options.timeMultiple, numOfDelayedAttempts);
 * const delay = Math.min(proposedDelay, options.maxDelay);
 * ```
 * Default delay sequence, msec: 500, 1000, 2000, 4000, 8000, 15000
 */
export async function exponentialBackOff<T>(fn: () => Promise<T>, options: Partial<IBackOffOptions> = backOffOptions): Promise<T> {
    return backOff(fn, options);
}
