// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { injectable } from 'inversify';

@injectable()
export class StorageConfig {
    public readonly storageName: string = process.env.AZURE_STORAGE_NAME;
    public readonly scanQueue: string = process.env.AZURE_STORAGE_SCAN_QUEUE;
}
