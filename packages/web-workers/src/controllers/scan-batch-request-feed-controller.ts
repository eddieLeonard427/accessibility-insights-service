// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { ServiceConfiguration } from 'common';
import { inject, injectable } from 'inversify';
import { isEmpty } from 'lodash';
import { ContextAwareLogger, ScanRequestAcceptedMeasurements } from 'logger';
import {
    OnDemandPageScanRunResultProvider,
    PageScanRequestProvider,
    PartitionKeyFactory,
    ScanDataProvider,
    WebController,
    WebsiteScanResultProvider,
} from 'service-library';
import {
    ItemType,
    OnDemandPageScanBatchRequest,
    OnDemandPageScanRequest,
    OnDemandPageScanResult,
    PartitionKey,
    ScanRunBatchRequest,
    WebsiteScanResult,
} from 'storage-documents';

/* eslint-disable @typescript-eslint/no-explicit-any */

interface OperationBatchEntity {
    scanId: string;
    batchRequest: ScanRunBatchRequest; // ?
    pageScanRequest: OnDemandPageScanRequest;
    pageScanResult: OnDemandPageScanResult;
    websiteScanResult: WebsiteScanResult;
}

@injectable()
export class ScanBatchRequestFeedController extends WebController {
    public readonly apiVersion = '1.0';

    public readonly apiName = 'scan-batch-request-feed';

    public constructor(
        @inject(OnDemandPageScanRunResultProvider) private readonly onDemandPageScanRunResultProvider: OnDemandPageScanRunResultProvider,
        @inject(PageScanRequestProvider) private readonly pageScanRequestProvider: PageScanRequestProvider,
        @inject(ScanDataProvider) private readonly scanDataProvider: ScanDataProvider,
        @inject(WebsiteScanResultProvider) private readonly websiteScanResultProvider: WebsiteScanResultProvider,
        @inject(PartitionKeyFactory) private readonly partitionKeyFactory: PartitionKeyFactory,
        @inject(ServiceConfiguration) protected readonly serviceConfig: ServiceConfiguration,
        @inject(ContextAwareLogger) logger: ContextAwareLogger,
    ) {
        super(logger);
    }

    public async handleRequest(...args: unknown[]): Promise<void> {
        this.logger.setCommonProperties({ source: 'scanBatchCosmosFeedTriggerFunc' });
        this.logger.logInfo('Processing the scan batch documents.');

        const batchDocuments = <OnDemandPageScanBatchRequest[]>args[0];
        await Promise.all(
            batchDocuments.map(async (document) => {
                const addedRequests = await this.processDocument(document);
                const scanRequestAcceptedMeasurements: ScanRequestAcceptedMeasurements = {
                    acceptedScanRequests: addedRequests,
                };
                this.logger.trackEvent('ScanRequestAccepted', { batchId: document.id }, scanRequestAcceptedMeasurements);
                this.logger.logInfo(`The batch request document processed successfully.`);
            }),
        );

        this.logger.logInfo('The scan batch documents processed successfully.');
    }

    protected validateRequest(...args: unknown[]): boolean {
        const batchDocuments = <OnDemandPageScanBatchRequest[]>args[0];

        return this.validateRequestData(batchDocuments);
    }

    private async processDocument(batchDocument: OnDemandPageScanBatchRequest): Promise<number> {
        const requests = batchDocument.scanRunBatchRequest.filter((request) => request.scanId !== undefined);
        if (requests.length > 0) {
            await this.writeRequestsToPermanentContainer(requests, batchDocument.id);
            await this.writeRequestsToQueueContainer(requests, batchDocument.id);

            await this.scanDataProvider.deleteBatchRequest(batchDocument);
            this.logger.logInfo(`Completed deleting batch requests from inbound storage container.`);
        }

        return requests.length;
    }

    private async writeOperationBatchEntity(operationBatchEntity: OperationBatchEntity): Promise<void> {
        const pageScanRequestOpResult = await this.pageScanRequestProvider.writeRequest(operationBatchEntity.pageScanRequest);
        const pageScanResultOpResult = await this.onDemandPageScanRunResultProvider.writeScanRun(operationBatchEntity.pageScanResult);
    }

    private async createOperationBatchEntities(batchRequests: ScanRunBatchRequest[], batchId: string): Promise<OperationBatchEntity[]> {
        const pageScans = await this.onDemandPageScanRunResultProvider.readAllScanRunsForBatch(batchId);

        // select scan requests that do not exist for the current batch id
        return batchRequests
            .filter((batchRequest) => batchRequest.scanId !== undefined && !pageScans.some((pageScan) => pageScan.url === batchRequest.url))
            .map((batchRequest) => this.createOperationBatchEntity(batchRequest, batchId));
    }

