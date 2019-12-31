// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.
import { AzureServicesIocTypes, BatchTaskParameterProvider, registerAzureServicesToContainer } from 'azure-services';
import { setupRuntimeConfigContainer } from 'common';
import { Container } from 'inversify';
import { registerLoggerToContainer } from 'logger';
import { ScanTaskParameterProvider } from './batch/scan-task-parameter-provider';
import { ScannerBatchTaskConfig } from './batch/scanner-batch-task-config';

export function setupWebApiScanJobManagerContainer(): Container {
    const container = new Container({ autoBindInjectable: true });
    setupRuntimeConfigContainer(container);
    registerLoggerToContainer(container);
    registerAzureServicesToContainer(container);

    container
        .bind(ScannerBatchTaskConfig)
        .toSelf()
        .inSingletonScope();

    container
        .bind<BatchTaskParameterProvider>(AzureServicesIocTypes.BatchTaskParameterProvider)
        .to(ScanTaskParameterProvider)
        .inSingletonScope();

    return container;
}
