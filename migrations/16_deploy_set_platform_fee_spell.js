const { saveDeployedAddress } = require('./shared')

/* eslint-disable-next-line no-undef */
const SetPlatformFeeSpell = artifacts.require('SetPlatformFeeSpell')

module.exports = async function(deployer, network) {
    
	if(network != 'kovan') {
		return
	}

	await deployer.deploy(SetPlatformFeeSpell)

	saveDeployedAddress(network, 'setPlatformFeeSpell', SetPlatformFeeSpell.address)
}
