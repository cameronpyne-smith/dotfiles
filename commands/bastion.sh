export MSYS_NO_PATHCONV=1
az account set --subscription 98d01887-da35-471b-b1b0-9e9749141690
az network bastion ssh --name bastion-xmlint-hub-dev-uks --resource-group rg-xmlint-hub-dev-uks --target-resource-id '/subscriptions/98d01887-da35-471b-b1b0-9e9749141690/resourceGroups/rg-xmlint-hub-dev-uks/providers/Microsoft.Compute/virtualMachines/ukazjb-000007003' --auth-type AAD