    private createOperationBatchEntity(batchRequest: ScanRunBatchRequest, batchId: string): OperationBatchEntity {
        const websiteScanResult = this.createWebsiteScanResult(batchRequest);

        return {
            scanId: batchRequest.scanId,
            batchRequest,
            pageScanRequest: this.createPageScanRequest(batchRequest),
            pageScanResult: this.createPageScanResultEntity(batchRequest, websiteScanResult, batchId),
            websiteScanResult,
        };
    }

    private createPageScanRequest(batchRequest: ScanRunBatchRequest): OnDemandPageScanRequest {
        return {
            id: batchRequest.scanId,
            url: batchRequest.url,
            priority: batchRequest.priority,
            deepScan: batchRequest.deepScan,
            itemType: ItemType.onDemandPageScanRequest,
            partitionKey: PartitionKey.pageScanRequestDocuments,
            ...(isEmpty(batchRequest.site) ? {} : { site: batchRequest.site }),
            ...(isEmpty(batchRequest.reportGroups) ? {} : { reportGroups: batchRequest.reportGroups }),
            ...(batchRequest.privacyScan ? {} : { privacyScan: batchRequest.privacyScan }),
            ...(isEmpty(batchRequest.scanNotifyUrl) ? {} : { scanNotifyUrl: batchRequest.scanNotifyUrl }),
        };
    }

    private createPageScanResultEntity(
        batchRequests: ScanRunBatchRequest,
        websiteScanResult: WebsiteScanResult,
        batchId: string,
    ): OnDemandPageScanResult {
        return {
            id: batchRequests.scanId,
            url: batchRequests.url,
            priority: batchRequests.priority,
            itemType: ItemType.onDemandPageScanRunResult,
            partitionKey: this.partitionKeyFactory.createPartitionKeyForDocument(ItemType.onDemandPageScanRunResult, batchRequests.scanId),
            run: {
                state: 'accepted',
                timestamp: new Date().toJSON(),
            },
            batchRequestId: batchId,
            ...(isEmpty(batchRequests.scanNotifyUrl)
                ? {}
                : {
                      notification: {
                          state: 'pending',
                          scanNotifyUrl: batchRequests.scanNotifyUrl,
                      },
                  }),
            websiteScanRefs: websiteScanResult
                ? [
                      {
                          id: websiteScanResult.id,
                          scanGroupId: websiteScanResult.scanGroupId,
                          scanGroupType: websiteScanResult.scanGroupType,
                      },
                  ]
                : undefined,
            ...(batchRequests.privacyScan ? {} : { privacyScan: batchRequests.privacyScan }),
        };
    }

    private createWebsiteScanResult(batchRequests: ScanRunBatchRequest): WebsiteScanResult {
        const consolidatedGroup = batchRequests.reportGroups
            ? batchRequests.reportGroups.find((group) => group.consolidatedId !== undefined)
            : undefined;

        if (consolidatedGroup === undefined) {
            return undefined;
        }

        const websiteScanRequest: Partial<WebsiteScanResult> = {
            baseUrl: batchRequests.site?.baseUrl,
            scanGroupId: consolidatedGroup.consolidatedId,
            // `deepScanId` value is set only when db document is created
            deepScanId: batchRequests.deepScan ? batchRequests.scanId : undefined,
            scanGroupType: batchRequests.deepScan ? 'deep-scan' : 'consolidated-scan-report',
            pageScans: [
                {
                    scanId: batchRequests.scanId,
                    url: batchRequests.url,
                    timestamp: new Date().toJSON(),
                },
            ],
            knownPages: batchRequests.site?.knownPages,
            discoveryPatterns: batchRequests.site?.discoveryPatterns?.length > 0 ? batchRequests.site.discoveryPatterns : undefined,
            // `created` value is set only when db document is created
            created: new Date().toJSON(),
        };

        return this.websiteScanResultProvider.normalizeToDbDocument(websiteScanRequest);
    }

    // private async writeRequestsToPermanentContainer(requests: ScanRunBatchRequest[], batchId: string): Promise<void> {
    //     const websiteScanResults: { scanId: string; websiteScanResult: WebsiteScanResult }[] = [];
    //     const requestDocuments = requests.map<OnDemandPageScanResult>((request) => {
    //         this.logger.logInfo('Created new scan result document in scan result storage container.', {
    //             batchId,
    //             scanId: request.scanId,
    //         });

