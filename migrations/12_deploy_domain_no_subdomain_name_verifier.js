const { saveDeployedAddress, verifyOnEtherscan } = require('./shared')
const DomainNoSubdomainNameVerifier = artifacts.require('DomainNoSubdomainNameVerifier')

module.exports = async function(deployer, network) {
	
	if(network != 'kovan') {
		return
	}

	await deployer.deploy(DomainNoSubdomainNameVerifier)

	await verifyOnEtherscan(network, DomainNoSubdomainNameVerifier.address, 'DomainNoSubdomainNameVerifier')
	saveDeployedAddress(network, 'domainNoSubdomainNameVerifier', DomainNoSubdomainNameVerifier.address)
}
