const { externalContractAddresses, saveDeployedAddress, loadDeployedAddress, verifyOnEtherscan } = require('./shared')
const AddMarketSpell = artifacts.require('AddMarketSpell')

module.exports = async function(deployer, network, accounts) {
    let externalAddresses

    if(network == 'kovan') {
        externalAddresses = externalContractAddresses.kovan
    } else {
        return
    }

    await deployer.deploy(AddMarketSpell)

    await verifyOnEtherscan(network, AddMarketSpell.address, 'AddMarketSpell')
    saveDeployedAddress(network, 'addMarketSpell', AddMarketSpell.address)
}
