const { ethers, artifacts } = require('hardhat')
const { read, saveDeployedAddress, saveDeployedABI } = require('../shared')
const config = require('./config')

async function main() {
	const deployerAccount = (await ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address

	const chainID = (await ethers.provider.getNetwork()).chainId
	let l2NetworkName = ''

	if (chainID === 144545313136048) {
		l2NetworkName = 'kovan-avm'
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

	let contractFactory
	let deployed

	console.log('Deploying IdeaTokenExchangeAVM')
	contractFactory = await ethers.getContractFactory('IdeaTokenExchangeAVM')
	deployed = await contractFactory.deploy({ gasPrice: deploymentParams.gasPrice })
	await deployed.deployed()
	saveDeployedAddress(l2NetworkName, 'ideaTokenExchangeAVMLogic', deployed.address)
	saveDeployedABI(l2NetworkName, 'ideaTokenExchangeAVM', artifacts.readArtifactSync('IdeaTokenExchangeAVM').abi)

	console.log('Deploying IdeaTokenFactoryAVM')
	contractFactory = await ethers.getContractFactory('IdeaTokenFactoryAVM')
	deployed = await contractFactory.deploy({ gasPrice: deploymentParams.gasPrice })
	await deployed.deployed()
	saveDeployedAddress(l2NetworkName, 'ideaTokenFactoryAVMLogic', deployed.address)
	saveDeployedABI(l2NetworkName, 'ideaTokenFactoryAVM', artifacts.readArtifactSync('IdeaTokenFactoryAVM').abi)
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
