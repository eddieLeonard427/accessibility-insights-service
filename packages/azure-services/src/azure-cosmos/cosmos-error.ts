// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CosmosOperation } from './cosmos-client-wrapper';

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types */

export class CosmosError extends Error {
    constructor(
        public message: string,
        public operation: CosmosOperation,
        public statusCode?: number,
        public response?: any,
        public documentId?: string,
    ) {
        super(message);

        // Set the prototype explicitly.
        Object.setPrototypeOf(this, CosmosError.prototype);
    }
}
