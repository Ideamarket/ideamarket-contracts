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

	//const contractName = await shared.read('contract name: ')
	//const deployed = await deployContract('TestUniswapV2Factory', '0x0000000000000000000000000000000000000000')
	const deployed = await deployContract('MultiActionIMO', "0x4C940F55DC92242B53F1b215d619c0DFf9284127", "0x8EB0EBf57656e09Eb7cECe5a087133EF5BB8b519", 
	"0x9dA633E2DcA7B0848492bb41917fF085C2d8d311", "0x634a0900a5F90C9F2d42BF1d49d94B84Db0A260d", "0x634a0900a5F90C9F2d42BF1d49d94B84Db0A260d", "0x634a0900a5F90C9F2d42BF1d49d94B84Db0A260d", { gasLimit: ethers.BigNumber.from(500000000000000)}  )
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
