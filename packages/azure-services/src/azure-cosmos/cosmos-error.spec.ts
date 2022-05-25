// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { CosmosError } from './cosmos-error';

describe(CosmosError, () => {
    it('should extend Error() class functionally', () => {
        const cosmosError = new CosmosError('message', 'upsertItem', 412, 'response', 'documentId');
        expect(cosmosError).toBeInstanceOf(Error);
        expect(cosmosError.stack.startsWith('Error: message')).toEqual(true);
    });
});
