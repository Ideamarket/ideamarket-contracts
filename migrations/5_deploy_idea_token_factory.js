require('dotenv').config()
const { externalContractAddresses, saveDeployedAddress, loadDeployedAddress } = require('./shared')
const { deployProxy } = require('@openzeppelin/truffle-upgrades')

const IdeaTokenFactory = artifacts.require('IdeaTokenFactory')

module.exports = async function(deployer, network, accounts) {
    let externalAddresses

    if(network == 'kovan') {
        externalAddresses = externalContractAddresses.kovan
    } else {
        return
    }

    const ideaTokenFactory = await deployProxy(IdeaTokenFactory,
                                               [
                                                   loadDeployedAddress(network, 'dsPauseProxy'),
                                                   loadDeployedAddress(network, 'ideaTokenExchange')
                                               ],
                                               { deployer })

    saveDeployedAddress(network, 'ideaTokenFactory', ideaTokenFactory.address)
}
