const { externalContractAddresses, saveDeployedAddress, verifyOnEtherscan } = require('./shared')
const SetPlatformFeeSpell = artifacts.require('SetPlatformFeeSpell')

module.exports = async function(deployer, network, accounts) {
	let externalAddresses

	if(network == 'kovan') {
		externalAddresses = externalContractAddresses.kovan
	} else {
		return
	}

	await deployer.deploy(SetPlatformFeeSpell)

	await verifyOnEtherscan(network, SetPlatformFeeSpell.address, 'SetPlatformFeeSpell')
	saveDeployedAddress(network, 'setPlatformFeeSpell', SetPlatformFeeSpell.address)
}
