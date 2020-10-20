const { saveDeployedAddress, saveDeployedABI } = require('./shared')

/* eslint-disable-next-line no-undef */
const AuthorizeInterestWithdrawerSpell = artifacts.require('AuthorizeInterestWithdrawerSpell')

module.exports = async function(deployer, network) {
    
	if(network != 'kovan') {
		return
	}

	await deployer.deploy(AuthorizeInterestWithdrawerSpell)

	saveDeployedAddress(network, 'authorizeInterestWithdrawerSpell', AuthorizeInterestWithdrawerSpell.address)
	saveDeployedABI(network, 'authorizeInterestWithdrawerSpell', AuthorizeInterestWithdrawerSpell.abi)
}
