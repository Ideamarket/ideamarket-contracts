const { externalContractAddresses, saveDeployedAddress, verifyOnEtherscan } = require('./shared')
const SetTradingFeeSpell = artifacts.require('SetTradingFeeSpell')

module.exports = async function(deployer, network, accounts) {
	let externalAddresses

	if(network == 'kovan') {
		externalAddresses = externalContractAddresses.kovan
	} else {
		return
	}

	await deployer.deploy(SetTradingFeeSpell)

	await verifyOnEtherscan(network, SetTradingFeeSpell.address, 'SetTradingFeeSpell')
	saveDeployedAddress(network, 'setTradingFeeSpell', SetTradingFeeSpell.address)
}
