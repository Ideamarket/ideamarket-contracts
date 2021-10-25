require('dotenv').config({ path: '../.env' })
const { ethers } = require('hardhat')
const { BigNumber } = require('ethers')
const shared = require('./shared')
const { encodePriceSqrt, encodePath, getToken0Token1 } = require('../test/utils.js')


//const PositionManager = artifacts.require('@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json')
//require("@uniswap/v3-periphery/contracts/NonfungiblePositionManager.sol")
const { abi } = require('@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json')
//const PositionManager = artifacts.require("@uniswap/v3-periphery/artifacts/contracts/lens/NonfungiblePositionManager.sol/NonfungiblePositionManager.json");
let dai
let someToken
let someOtherToken

let weth
let uniswapFactory
let router
let quoter
let positionManager

let token0
let token1
let token0Amount
let token1Amount
let mintParams


async function run() {
	let network = (await ethers.provider.getNetwork()).name
	if (network === 'rinkeby') {
		const input = await shared.getInput('Use test network? [y/n] ')

		if (input === 'Y' || input === 'y') {
			console.log('Using test network')
			network = 'test'
		} else {
			console.log('Using Rinkeby')
		}
	}



	const deployed = await deployContract('contracts/avm/core/MultiAction.sol:MultiAction')
	console.log(`[$]: npx hardhat verify --network <> ${deployed.address}`);

	const signers = (await ethers.getSigners())[0]
	const addresses = await Promise.all([signers].map(async signer => signer.getAddress()));
	const deployer = addresses[0]

	const tenPow18 = BigNumber.from('10').pow(BigNumber.from('18'))
	const LOW_POOL_FEE = 500
	const MEDIUM_POOL_FEE = 3000
	
	let TestERC20 = await ethers.getContractFactory('TestERC20')
	someToken = await TestERC20.deploy('SOME', 'SOME')
	await someToken.deployed()
	console.log("someToken address: " + someToken.address)

	someOtherToken = await TestERC20.deploy('SOMEOTHER', 'SOMEOTHER')
	console.log("someOtherToken address: " + someOtherToken.address)
	await someOtherToken.deployed()

	dai = await ethers.getContractAt('TestERC20', '0x5364Dc963c402aAF150700f38a8ef52C1D7D7F14')
	weth = await ethers.getContractAt('TestWETH', '0xb47e6a5f8b33b3f17603c83a0535a9dcd7e32681')
	// Setup Uniswap pools
	// ETH-DAI: 1 ETH, 200 DAI
	
	const ethAmount = tenPow18
	let daiAmount = tenPow18.mul(BigNumber.from('200'))
	
	await weth.deposit({ value: ethAmount, gasLimit: ethers.BigNumber.from(6000000)})
	await weth.approve('0xC36442b4a4522E871399CD717aBDD847Ab11FE88', ethAmount, { gasLimit: ethers.BigNumber.from(6000000)})
	await dai.approve('0xC36442b4a4522E871399CD717aBDD847Ab11FE88', daiAmount, { gasLimit: ethers.BigNumber.from(6000000)})
	
	positionManager = await ethers.getContractAt(abi, '0xC36442b4a4522E871399CD717aBDD847Ab11FE88')
	
	// Uniswap V3 requires token0 < token1 in PoolInitializer
	;[token0, token1, token0Amount, token1Amount] = getToken0Token1(dai.address, weth.address, daiAmount, ethAmount)
	
	// Create and initialize pool
	await positionManager
		.createAndInitializePoolIfNecessary(
			token0,
			token1,
			LOW_POOL_FEE,
			encodePriceSqrt(token1Amount, token0Amount),
			{ gasLimit: ethers.BigNumber.from(6000000)})

	// Mint a liquidity position
	mintParams = {
		token0,
		token1,
		fee: LOW_POOL_FEE,
		tickLower: -887270, // requires tick % tickSpacing == 0
		tickUpper: 887270, // feeAmountTickSpacing[500] = 10; MIN_TICK = -887272; MAX_TICK = -MIN_TICK;
		amount0Desired: token0Amount,
		amount1Desired: token1Amount,
		amount0Min: 0, // There will always be a slight slippage during adding liquidity in UniV3
		amount1Min: 0, // due to the use of ticks
		recipient: deployer,
		deadline: BigNumber.from('9999999999999999999'),
	}
	await positionManager.mint(mintParams, { gasLimit: ethers.BigNumber.from(6000000)})
	
	// SOME-DAI: 1000 SOME, 100 DAI
	const someAmount = tenPow18.mul(BigNumber.from('1000'))
	daiAmount = tenPow18.mul(BigNumber.from('100'))
	await someToken.mint(deployer, someAmount)
	await dai.mint(deployer, daiAmount, { gasLimit: ethers.BigNumber.from(6000000)})

	await someToken.approve('0xC36442b4a4522E871399CD717aBDD847Ab11FE88', someAmount, { gasLimit: ethers.BigNumber.from(6000000)})
	await dai.approve('0xC36442b4a4522E871399CD717aBDD847Ab11FE88', daiAmount, { gasLimit: ethers.BigNumber.from(6000000)})
	;[token0, token1, token0Amount, token1Amount] = getToken0Token1(
		dai.address,
		someToken.address,
		daiAmount,
		someAmount
	)
		//SOMETHING CHANGES HERE
	await positionManager
		.createAndInitializePoolIfNecessary(
			token0,
			token1,
			MEDIUM_POOL_FEE,
			encodePriceSqrt(token1Amount, token0Amount),
			{ gasLimit: ethers.BigNumber.from(6000000)}
		)
	
	mintParams = {
		token0,
		token1,
		fee: MEDIUM_POOL_FEE,
		tickLower: -887220, // feeAmountTickSpacing[3000] = 60;
		tickUpper: 887220,
		amount0Desired: token0Amount,
		amount1Desired: token1Amount,
		amount0Min: 0,
		amount1Min: 0,
		recipient: deployer,
		deadline: BigNumber.from('9999999999999999999'),
	}
	
	await positionManager.mint(mintParams, { gasLimit: ethers.BigNumber.from(6000000)})

	// ETH-SOMEOTHER: 1 ETH, 1000 SOMEOTHER
	const someOtherAmount = tenPow18.mul(BigNumber.from('1000'))

	await weth.deposit({ value: ethAmount })
	await someOtherToken.mint(deployer, someOtherAmount)
	await weth.approve('0xC36442b4a4522E871399CD717aBDD847Ab11FE88', ethAmount)
	await someOtherToken.approve('0xC36442b4a4522E871399CD717aBDD847Ab11FE88', someOtherAmount)
	;[token0, token1, token0Amount, token1Amount] = getToken0Token1(
		weth.address,
		someOtherToken.address,
		ethAmount,
		someOtherAmount
	)

	await positionManager
		.createAndInitializePoolIfNecessary(
			token0,
			token1,
			MEDIUM_POOL_FEE,
			encodePriceSqrt(token1Amount, token0Amount),
			{ gasLimit: ethers.BigNumber.from(6000000)}
		)

	mintParams = {
		token0,
		token1,
		fee: MEDIUM_POOL_FEE,
		tickLower: -887220,
		tickUpper: 887220,
		amount0Desired: token0Amount,
		amount1Desired: token1Amount,
		amount0Min: 0,
		amount1Min: 0,
		recipient: deployer,
		deadline: BigNumber.from('9999999999999999999'),
	}
	await positionManager.mint(mintParams, { gasLimit: ethers.BigNumber.from(6000000)})
	
}

async function deployContract(name) {
	console.log(`Deploying contract ${name}`)
	const contractFactory = await ethers.getContractFactory(name)
	const deployed = await contractFactory.deploy('0x5338f72D3849e12b8c420e11540035bB7e893F7d', '0xc07efAEF14518008b7D5009d360492C89e09C9Cb', '0xFB0bb88d355B9783358e72464Cb768011fEbC780', '0x5364Dc963c402aAF150700f38a8ef52C1D7D7F14',
	 '0xE592427A0AEce92De3Edee1F18E0157C05861564', '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6', '0xb47e6a5f8b33b3f17603c83a0535a9dcd7e32681', { gasLimit: ethers.BigNumber.from(200000000)})
	await deployed.deployed()
	return deployed
}

run()
