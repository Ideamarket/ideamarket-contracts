const { saveDeployedAddress, loadDeployedAddress, deployProxy, verifyOnEtherscan } = require('./shared')

/* eslint-disable-next-line no-undef */
const IdeaTokenFactory = artifacts.require('IdeaTokenFactory')

module.exports = async function(deployer, network) {

	if(network != 'kovan') {
		return
	}

	const [proxy, logic] = await deployProxy(IdeaTokenFactory,
		deployer,
		loadDeployedAddress(network, 'proxyAdmin'),
		loadDeployedAddress(network, 'dsPauseProxy'),
		loadDeployedAddress(network, 'ideaTokenExchange'))

	await verifyOnEtherscan(network, proxy, 'AdminUpgradeabilityProxy')
	await verifyOnEtherscan(network, logic, 'IdeaTokenFactory')
	saveDeployedAddress(network, 'ideaTokenFactory', proxy)
	saveDeployedAddress(network, 'ideaTokenFactoryLogic', logic)
}
