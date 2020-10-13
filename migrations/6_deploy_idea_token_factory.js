const { externalContractAddresses, saveDeployedAddress, loadDeployedAddress, deployProxy } = require('./shared')

const IdeaTokenFactory = artifacts.require('IdeaTokenFactory')

module.exports = async function(deployer, network, accounts) {
    let externalAddresses

    if(network == 'kovan') {
        externalAddresses = externalContractAddresses.kovan
    } else {
        return
    }

    const [proxy, logic] = await deployProxy(IdeaTokenFactory,
                                             deployer,
                                             loadDeployedAddress(network, 'proxyAdmin'),
                                             loadDeployedAddress(network, 'dsPauseProxy'),
                                             loadDeployedAddress(network, 'ideaTokenExchange'))

    saveDeployedAddress(network, 'ideaTokenFactory', proxy)
    saveDeployedAddress(network, 'ideaTokenFactoryLogic', logic)
}
