const { saveDeployedAddress, loadDeployedAddress, verifyOnEtherscan } = require('./shared')

/* eslint-disable-next-line no-undef */
const ProxyAdmin = artifacts.require('ProxyAdmin')

module.exports = async function(deployer, network) {

	if(network != 'kovan') {
		return
	}

	await deployer.deploy(ProxyAdmin, loadDeployedAddress(network, 'dsPauseProxy'))

	await verifyOnEtherscan(network, ProxyAdmin.address, 'ProxyAdmin')
	saveDeployedAddress(network, 'proxyAdmin', ProxyAdmin.address)
}
