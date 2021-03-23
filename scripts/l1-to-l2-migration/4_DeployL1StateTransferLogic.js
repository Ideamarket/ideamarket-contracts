const { ethers, artifacts } = require('hardhat')
const { saveDeployedAddress, saveDeployedABI } = require('../shared')
const config = require('./config')

async function main() {
	const deployerAccount = (await ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address

	let networkName = (await ethers.provider.getNetwork()).name
	if (networkName === 'kovan') {
		console.log('Using Kovan')
	} else {
		throw 'cannot work with network: ' + networkName
	}

	const deploymentParams = config.deploymentParams[networkName]

	console.log('Network', networkName)
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

	console.log('Deploying IdeaTokenFactoryStateTransfer')
	contractFactory = await ethers.getContractFactory('IdeaTokenFactoryStateTransfer')
	deployed = await contractFactory.deploy({ gasPrice: deploymentParams.gasPrice })
	await deployed.deployed()
	saveDeployedAddress(networkName, 'ideaTokenFactoryStateTransferLogic', deployed.address)
	saveDeployedABI(
		networkName,
		'ideaTokenFactoryStateTransferLogic',
		artifacts.readArtifactSync('IdeaTokenFactoryStateTransfer').abi
	)

	console.log('Deploying IdeaTokenExchangeStateTransfer')
	contractFactory = await ethers.getContractFactory('IdeaTokenExchangeStateTransfer')
	deployed = await contractFactory.deploy({ gasPrice: deploymentParams.gasPrice })
	await deployed.deployed()
	saveDeployedAddress(networkName, 'ideaTokenExchangeStateTransferLogic', deployed.address)
	saveDeployedABI(
		networkName,
		'ideaTokenExchangeStateTransferLogic',
		artifacts.readArtifactSync('IdeaTokenExchangeStateTransfer').abi
	)

	console.log('Deploying InterestManagerCompoundStateTransfer')
	contractFactory = await ethers.getContractFactory('InterestManagerCompoundStateTransfer')
	deployed = await contractFactory.deploy({ gasPrice: deploymentParams.gasPrice })
	await deployed.deployed()
	saveDeployedAddress(networkName, 'interestManagerCompoundStateTransferLogic', deployed.address)
	saveDeployedABI(
		networkName,
		'interestManagerCompoundStateTransferLogic',
		artifacts.readArtifactSync('InterestManagerCompoundStateTransfer').abi
	)
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
