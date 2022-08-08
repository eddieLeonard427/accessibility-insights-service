// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { isEmpty } from 'lodash';
import * as Puppeteer from 'puppeteer';
import { AuthenticationMethod } from './authentication-method';

export class DatacenterSecurityTokenServiceAuthentication implements AuthenticationMethod {
    constructor(private readonly accountName: string, private readonly accountPassword: string) {}

    public async authenticate(page: Puppeteer.Page, attemptNumber: number = 1): Promise<void> {
        await page.goto('https://phoneregistration.microsoft.com/signin');

        if (this.authenticationSucceeded(page)) {
            return;
        }

        await page.authenticate({ username: `${this.accountName}`, password: `${this.accountPassword}` });
        await page.goto('https://phoneregistration.microsoft.com/');
        if (!this.authenticationSucceeded(page)) {
            if (attemptNumber > 4) {
                console.error(`Attempted authentication ${attemptNumber} times and ultimately failed.`);

                return;
            }

            const errorText: string = await page.$eval('#errorText', (el) => el.textContent).catch(() => '');
            if (!isEmpty(errorText)) {
                console.error(`Authentication failed with error: ${errorText}`);
            }
            await this.authenticate(page, attemptNumber + 1);

            return;
        }
    }

    private authenticationSucceeded(page: Puppeteer.Page): boolean {
        const currentUrl = page.url();
        if (!currentUrl.match('^https://phoneregistration.microsoft.com/')) {
            return false;
        }
        console.info('Authentication succeeded.');

        return true;
    }
}
