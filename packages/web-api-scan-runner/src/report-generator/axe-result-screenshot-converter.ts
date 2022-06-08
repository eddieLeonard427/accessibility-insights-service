// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { injectable } from 'inversify';
import { ReportFormat } from 'storage-documents';
import { AxeScanResults } from 'scanner-global-library';
import { AxeResultConverter } from './axe-result-converter';

@injectable()
export class AxeResultScreenshotConverter implements AxeResultConverter {
    public readonly targetReportFormat: ReportFormat = 'page.png';

    public convert(axeScanResults: AxeScanResults): string {
        return axeScanResults.pageScreenshot;
    }
}
