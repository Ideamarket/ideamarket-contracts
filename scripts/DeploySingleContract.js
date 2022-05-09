require('dotenv').config({ path: '../.env' })
const { ethers } = require('hardhat')
const shared = require('./shared')

async function run() {
	let network = (await ethers.provider.getNetwork()).name

	if (network === 'rinkeby') {
		const input = await shared.read('Use test network? [y/n] ')

		if (input === 'Y' || input === 'y') {
			console.log('Using test network')
			network = 'test'
		} else {
			console.log('Using Rinkeby')
		}
	}
	console.log((await ethers.provider.getFeeData()).gasPrice.toString())
	let contractFactory = await ethers.getContractFactory('contracts/shared/core/MultiAction.sol:MultiAction')
	const deploymentData = contractFactory.interface.encodeDeploy([ "0x4C940F55DC92242B53F1b215d619c0DFf9284127", "0x8EB0EBf57656e09Eb7cECe5a087133EF5BB8b519", 
	"0x9dA633E2DcA7B0848492bb41917fF085C2d8d311", "0x634a0900a5F90C9F2d42BF1d49d94B84Db0A260d", "0xC6e32C583665263f38aC0C17AF7ea37e843c6278", "0xEBbc3452Cc911591e4F18f3b36727Df45d6bd1f9"])
	const estimatedGas = await ethers.provider.estimateGas({ from: '0x4e6a11b687F35fA21D92731F9CD2f231C61f9151', data: deploymentData });
	console.log(estimatedGas.toString())
	//const contractName = await shared.read('contract name: ')
	//const deployed = await deployContract('TestUniswapV2Factory', '0x0000000000000000000000000000000000000000')
	const deployed = await deployContract('MultiActionIMO', "0x10DF97D3533f9F55473c766bF445Dd60892452E1", "0xA6fB6C5E4D568777313ACB387eC8538befce5679", 
	"0x85FD710005d24CCB2B22996B9F07A44d3544869d", "0xb41bd4c99da73510d9e081c5fadbe7a27ac1f814", "0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506", "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", { gasLimit: ethers.BigNumber.from(50000000)}  )
	console.log(`Deploy to ${deployed.address}`)
}

async function deployContract(name, ...params) {
	console.log(`Deploying contract ${name}`)
	const contractFactory = await ethers.getContractFactory(name)
	const deployed = await contractFactory.deploy(...params)
	await deployed.deployed()
	return deployed
}

run()
