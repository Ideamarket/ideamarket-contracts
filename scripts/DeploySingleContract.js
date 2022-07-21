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
