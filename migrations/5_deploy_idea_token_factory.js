const { externalContractAddresses, saveDeployedAddress, loadDeployedAddress } = require('./shared')
const { deployProxy, admin } = require('@openzeppelin/truffle-upgrades')

const IdeaTokenFactory = artifacts.require('IdeaTokenFactory')

module.exports = async function(deployer, network, accounts) {
    let externalAddresses

    if(network == 'kovan') {
        externalAddresses = externalContractAddresses.kovan
    } else {
        return
    }

    await admin.transferProxyAdminOwnership(loadDeployedAddress(network, 'dsPauseProxy'))

    const ideaTokenFactory = await deployProxy(IdeaTokenFactory,
                                               [
                                                   loadDeployedAddress(network, 'dsPauseProxy'),
                                                   loadDeployedAddress(network, 'ideaTokenExchange')
                                               ],
                                               { deployer })

    saveDeployedAddress(network, 'ideaTokenFactory', ideaTokenFactory.address)
}
