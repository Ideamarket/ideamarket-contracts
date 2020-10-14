const { externalContractAddresses, saveDeployedAddress, verifyOnEtherscan } = require('./shared')
const AuthorizeInterestWithdrawerSpell = artifacts.require('AuthorizeInterestWithdrawerSpell')

module.exports = async function(deployer, network, accounts) {
    let externalAddresses

    if(network == 'kovan') {
        externalAddresses = externalContractAddresses.kovan
    } else {
        return
    }

    await deployer.deploy(AuthorizeInterestWithdrawerSpell)

    await verifyOnEtherscan(network, AuthorizeInterestWithdrawerSpell.address, 'AuthorizeInterestWithdrawerSpell')
    saveDeployedAddress(network, 'authorizeInterestWithdrawerSpell', AuthorizeInterestWithdrawerSpell.address)
}
