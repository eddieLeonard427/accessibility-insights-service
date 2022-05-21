// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { exponentialBackOff } from './exponential-backoff';

let fn: () => Promise<boolean>;

describe(exponentialBackOff, () => {
    it('invoke without retry', async () => {
        fn = jest.fn().mockImplementation(() => Promise.resolve(true));
        await exponentialBackOff(fn);
        expect(fn).toBeCalledTimes(1);
    });

    it('invoke with retry', async () => {
        const numOfAttempts = 5;
        fn = jest.fn().mockImplementation(async () => Promise.reject('error'));
        try {
            await exponentialBackOff(fn, { startingDelay: 10, numOfAttempts });
            // eslint-disable-next-line no-empty
        } catch {}
        expect(fn).toBeCalledTimes(numOfAttempts);
    });
});
