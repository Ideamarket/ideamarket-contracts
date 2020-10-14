const { externalContractAddresses, deploymentParams, saveDeployedAddress, verifyOnEtherscan } = require('./shared')

const DSPause = artifacts.require('DSPause')

module.exports = async function(deployer, network, accounts) {
	let externalAddresses
	let params

	if(network == 'kovan') {
		externalAddresses = externalContractAddresses.kovan
		params = deploymentParams.kovan
	} else {
		return
	}

	await deployer.deploy(DSPause, params.timelockDelay, externalAddresses.multisig)
	const dsPause = await DSPause.at(DSPause.address)
	const dsPauseProxyAddress = await dsPause._proxy()

	await verifyOnEtherscan(network, DSPause.address, 'DSPause')
	await verifyOnEtherscan(network, dsPauseProxyAddress, 'DSPauseProxy')
	saveDeployedAddress(network, 'dsPause', dsPause.address)
	saveDeployedAddress(network, 'dsPauseProxy', dsPauseProxyAddress)
}
