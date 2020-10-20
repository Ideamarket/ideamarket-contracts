const { saveDeployedAddress, loadDeployedAddress, saveDeployedABI } = require('./shared')

/* eslint-disable-next-line no-undef */
const ProxyAdmin = artifacts.require('ProxyAdmin')

module.exports = async function(deployer, network) {

	if(network != 'kovan') {
		return
	}

	await deployer.deploy(ProxyAdmin, loadDeployedAddress(network, 'dsPauseProxy'))

	saveDeployedAddress(network, 'proxyAdmin', ProxyAdmin.address)
	saveDeployedABI(network, 'proxyAdmin', ProxyAdmin.abi)
}
