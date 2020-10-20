const { externalContractAddresses, saveDeployedAddress, deployProxy, loadDeployedAddress, saveDeployedABI } = require('./shared')

/* eslint-disable-next-line no-undef */
const InterestManagerCompound = artifacts.require('InterestManagerCompound')

module.exports = async function(deployer, network, accounts) {
	let externalAddresses

	if(network == 'kovan') {
		externalAddresses = externalContractAddresses.kovan
	} else {
		return
	}

	const [proxy, logic] = await deployProxy(InterestManagerCompound,
		deployer,
		loadDeployedAddress(network, 'proxyAdmin'),
		accounts[0], // owner - this will be changed to the exchange later
		externalAddresses.dai,
		externalAddresses.cDai,
		externalAddresses.comp,
		externalAddresses.multisig)

	saveDeployedAddress(network, 'interestManager', proxy)
	saveDeployedABI(network, 'interestManager', InterestManagerCompound.abi)
	saveDeployedAddress(network, 'interestManagerLogic', logic)
}
