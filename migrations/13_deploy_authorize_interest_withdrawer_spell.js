const { saveDeployedAddress, verifyOnEtherscan } = require('./shared')
const AuthorizeInterestWithdrawerSpell = artifacts.require('AuthorizeInterestWithdrawerSpell')

module.exports = async function(deployer, network) {
    
	if(network != 'kovan') {
		return
	}

	await deployer.deploy(AuthorizeInterestWithdrawerSpell)

	await verifyOnEtherscan(network, AuthorizeInterestWithdrawerSpell.address, 'AuthorizeInterestWithdrawerSpell')
	saveDeployedAddress(network, 'authorizeInterestWithdrawerSpell', AuthorizeInterestWithdrawerSpell.address)
}
