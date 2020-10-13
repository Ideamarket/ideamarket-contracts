const { externalContractAddresses, loadDeployedAddress } = require('./shared')
const { admin } = require('@openzeppelin/truffle-upgrades')

module.exports = async function(deployer, network, accounts) {
    let externalAddresses

    if(network == 'kovan') {
        externalAddresses = externalContractAddresses.kovan
    } else {
        return
    }

    await admin.transferProxyAdminOwnership(loadDeployedAddress(network, 'dsPauseProxy'))
}


