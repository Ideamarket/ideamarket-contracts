const { saveDeployedAddress, verifyOnEtherscan } = require('./shared')

/* eslint-disable-next-line no-undef */
const SetTradingFeeSpell = artifacts.require('SetTradingFeeSpell')

module.exports = async function(deployer, network) {
    
	if(network != 'kovan') {
		return
	}

	await deployer.deploy(SetTradingFeeSpell)

	await verifyOnEtherscan(network, SetTradingFeeSpell.address, 'SetTradingFeeSpell')
	saveDeployedAddress(network, 'setTradingFeeSpell', SetTradingFeeSpell.address)
}
