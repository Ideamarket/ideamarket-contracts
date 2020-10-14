const { saveDeployedAddress, verifyOnEtherscan } = require('./shared')

const Migrations = artifacts.require('Migrations')

module.exports = async function(deployer, network, accounts) {
	if(network != 'kovan') {
		return
	}
  
	await deployer.deploy(Migrations)
	await verifyOnEtherscan(network, Migrations.address, 'Migrations')
	saveDeployedAddress(network, 'migrations', Migrations.address)
}
