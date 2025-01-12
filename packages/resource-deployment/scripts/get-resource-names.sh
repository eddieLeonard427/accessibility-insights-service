#!/bin/bash

# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

if [[ -z "$resourceGroupName" ]]; then
    echo "Resource group name not set."
    exit 1
fi

storageAccountName=$(
    az storage account list \
        --resource-group "$resourceGroupName" \
        --query "[?starts_with(name,'allystorage')].name|[0]" \
        -o tsv
)

if [[ -z $storageAccountName ]]; then
    echo "Unable to get storage account for resource group $resourceGroupName"
    return
fi

resourceGroupSuffix=${storageAccountName:11}

cosmosAccountName="allycosmos$resourceGroupSuffix"
keyVault="allyvault$resourceGroupSuffix"
apiManagementName="apim-a11y$resourceGroupSuffix"
webApiFuncAppName="web-api-allyfuncapp$resourceGroupSuffix"
webWorkersFuncAppName="web-workers-allyfuncapp$resourceGroupSuffix"
e2eWebApisFuncAppName="e2e-web-apis-allyfuncapp$resourceGroupSuffix"
appInsightsName="allyinsights$resourceGroupSuffix"
batchAccountName="allybatch$resourceGroupSuffix"
containerRegistryName="allyregistry$resourceGroupSuffix"
vnetName="vnet-a11y$resourceGroupSuffix"
