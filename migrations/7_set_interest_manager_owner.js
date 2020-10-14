const { loadDeployedAddress } = require('./shared')

/* eslint-disable-next-line no-undef */
const InterestManagerCompound = artifacts.require('InterestManagerCompound')

module.exports = async function(deployer, network) {
	
	if(network != 'kovan') {
		return
	}

	const interestManagerCompound = await InterestManagerCompound.at(loadDeployedAddress(network, 'interestManager'))
	await interestManagerCompound.setOwner(loadDeployedAddress(network, 'ideaTokenExchange'))
}
