// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { expect } from 'chai';
import { ScanReport, ScanRunResultResponse, WebApiErrorCodes } from 'service-library';
import { TestEnvironment } from '../common-types';
import { test } from '../test-decorator';
import { FunctionalTestGroup } from './functional-test-group';

/* eslint-disable @typescript-eslint/no-unused-expressions */

export class ScanReportTestGroup extends FunctionalTestGroup {
    @test(TestEnvironment.all)
    public async testReportGenerated(): Promise<void> {
        const response = await this.a11yServiceClient.getScanStatus(this.testContextData.scanId);

        this.ensureResponseSuccessStatusCode(response);
        const reports = (<ScanRunResultResponse>response.body).reports;

        expect(reports, 'Expected a valid reports response result').to.not.be.undefined;
        expect(
            reports.find((r) => r.format === 'sarif'),
            `Expected 'sarif' report to be returned`,
        ).to.not.be.undefined;
        expect(
            reports.find((r) => r.format === 'html'),
            `Expected 'html' report to be returned`,
        ).to.not.be.undefined;
        expect(
            reports.find((r) => r.format === 'axe'),
            `Expected 'axe' report to be returned`,
        ).to.not.be.undefined;
        expect(
            reports.find((r) => r.format === 'page.mhtml'),
            `Expected page snapshot 'page.mhtml' report to be returned`,
        ).to.not.be.undefined;
        expect(
            reports.find((r) => r.format === 'page.png'),
            `Expected page screenshot 'page.png' report to be returned`,
        ).to.not.be.undefined;
    }

    @test(TestEnvironment.all)
    public async testGetReports(): Promise<void> {
        const response = await this.a11yServiceClient.getScanStatus(this.testContextData.scanId);
        const reportsInfo = (<ScanRunResultResponse>response.body).reports;
        await Promise.all(
            reportsInfo.map(async (reportData: ScanReport) => {
                const reportResponse = await this.a11yServiceClient.getScanReport(this.testContextData.scanId, reportData.reportId);

                this.ensureResponseSuccessStatusCode(response);
                expect(reportResponse.body, 'Get Scan Report API should return response with defined body').to.not.be.undefined;
            }),
        );
    }

    @test(TestEnvironment.all)
    public async testGetScanReportWithInvalidGuid(): Promise<void> {
        const invalidGuid = 'invalid guid';
        const response = await this.a11yServiceClient.getScanReport(this.testContextData.scanId, invalidGuid);

        this.expectWebApiErrorResponse(WebApiErrorCodes.invalidResourceId, response);
    }

    @test(TestEnvironment.all)
    public async testGetScanReportWithInvalidScanId(): Promise<void> {
        const invalidGuid: string = '47cd7291-a928-6c96-bdb8-4be18b5a1305';
        const response = await this.a11yServiceClient.getScanReport(this.testContextData.scanId, invalidGuid);

        this.expectWebApiErrorResponse(WebApiErrorCodes.resourceNotFound, response);
    }
}
