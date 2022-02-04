require('dotenv').config({ path: '../.env' })
const { BigNumber } = require('ethers')
const { run, ethers, artifacts } = require('hardhat')
const { saveDeployedAddress, saveDeployedABI, loadDeployedAddress } = require('./shared')

// ----------------- UPDATE THESE -----------------
const allDeploymentParams = {
	avm: {
        startBlock: 14127700,
        endBlock: 16553546,
        sendAmount: BigNumber.from('5000000000000000000000000'), // 5 million
        imoPerBlock: BigNumber.from('2061136000000000000'), // 2.061136 per block = 5 million over 12 months
        lpToken: '0x9eAE34FAa17CaF99D2109f513edc5A6E3A7435B5',
		gasPrice: 1500000000, // 1.5 gwei
	},
	'test-avm-l2': {
        startBlock: 10093680,
        endBlock: 10093920,
        sendAmount: BigNumber.from('3000000000000000000000000'), // 3 million
        imoPerBlock: BigNumber.from('2471500000000000000'), // 2.4715 per block = 3 million over 6 months
        lpToken: '0x254a7fe645561398243cfb956b564a0da9958df0',
		gasPrice: 2000000000, // 1 gwei
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

	
    const IMO = await ethers.getContractFactory('IMO')
    const imoAddress = loadDeployedAddress(networkName, 'imo')
	const imo = new ethers.Contract(imoAddress, IMO.interface, IMO.signer)

	const staking = await deployContract('SushiStaking', imoAddress, deploymentParams.imoPerBlock, deploymentParams.startBlock, deploymentParams.endBlock)
	saveDeployedAddress(networkName, 'sushiStaking', staking.address)
	saveDeployedABI(networkName, 'sushiStaking', artifacts.readArtifactSync('SushiStaking').abi)
	console.log('')

	console.log('Adding rewards')
	let tx = await staking.add(deploymentParams.imoPerBlock, deploymentParams.lpToken, false)
	await tx.wait()
	console.log('')

	console.log('Setting SushiStaking owner')
	tx = await staking.setOwner(externalContractAddresses.multisig)
	await tx.wait()
	console.log('')

    console.log('Sending funds')
	tx = await imo.transfer(staking.address, deploymentParams.sendAmount)
	await tx.wait()
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
