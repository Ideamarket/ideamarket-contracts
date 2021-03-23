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

	console.log('Network', l2NetworkName)
	console.log('Deployer ', deployerAddress)
	const yn = await read('Correct? [Y/n]: ')
	if (yn !== 'Y' && yn !== 'y') {
		console.log('abort')
		return
	}
	console.log('')

	let contractFactory
	let deployed

	console.log('Deploying IdeaTokenExchangeOVM')
	contractFactory = await l2ethers.getContractFactory('IdeaTokenExchangeOVM')
	deployed = await contractFactory.deploy()
	await deployed.deployed()
	saveDeployedAddress(l2NetworkName, 'ideaTokenExchangeOVMLogic', deployed.address)
	saveDeployedABI(l2NetworkName, 'ideaTokenExchangeOVM', artifacts.readArtifactSync('IdeaTokenExchangeOVM').abi)

	console.log('Deploying IdeaTokenFactoryOVM')
	contractFactory = await l2ethers.getContractFactory('IdeaTokenFactoryOVM')
	deployed = await contractFactory.deploy()
	await deployed.deployed()
	saveDeployedAddress(l2NetworkName, 'ideaTokenFactoryOVMLogic', deployed.address)
	saveDeployedABI(l2NetworkName, 'ideaTokenFactoryOVM', artifacts.readArtifactSync('IdeaTokenFactoryOVM').abi)
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
