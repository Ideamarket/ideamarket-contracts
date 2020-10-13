const { externalContractAddresses, deploymentParams, saveDeployedAddress } = require('./shared')
const { deployProxy } = require('@openzeppelin/truffle-upgrades')

const DSPause = artifacts.require('DSPause')

module.exports = async function(deployer, network, accounts) {
    let externalAddresses
    let params

    if(network == 'kovan') {
        externalAddresses = externalContractAddresses.kovan
        params = deploymentParams.kovan
    } else {
        return
    }

    const dsPause = await deployProxy(DSPause,
                                      [
                                          params.timelockDelay,
                                          externalAddresses.multisig
                                      ],
                                      { deployer })

    const dsPauseContract = await DSPause.at(dsPause.address)
    const dsPauseProxyAddress = await dsPauseContract._proxy()

    saveDeployedAddress(network, 'dsPause', dsPause.address)
    saveDeployedAddress(network, 'dsPauseProxy', dsPauseProxyAddress)
}
