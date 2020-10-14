const { externalContractAddresses, saveDeployedAddress, verifyOnEtherscan } = require('./shared')
const DomainNoSubdomainNameVerifier = artifacts.require('DomainNoSubdomainNameVerifier')

module.exports = async function(deployer, network, accounts) {
	let externalAddresses

	if(network == 'kovan') {
		externalAddresses = externalContractAddresses.kovan
	} else {
		return
	}

	await deployer.deploy(DomainNoSubdomainNameVerifier)

	await verifyOnEtherscan(network, DomainNoSubdomainNameVerifier.address, 'DomainNoSubdomainNameVerifier')
	saveDeployedAddress(network, 'domainNoSubdomainNameVerifier', DomainNoSubdomainNameVerifier.address)
}
