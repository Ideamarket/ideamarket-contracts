const { externalContractAddresses, saveDeployedAddress, loadDeployedAddress } = require('./shared')
const { deployProxy } = require('@openzeppelin/truffle-upgrades')

const IdeaTokenExchange = artifacts.require('IdeaTokenExchange')

module.exports = async function(deployer, network, accounts) {
    let externalAddresses

    if(network == 'kovan') {
        externalAddresses = externalContractAddresses.kovan
    } else {
        return
    }

    const ideaTokenExchange = await deployProxy(IdeaTokenExchange,
                                                [
                                                    accounts[0], // owner - this will be changed to the Timelock later
                                                    externalAddresses.multisig,
                                                    loadDeployedAddress(network, 'interestManager'),
                                                    externalAddresses.dai,
                                                ],
                                                { deployer })

    saveDeployedAddress(network, 'ideaTokenExchange', ideaTokenExchange.address)
}
