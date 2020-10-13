const { externalContractAddresses, loadDeployedAddress } = require('./shared')

const InterestManagerCompound = artifacts.require('InterestManagerCompound')

module.exports = async function(deployer, network, accounts) {
    let externalAddresses

    if(network == 'kovan') {
        externalAddresses = externalContractAddresses.kovan
    } else {
        return
    }

    const interestManagerCompound = await InterestManagerCompound.at(loadDeployedAddress(network, 'interestManager'))
    await interestManagerCompound.setOwner(loadDeployedAddress(network, 'ideaTokenExchange'))
}
