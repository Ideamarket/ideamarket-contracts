const { externalContractAddresses, deploymentParams, saveDeployedAddress, loadDeployedAddress } = require('./shared')

const ProxyAdmin = artifacts.require('ProxyAdmin')

module.exports = async function(deployer, network, accounts) {
    let externalAddresses
    let params

    if(network == 'kovan') {
        externalAddresses = externalContractAddresses.kovan
        params = deploymentParams.kovan
    } else {
        return
    }

    await deployer.deploy(ProxyAdmin, loadDeployedAddress(network, 'dsPauseProxy'))

    saveDeployedAddress(network, 'proxyAdmin', ProxyAdmin.address)
}
