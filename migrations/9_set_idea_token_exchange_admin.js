const { loadDeployedAddress } = require('./shared')

const IdeaTokenExchange = artifacts.require('IdeaTokenExchange')

module.exports = async function(deployer, network) {
	
	if(network != 'kovan') {
		return
	}

	const ideaTokenExchange = await IdeaTokenExchange.at(loadDeployedAddress(network, 'ideaTokenExchange'))
	await ideaTokenExchange.setOwner(loadDeployedAddress(network, 'dsPauseProxy'))
}
