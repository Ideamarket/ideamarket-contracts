const { saveDeployedAddress, verifyOnEtherscan } = require('./shared')
const AddMarketSpell = artifacts.require('AddMarketSpell')

module.exports = async function(deployer, network) {

	if(network != 'kovan') {
		return
	}

	await deployer.deploy(AddMarketSpell)

	await verifyOnEtherscan(network, AddMarketSpell.address, 'AddMarketSpell')
	saveDeployedAddress(network, 'addMarketSpell', AddMarketSpell.address)
}
