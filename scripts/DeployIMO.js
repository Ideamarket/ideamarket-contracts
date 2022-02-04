require('dotenv').config({ path: '../.env' })
const { BigNumber } = require('ethers')
const { run, ethers, artifacts } = require('hardhat')
const { saveDeployedAddress, saveDeployedABI } = require('./shared')

const tenPow18 = BigNumber.from('1000000000000000000')

// ----------------- UPDATE THESE -----------------
const allDeploymentParams = {
	avm: {
		gasPrice: 2000000000, // 2 gwei
		drippingIMOSourceRate: BigNumber.from('4').mul(tenPow18),
		amountIMOToSource: BigNumber.from('10000000').mul(tenPow18),
	},
	'test-avm-l2': {
		gasPrice: 2000000000, // 1 gwei
		drippingIMOSourceRate: BigNumber.from('4').mul(tenPow18),
		amountIMOToSource: BigNumber.from('10000000').mul(tenPow18),
	},
}
const allExternalContractAddresses = {
	avm: {
		multisig: '0x1Cc33A0ae55C250F66B8f9A1a3094bF285A9083f',
	},
	'test-avm-l2': {
		multisig: '0x4e6a11b687F35fA21D92731F9CD2f231C61f9151',
	},
}
// ------------------------------------------------

let deploymentParams
let externalContractAddresses

async function runDeployIMO() {
	const deployerAccount = (await ethers.getSigners())[0]
	const deployerAddress = deployerAccount.address
	console.log(`Deploying from ${deployerAddress}`)

	await run('compile')
	console.log('')

	const chainID = (await ethers.provider.getNetwork()).chainId
	let networkName

	if (chainID === 421611) {
		networkName = 'test-avm-l2'
		deploymentParams = allDeploymentParams['test-avm-l2']
		externalContractAddresses = allExternalContractAddresses['test-avm-l2']
	} else if (chainID === 42161) {
		networkName = 'avm'
		deploymentParams = allDeploymentParams.avm
		externalContractAddresses = allExternalContractAddresses.avm
	} else {
		throw `unknown chain id: ${chainID}`
	}

	const imo = await deployContract('IMO', deployerAddress)
	saveDeployedAddress(networkName, 'imo', imo.address)
	saveDeployedABI(networkName, 'imo', artifacts.readArtifactSync('IMO').abi)
	console.log('')
}

async function deployContract(name, ...params) {
	console.log(`Deploying contract ${name}`)
	const contractFactory = await ethers.getContractFactory(name)
	const deployed = await contractFactory.deploy(...params, { gasPrice: deploymentParams.gasPrice })
	await deployed.deployed()
	return deployed
}

runDeployIMO()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})
