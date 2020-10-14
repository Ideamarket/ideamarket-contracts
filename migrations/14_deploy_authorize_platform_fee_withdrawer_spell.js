const { externalContractAddresses, saveDeployedAddress, verifyOnEtherscan } = require('./shared')
const AuthorizePlatformFeeWithdrawerSpell = artifacts.require('AuthorizePlatformFeeWithdrawerSpell')

module.exports = async function(deployer, network, accounts) {
	let externalAddresses

	if(network == 'kovan') {
		externalAddresses = externalContractAddresses.kovan
	} else {
		return
	}

	await deployer.deploy(AuthorizePlatformFeeWithdrawerSpell)

	await verifyOnEtherscan(network, AuthorizePlatformFeeWithdrawerSpell.address, 'AuthorizePlatformFeeWithdrawerSpell')
	saveDeployedAddress(network, 'authorizePlatformFeeWithdrawerSpell', AuthorizePlatformFeeWithdrawerSpell.address)
}
