// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { StorageDocument } from './storage-document';
import { ItemType } from './item-type';
import { CookieBannerType, AuthenticationType } from './on-demand-page-scan-result';

/**
 * The client page scan run batch request document.
 */
export interface OnDemandPageScanBatchRequest extends StorageDocument {
    itemType: ItemType.scanRunBatchRequest;
    scanRunBatchRequest: ScanRunBatchRequest[];
}

export interface WebsiteRequest {
    baseUrl: string;
    knownPages?: string[];
    discoveryPatterns?: string[];
}

export interface ReportGroupRequest {
    consolidatedId: string;
}

export interface PrivacyScan {
    cookieBannerType: CookieBannerType;
}

export interface ScanRunBatchRequest {
    scanId: string;
    url: string;
    site?: WebsiteRequest;
    priority: number;
    reportGroups?: ReportGroupRequest[];
    scanNotifyUrl?: string;
    deepScan?: boolean;
    privacyScan?: PrivacyScan;
    authenticationType?: AuthenticationType;
}
