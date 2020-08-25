// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { reporterFactory } from 'accessibility-insights-report';
import { ServiceConfiguration } from 'common';
import * as inversify from 'inversify';
import { ConsoleLoggerClient, GlobalLogger } from 'logger';
import { ApifyResourceCreator } from './apify-resources/resource-creator';
import { AxePuppeteerFactory } from './axe-puppeteer/axe-puppeteer-factory';
import { CrawlerConfiguration } from './crawler/crawler-configuration';
import { CrawlerFactory } from './crawler/crawler-factory';
import { PageProcessorFactory } from './page-processors/page-processor-factory';

export function setupCrawlerContainer(): inversify.Container {
    const container = new inversify.Container({ autoBindInjectable: true });
    container.bind(CrawlerConfiguration).toSelf().inSingletonScope();
    container.bind(CrawlerFactory).toSelf().inSingletonScope();
    container.bind(ApifyResourceCreator).toSelf().inSingletonScope();
    container.bind(PageProcessorFactory).toSelf().inSingletonScope();
    container.bind('ReporterFactory').toConstantValue(reporterFactory);
    container.bind<AxePuppeteerFactory>(AxePuppeteerFactory).toSelf().inSingletonScope();

    container.bind(GlobalLogger).toConstantValue(new GlobalLogger([new ConsoleLoggerClient(new ServiceConfiguration(), console)], process));

    return container;
}