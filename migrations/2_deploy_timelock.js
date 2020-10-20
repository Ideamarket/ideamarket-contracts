const { externalContractAddresses, deploymentParams, saveDeployedAddress, saveDeployedABI } = require('./shared')

/* eslint-disable-next-line no-undef */
const DSPause = artifacts.require('DSPause')
const DSPauseProxy = artifacts.require('DSPauseProxy')

module.exports = async function(deployer, network) {
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

	saveDeployedAddress(network, 'dsPause', dsPause.address)
	saveDeployedABI(network, 'dsPause', DSPause.abi)

	saveDeployedAddress(network, 'dsPauseProxy', dsPauseProxyAddress)
	saveDeployedABI(network, 'dsPauseProxy', DSPauseProxy.abi)
}
