const { saveDeployedAddress, verifyOnEtherscan } = require('./shared')

/* eslint-disable-next-line no-undef */
const Migrations = artifacts.require('Migrations')

module.exports = async function(deployer, network) {
	if(network != 'kovan') {
		return
	}
  
	await deployer.deploy(Migrations)
	await verifyOnEtherscan(network, Migrations.address, 'Migrations')
	saveDeployedAddress(network, 'migrations', Migrations.address)
}
