const { saveDeployedAddress, loadDeployedAddress, verifyOnEtherscan } = require('./shared')

const ProxyAdmin = artifacts.require('ProxyAdmin')

module.exports = async function(deployer, network) {

	if(network != 'kovan') {
		return
	}

	await deployer.deploy(ProxyAdmin, loadDeployedAddress(network, 'dsPauseProxy'))

	await verifyOnEtherscan(network, ProxyAdmin.address, 'ProxyAdmin')
	saveDeployedAddress(network, 'proxyAdmin', ProxyAdmin.address)
}
