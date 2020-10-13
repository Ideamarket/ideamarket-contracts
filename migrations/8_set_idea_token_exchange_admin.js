require('dotenv').config()
const { externalContractAddresses, loadDeployedAddress } = require('./shared')

const IdeaTokenExchange = artifacts.require('IdeaTokenExchange')

module.exports = async function(deployer, network, accounts) {
    let externalAddresses

    if(network == 'kovan') {
        externalAddresses = externalContractAddresses.kovan
    } else {
        return
    }

    const ideaTokenExchange = await IdeaTokenExchange.at(loadDeployedAddress(network, 'ideaTokenExchange'))
    await ideaTokenExchange.setOwner(loadDeployedAddress(network, 'dsPauseProxy'))
}
