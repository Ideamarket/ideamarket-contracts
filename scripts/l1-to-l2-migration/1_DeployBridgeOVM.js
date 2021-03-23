const { l2ethers, artifacts } = require('hardhat')
const { read, saveDeployedAddress, saveDeployedABI } = require('../shared')
const config = require('./config')

async function main() {
	const deployerAccount = (await l2ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address

	const chainID = (await l2ethers.provider.getNetwork()).chainId
	let l2NetworkName = ''

	if (chainID === 69) {
		l2NetworkName = 'kovan-ovm'
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

	console.log(`Deploying contract BridgeOVM to OVM`)
	const contractFactory = await l2ethers.getContractFactory('BridgeOVM')
	const deployed = await contractFactory.deploy({ gasPrice: deploymentParams.gasPrice })
	await deployed.deployed()

	saveDeployedAddress(l2NetworkName, 'bridgeOVM', deployed.address)
	saveDeployedABI(l2NetworkName, 'bridgeOVM', artifacts.readArtifactSync('BridgeOVM').abi)
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
