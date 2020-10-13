const { externalContractAddresses, saveDeployedAddress, loadDeployedAddress } = require('./shared')
const { deployProxy } = require('@openzeppelin/truffle-upgrades')

const InterestManagerCompound = artifacts.require('InterestManagerCompound')

module.exports = async function(deployer, network, accounts) {
    let externalAddresses

    if(network == 'kovan') {
        externalAddresses = externalContractAddresses.kovan
    } else {
        return
    }

    const interestManager = await deployProxy(InterestManagerCompound,
                                              [
                                                accounts[0], // owner - this will be changed to the exchange later
                                                externalAddresses.dai,
                                                externalAddresses.cDai,
                                                externalAddresses.comp,
                                                externalAddresses.multisig
                                              ],
                                              { deployer })

    saveDeployedAddress(network, 'interestManager', interestManager.address)
}
