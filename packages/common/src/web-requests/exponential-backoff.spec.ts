// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import 'reflect-metadata';

import { exponentialBackOff, backOffOptions } from './exponential-backoff';

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
            await exponentialBackOff(fn, { ...backOffOptions, startingDelay: 10, numOfAttempts });
            // eslint-disable-next-line no-empty
        } catch {}
        expect(fn).toBeCalledTimes(numOfAttempts);
    });

    it('invoke with retry based on HTTP status code', async () => {
        const numOfAttempts = 5;
        fn = jest.fn().mockImplementation(async () => Promise.reject({ statusCode: 429 }));
        try {
            await exponentialBackOff(fn, { ...backOffOptions, startingDelay: 10, numOfAttempts });
            // eslint-disable-next-line no-empty
        } catch {}
        expect(fn).toBeCalledTimes(numOfAttempts);
    });

    it('invoke without retry based on HTTP status code', async () => {
        const numOfAttempts = 5;
        fn = jest.fn().mockImplementation(async () => Promise.reject({ statusCode: 400 }));
        try {
            await exponentialBackOff(fn, { ...backOffOptions, startingDelay: 10, numOfAttempts });
            // eslint-disable-next-line no-empty
        } catch {}
        expect(fn).toBeCalledTimes(1);
    });
});
