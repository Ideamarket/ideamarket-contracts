const { ethers, artifacts } = require('hardhat')
const { read, saveDeployedAddress, saveDeployedABI } = require('../shared')
const config = require('./config')

async function main() {
	const deployerAccount = (await ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address

	const chainID = (await ethers.provider.getNetwork()).chainId
	let l2NetworkName = ''

	if (chainID === 421611) {
		l2NetworkName = 'test-avm-l2'
	} else {
		throw `unknown chain id: ${chainID}`
	}
	const deploymentParams = config.deploymentParams[l2NetworkName]

	console.log('Network', l2NetworkName)
	console.log('Deployer ', deployerAddress)
	console.log('Gas Price', deploymentParams.gasPrice)
	const yn = await read('Correct? [Y/n]: ')
	if (yn !== 'Y' && yn !== 'y') {
		console.log('abort')
		return
	}
	console.log('')

	console.log(`Deploying contract BridgeAVM to AVM`)
	const contractFactory = await ethers.getContractFactory('BridgeAVM')
	const deployed = await contractFactory.deploy({ gasPrice: deploymentParams.gasPrice })
	await deployed.deployed()

	saveDeployedAddress(l2NetworkName, 'bridgeAVM', deployed.address)
	saveDeployedABI(l2NetworkName, 'bridgeAVM', artifacts.readArtifactSync('BridgeAVM').abi)
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
