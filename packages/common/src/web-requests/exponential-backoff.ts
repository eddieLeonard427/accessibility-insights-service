// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { backOff, IBackOffOptions } from 'exponential-backoff';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types */

export const backOffOptions: Partial<IBackOffOptions> = {
    numOfAttempts: 7,
    startingDelay: 500,
    maxDelay: 15000,
    retry: shouldRetry,
};

/**
 * Delay algorithm:
 * ```typescript
 * const proposedDelay = options.startingDelay * Math.pow(options.timeMultiple, numOfDelayedAttempts);
 * const delay = Math.min(proposedDelay, options.maxDelay);
 * ```
 * Default delay sequence (msec): 500, 1000, 2000, 4000, 8000, 15000
 */
export async function exponentialBackOff<T>(fn: () => Promise<T>, options: Partial<IBackOffOptions> = backOffOptions): Promise<T> {
    return backOff(fn, options);
}

function shouldRetry(e: any): boolean {
    const transientStatusCodes = [
        404 /* Not found */, 408 /* Request Timeout */, 429 /* Too Many Requests */, 500 /* Internal Server Error */, 502 /* Bad Gateway */,
        503 /* Service Unavailable */, 504 /* Gateway Timeout */,
    ];

    if (e.statusCode) {
        return transientStatusCodes.indexOf(e.statusCode) >= 0;
    }

    return true;
}
