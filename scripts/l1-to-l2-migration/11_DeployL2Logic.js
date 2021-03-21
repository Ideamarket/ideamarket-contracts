const { l2ethers, artifacts } = require('hardhat')
const { saveDeployedAddress, saveDeployedABI } = require('../shared')

const ethers = undefined

async function main() {
	const deployerAccount = (await l2ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address
	console.log(`Running from ${deployerAddress}`)
	console.log('')

	const chainID = (await l2ethers.provider.getNetwork()).chainId
	let l1NetworkName = ''
	let l2NetworkName = ''

	if (chainID === 69) {
		l1NetworkName = 'kovan'
		l2NetworkName = 'kovan-ovm'
	} else {
		throw `unknown chain id: ${chainID}`
	}

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
