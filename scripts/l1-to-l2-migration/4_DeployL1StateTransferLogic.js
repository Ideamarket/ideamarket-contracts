const { ethers, artifacts } = require('hardhat')
const { saveDeployedAddress, saveDeployedABI } = require('../shared')

const gasPrice = 10000000000 // 10 gwei

async function main() {
	const deployerAccount = (await ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address
	console.log(`Deploying from ${deployerAddress}`)
	console.log('')

	let networkName = (await ethers.provider.getNetwork()).name
	if (networkName === 'kovan') {
		console.log('Using Kovan')
	} else {
		throw 'cannot work with network: ' + networkName
	}

	let contractFactory
	let deployed

	console.log('Deploying IdeaTokenFactoryStateTransfer')
	contractFactory = await ethers.getContractFactory('IdeaTokenFactoryStateTransfer')
	deployed = await contractFactory.deploy({ gasPrice: gasPrice })
	await deployed.deployed()
	saveDeployedAddress(networkName, 'ideaTokenFactoryStateTransferLogic', deployed.address)
	saveDeployedABI(
		networkName,
		'ideaTokenFactoryStateTransferLogic',
		artifacts.readArtifactSync('IdeaTokenFactoryStateTransfer').abi
	)

	console.log('Deploying IdeaTokenExchangeStateTransfer')
	contractFactory = await ethers.getContractFactory('IdeaTokenExchangeStateTransfer')
	deployed = await contractFactory.deploy({ gasPrice: gasPrice })
	await deployed.deployed()
	saveDeployedAddress(networkName, 'ideaTokenExchangeStateTransferLogic', deployed.address)
	saveDeployedABI(
		networkName,
		'ideaTokenExchangeStateTransferLogic',
		artifacts.readArtifactSync('IdeaTokenExchangeStateTransfer').abi
	)

	console.log('Deploying InterestManagerCompoundStateTransfer')
	contractFactory = await ethers.getContractFactory('InterestManagerCompoundStateTransfer')
	deployed = await contractFactory.deploy({ gasPrice: gasPrice })
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
