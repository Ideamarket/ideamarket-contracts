const { saveDeployedAddress, verifyOnEtherscan } = require('./shared')
const AuthorizePlatformFeeWithdrawerSpell = artifacts.require('AuthorizePlatformFeeWithdrawerSpell')

module.exports = async function(deployer, network) {
    
	if(network != 'kovan') {
		return
	}

	await deployer.deploy(AuthorizePlatformFeeWithdrawerSpell)

	await verifyOnEtherscan(network, AuthorizePlatformFeeWithdrawerSpell.address, 'AuthorizePlatformFeeWithdrawerSpell')
	saveDeployedAddress(network, 'authorizePlatformFeeWithdrawerSpell', AuthorizePlatformFeeWithdrawerSpell.address)
}