    //         let websiteScanRefs: WebsiteScanRef;
    //         const websiteScanResult = this.createWebsiteScanResult(request);
    //         if (websiteScanResult) {
    //             websiteScanRefs = {
    //                 id: websiteScanResult.id,
    //                 scanGroupId: websiteScanResult.scanGroupId,
    //                 scanGroupType: websiteScanResult.scanGroupType,
    //             };
    //             websiteScanResults.push({ scanId: request.scanId, websiteScanResult });
    //             this.logger.logInfo('Referenced website scan result document to the new scan result document.', {
    //                 batchId,
    //                 scanId: request.scanId,
    //                 websiteScanId: websiteScanResult.id,
    //                 scanGroupId: websiteScanResult.scanGroupId,
    //                 scanGroupType: websiteScanResult.scanGroupType,
    //             });
    //         }

    //         return {
    //             id: request.scanId,
    //             url: request.url,
    //             priority: request.priority,
    //             itemType: ItemType.onDemandPageScanRunResult,
    //             partitionKey: this.partitionKeyFactory.createPartitionKeyForDocument(ItemType.onDemandPageScanRunResult, request.scanId),
    //             run: {
    //                 state: 'accepted',
    //                 timestamp: new Date().toJSON(),
    //             },
    //             batchId: batchId,
    //             ...(isEmpty(request.scanNotifyUrl)
    //                 ? {}
    //                 : {
    //                       notification: {
    //                           state: 'pending',
    //                           scanNotifyUrl: request.scanNotifyUrl,
    //                       },
    //                   }),
    //             websiteScanRefs: websiteScanRefs ? [websiteScanRefs] : undefined,
    //             ...(request.privacyScan === undefined ? {} : { privacyScan: request.privacyScan }),
    //         };
    //     });

    //     if (websiteScanResults.length > 0) {
    //         await this.websiteScanResultProvider.mergeOrCreateBatch(websiteScanResults);
    //     }

    //     await this.onDemandPageScanRunResultProvider.writeScanRuns(requestDocuments);
    //     this.logger.logInfo(`Completed adding scan requests to permanent scan result storage container.`);
    // }

    // private createWebsiteScanResult(request: ScanRunBatchRequest): WebsiteScanResult {
    //     if (request.reportGroups !== undefined) {
    //         const consolidatedGroup = request.reportGroups.find((group) => group.consolidatedId !== undefined);
    //         if (consolidatedGroup) {
    //             const websiteScanRequest: Partial<WebsiteScanResult> = {
    //                 baseUrl: request.site?.baseUrl,
    //                 scanGroupId: consolidatedGroup.consolidatedId,
    //                 // `deepScanId` value is set only when db document is created
    //                 deepScanId: request.deepScan ? request.scanId : undefined,
    //                 scanGroupType: request.deepScan ? 'deep-scan' : 'consolidated-scan-report',
    //                 pageScans: [
    //                     {
    //                         scanId: request.scanId,
    //                         url: request.url,
    //                         timestamp: new Date().toJSON(),
    //                     },
    //                 ],
    //                 knownPages: request.site?.knownPages,
    //                 discoveryPatterns: request.site?.discoveryPatterns?.length > 0 ? request.site.discoveryPatterns : undefined,
    //                 // `created` value is set only when db document is created
    //                 created: new Date().toJSON(),
    //             };

    //             return this.websiteScanResultProvider.normalizeToDbDocument(websiteScanRequest);
    //         }
    //     }

    //     return undefined;
    // }

    // private async writeRequestsToQueueContainer(requests: ScanRunBatchRequest[], batchId: string): Promise<void> {
    //     const requestDocuments = requests.map<OnDemandPageScanRequest>((request) => {
    //         const scanNotifyUrl = isEmpty(request.scanNotifyUrl) ? {} : { scanNotifyUrl: request.scanNotifyUrl };
    //         this.logger.logInfo('Created new scan request document in queue storage container.', {
    //             batchId,
    //             scanId: request.scanId,
    //         });

    //         return {
    //             id: request.scanId,
    //             url: request.url,
    //             priority: request.priority,
    //             deepScan: request.deepScan,
    //             itemType: ItemType.onDemandPageScanRequest,
    //             partitionKey: PartitionKey.pageScanRequestDocuments,
    //             ...scanNotifyUrl,
    //             ...(isEmpty(request.site) ? {} : { site: request.site }),
    //             ...(isEmpty(request.reportGroups) ? {} : { reportGroups: request.reportGroups }),
    //             ...(request.privacyScan === undefined ? {} : { privacyScan: request.privacyScan }),
    //         };
    //     });

    //     await this.pageScanRequestProvider.insertRequests(requestDocuments);
    //     this.logger.logInfo(`Completed adding scan requests to scan queue storage container.`);
    // }

    private validateRequestData(documents: OnDemandPageScanBatchRequest[]): boolean {
        if (documents === undefined || documents.length === 0 || !documents.some((d) => d.itemType === ItemType.scanRunBatchRequest)) {
            this.logger.logInfo(`The scan batch documents were malformed.`, { documents: JSON.stringify(documents) });

            return false;
        }

        return true;
    }
}
