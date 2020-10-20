require('dotenv').config()
const fs = require('fs')

/* eslint-disable-next-line no-undef */
const AdminUpgradeabilityProxy = artifacts.require('AdminUpgradeabilityProxy')

module.exports.deploymentParams = {
	'kovan': {
		timelockDelay: '1'
	}
}

module.exports.externalContractAddresses = {
	'kovan': {
		'multisig': '0x4e6a11b687F35fA21D92731F9CD2f231C61f9151',
		'dai': '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa',
		'cDai': '0xF0d0EB522cfa50B716B3b1604C4F0fA6f04376AD',
		'comp': '0x61460874a7196d6a22D1eE4922473664b3E95270',
		'weth': '0xd0A1E359811322d97991E03f863a0C30C2cF029C',
		'uniswapV2Router02': '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
	}
}

module.exports.saveDeployedAddress = function(network, contract, address) {
	let addresses = {}
	const path = 'deployed/deployed-' + network + '.json'
	if(fs.existsSync(path)) {
		const raw = fs.readFileSync(path)
		addresses = JSON.parse(raw)
	}

	addresses[contract] = address
	fs.writeFileSync(path, JSON.stringify(addresses, undefined, 4))
}

module.exports.saveDeployedABI = function(network, contract, abi) {
	let abis = {}
	const path = 'deployed/abis-' + network + '.json'
	if(fs.existsSync(path)) {
		const raw = fs.readFileSync(path)
		abis = JSON.parse(raw)
	}

	abis[contract] = abi
	fs.writeFileSync(path, JSON.stringify(abis))
}

module.exports.loadDeployedAddress = function(network, contract) {
	const path = 'deployed/deployed-' + network + '.json'
	const raw = fs.readFileSync(path)
	const addresses = JSON.parse(raw)
	return addresses[contract]
}

module.exports.deployProxy = async function(artifact, deployer, admin, ...args) {
	// Deploy the logic contract
	await deployer.deploy(artifact)
	const logicContract = await artifact.at(artifact.address)

	// Proxy will delegatecall into the initializer
	const data = logicContract.contract.methods.initialize(...args).encodeABI()

	await deployer.deploy(AdminUpgradeabilityProxy, logicContract.address, admin, data)

	return [AdminUpgradeabilityProxy.address, logicContract.address]
}
