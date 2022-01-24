const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

const UniswapV3Deployer = require('uniswap-v3-deploy-plugin/dist/deployer/UniswapV3Deployer').UniswapV3Deployer
const Quoter = require('@uniswap/v3-periphery/artifacts/contracts/lens/Quoter.sol/Quoter.json')
const { encodePriceSqrt, encodePath, getToken0Token1 } = require('../../../utils')

describe('avm/core/MultiAction', () => {
	let DomainNoSubdomainNameVerifier
	let TestERC20
	let InterestManager
	let IdeaTokenFactoryAVM
	let IdeaTokenExchangeAVM
	let IdeaToken
	let IdeaTokenVault
	let MultiAction

	const YEAR_DURATION = BigNumber.from('31556952')

	const tenPow18 = BigNumber.from('10').pow(BigNumber.from('18'))
	const uint256max = BigNumber.from('2').pow(BigNumber.from('256')).sub(BigNumber.from('1'))

	const marketName = 'main'
	const tokenName = 'test.com'
	const baseCost = BigNumber.from('100000000000000000') // 10**17 = $0.1
	const priceRise = BigNumber.from('100000000000000') // 10**14 = $0.0001
	const hatchTokens = BigNumber.from('1000000000000000000000') // 10**21 = 1000
	const tradingFeeRate = BigNumber.from('100')
	const platformFeeRate = BigNumber.from('50')

	let userAccount
	let adminAccount
	let tradingFeeAccount
	const zeroAddress = '0x0000000000000000000000000000000000000000'
	const oneAddress = '0x0000000000000000000000000000000000000001'

	let domainNoSubdomainNameVerifier
	let dai
	let someToken
	let someOtherToken
	let interestManager
	let ideaTokenLogic
	let ideaTokenFactory
	let ideaTokenExchange
	let weth
	let uniswapFactory
	let router
	let quoter
	let positionManager
	let ideaTokenVault
	let multiAction

	let marketID
	let tokenID
	let ideaToken

	let token0
	let token1
	let token0Amount
	let token1Amount
	let mintParams

	const LOW_POOL_FEE = 500
	const MEDIUM_POOL_FEE = 3000

	before(async () => {
		const accounts = await ethers.getSigners()
		userAccount = accounts[0]
		adminAccount = accounts[1]
		tradingFeeAccount = accounts[2]

		DomainNoSubdomainNameVerifier = await ethers.getContractFactory('DomainNoSubdomainNameVerifier')
		TestERC20 = await ethers.getContractFactory('TestERC20')
		InterestManager = await ethers.getContractFactory('InterestManagerStateTransferAVM')
		IdeaTokenFactoryAVM = await ethers.getContractFactory('IdeaTokenFactoryAVM')
		IdeaTokenExchangeAVM = await ethers.getContractFactory('IdeaTokenExchangeAVM')
		IdeaToken = await ethers.getContractFactory('IdeaToken')
		UniswapV3Quoter = await ethers.getContractFactory(Quoter.abi, Quoter.bytecode)
		IdeaTokenVault = await ethers.getContractFactory('IdeaTokenVault')
		MultiAction = await ethers.getContractFactory('contracts/avm/core/MultiAction.sol:MultiAction')
	})

	beforeEach(async () => {
		domainNoSubdomainNameVerifier = await DomainNoSubdomainNameVerifier.deploy()
		await domainNoSubdomainNameVerifier.deployed()

		dai = await TestERC20.deploy('DAI', 'DAI')
		await dai.deployed()

		someToken = await TestERC20.deploy('SOME', 'SOME')
		await someToken.deployed()

		someOtherToken = await TestERC20.deploy('SOMEOTHER', 'SOMEOTHER')
		await someOtherToken.deployed()

		interestManager = await InterestManager.deploy()
		await interestManager.deployed()

		ideaTokenLogic = await IdeaToken.deploy()
		await ideaTokenLogic.deployed()

		ideaTokenFactory = await IdeaTokenFactoryAVM.deploy()
		await ideaTokenFactory.deployed()

		ideaTokenExchange = await IdeaTokenExchangeAVM.deploy()
		await ideaTokenExchange.deployed()

		// Deploy Uniswap V3 contracts
		;({ weth9, factory: uniswapFactory, router, positionManager } = await UniswapV3Deployer.deploy(adminAccount))

		// There seems to be some error in setting allowance when using weth9 directly
		// So fetching the contract again using address
		weth = await ethers.getContractAt('TestWETH', weth9.address)

		// Quoter is not deployed by the uniswap-v3-deploy-plugin
		quoter = await UniswapV3Quoter.deploy(uniswapFactory.address, weth.address)
		await quoter.deployed()

		ideaTokenVault = await IdeaTokenVault.deploy()
		await ideaTokenVault.deployed()

		multiAction = await MultiAction.deploy(
			ideaTokenExchange.address,
			ideaTokenFactory.address,
			ideaTokenVault.address,
			dai.address,
			router.address,
			quoter.address,
			weth.address
		)
		await multiAction.deployed()

		await interestManager.connect(adminAccount).initializeStateTransfer(ideaTokenExchange.address, dai.address)

		await ideaTokenFactory
			.connect(adminAccount)
			.initialize(adminAccount.address, ideaTokenExchange.address, ideaTokenLogic.address, oneAddress)

		await ideaTokenExchange
			.connect(adminAccount)
			.initialize(
				adminAccount.address,
				adminAccount.address,
				tradingFeeAccount.address,
				interestManager.address,
				dai.address,
				oneAddress
			)
		await ideaTokenExchange.connect(adminAccount).setIdeaTokenFactoryAddress(ideaTokenFactory.address)

		await ideaTokenFactory
			.connect(adminAccount)
			.addMarket(
				marketName,
				domainNoSubdomainNameVerifier.address,
				baseCost,
				priceRise,
				hatchTokens,
				tradingFeeRate,
				platformFeeRate,
				false
			)

		marketID = await ideaTokenFactory.getMarketIDByName(marketName)

		await ideaTokenFactory.addToken(tokenName, marketID, userAccount.address)

		tokenID = await ideaTokenFactory.getTokenIDByName(tokenName, marketID)

		ideaToken = new ethers.Contract(
			(await ideaTokenFactory.getTokenInfo(marketID, tokenID)).ideaToken,
			IdeaToken.interface,
			IdeaToken.signer
		)

		await ideaTokenVault.initialize(ideaTokenFactory.address)

		// Setup Uniswap pools
		// ETH-DAI: 1 ETH, 200 DAI
		const ethAmount = tenPow18
		let daiAmount = tenPow18.mul(BigNumber.from('200'))

		await weth.connect(adminAccount).deposit({ value: ethAmount })
		await dai.connect(adminAccount).mint(adminAccount.address, daiAmount)
		await weth.connect(adminAccount).approve(positionManager.address, ethAmount)
		await dai.connect(adminAccount).approve(positionManager.address, daiAmount)

		// Uniswap V3 requires token0 < token1 in PoolInitializer
		;[token0, token1, token0Amount, token1Amount] = getToken0Token1(dai.address, weth.address, daiAmount, ethAmount)

		// Create and initialize pool
		await positionManager
			.connect(adminAccount)
			.createAndInitializePoolIfNecessary(
				token0,
				token1,
				LOW_POOL_FEE,
				encodePriceSqrt(token1Amount, token0Amount)
			)

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
			recipient: adminAccount.address,
			deadline: BigNumber.from('9999999999999999999'),
		}
		await positionManager.connect(adminAccount).mint(mintParams)

		// SOME-DAI: 1000 SOME, 100 DAI
		const someAmount = tenPow18.mul(BigNumber.from('1000'))
		daiAmount = tenPow18.mul(BigNumber.from('100'))
		await someToken.connect(adminAccount).mint(adminAccount.address, someAmount)
		await dai.connect(adminAccount).mint(adminAccount.address, daiAmount)

		await someToken.connect(adminAccount).approve(positionManager.address, someAmount)
		await dai.connect(adminAccount).approve(positionManager.address, daiAmount)
		;[token0, token1, token0Amount, token1Amount] = getToken0Token1(
			dai.address,
			someToken.address,
			daiAmount,
			someAmount
		)

		await positionManager
			.connect(adminAccount)
			.createAndInitializePoolIfNecessary(
				token0,
				token1,
				MEDIUM_POOL_FEE,
				encodePriceSqrt(token1Amount, token0Amount)
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
			recipient: adminAccount.address,
			deadline: BigNumber.from('9999999999999999999'),
		}
		await positionManager.connect(adminAccount).mint(mintParams)

		// ETH-SOMEOTHER: 1 ETH, 1000 SOMEOTHER
		const someOtherAmount = tenPow18.mul(BigNumber.from('1000'))

		await weth.connect(adminAccount).deposit({ value: ethAmount })
		await someOtherToken.connect(adminAccount).mint(adminAccount.address, someOtherAmount)
		await weth.connect(adminAccount).approve(positionManager.address, ethAmount)
		await someOtherToken.connect(adminAccount).approve(positionManager.address, someOtherAmount)
		;[token0, token1, token0Amount, token1Amount] = getToken0Token1(
			weth.address,
			someOtherToken.address,
			ethAmount,
			someOtherAmount
		)

		await positionManager
			.connect(adminAccount)
			.createAndInitializePoolIfNecessary(
				token0,
				token1,
				MEDIUM_POOL_FEE,
				encodePriceSqrt(token1Amount, token0Amount)
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
			recipient: adminAccount.address,
			deadline: BigNumber.from('9999999999999999999'),
		}
		await positionManager.connect(adminAccount).mint(mintParams)
	})

	it('can buy/sell tokens ETH', async () => {
		const ideaTokenAmount = tenPow18.mul(BigNumber.from('25'))
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, ideaTokenAmount)
		const requiredInputForCost = await quoter.callStatic.quoteExactOutputSingle(
			weth.address,
			dai.address,
			LOW_POOL_FEE,
			buyCost,
			0
		)

		await multiAction.convertAndBuy(
			zeroAddress,
			ideaToken.address,
			ideaTokenAmount,
			ideaTokenAmount,
			requiredInputForCost,
			BigNumber.from('0'),
			userAccount.address,
			{ value: requiredInputForCost }
		)

		const tokenBalanceAfterBuy = await ideaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterBuy.eq(ideaTokenAmount)).to.be.true

		const sellPrice = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, tokenBalanceAfterBuy)
		const outputFromSell = await quoter.callStatic.quoteExactInputSingle(
			dai.address,
			weth.address,
			LOW_POOL_FEE,
			sellPrice,
			0
		)

		await ideaToken.approve(multiAction.address, tokenBalanceAfterBuy)
		await multiAction.sellAndConvert(
			zeroAddress,
			ideaToken.address,
			tokenBalanceAfterBuy,
			outputFromSell,
			userAccount.address
		)

		const tokenBalanceAfterSell = await ideaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterSell.eq(BigNumber.from('0'))).to.be.true
	})

	it('can buy/sell tokens WETH', async () => {
		const ideaTokenAmount = tenPow18.mul(BigNumber.from('25'))
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, ideaTokenAmount)
		const requiredInputForCost = await quoter.callStatic.quoteExactOutputSingle(
			weth.address,
			dai.address,
			LOW_POOL_FEE,
			buyCost,
			0
		)

		await weth.deposit({ value: requiredInputForCost })
		await weth.approve(multiAction.address, requiredInputForCost)
		await multiAction.convertAndBuy(
			weth.address,
			ideaToken.address,
			ideaTokenAmount,
			ideaTokenAmount,
			requiredInputForCost,
			BigNumber.from('0'),
			userAccount.address
		)

		const wethBalanceAfterBuy = await weth.balanceOf(userAccount.address)
		expect(wethBalanceAfterBuy.eq(BigNumber.from('0'))).to.be.true
		const tokenBalanceAfterBuy = await ideaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterBuy.eq(ideaTokenAmount)).to.be.true

		const sellPrice = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, tokenBalanceAfterBuy)
		const outputFromSell = await quoter.callStatic.quoteExactInputSingle(
			dai.address,
			weth.address,
			LOW_POOL_FEE,
			sellPrice,
			0
		)

		await ideaToken.approve(multiAction.address, tokenBalanceAfterBuy)
		await multiAction.sellAndConvert(
			weth.address,
			ideaToken.address,
			tokenBalanceAfterBuy,
			outputFromSell,
			userAccount.address
		)

		const wethBalanceAfterSell = await weth.balanceOf(userAccount.address)
		expect(wethBalanceAfterSell.eq(outputFromSell)).to.be.true
		const tokenBalanceAfterSell = await ideaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterSell.eq(BigNumber.from('0'))).to.be.true
	})

	it('can buy/sell tokens SOME', async () => {
		const ideaTokenAmount = tenPow18.mul(BigNumber.from('25'))
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, ideaTokenAmount)
		const requiredInputForCost = await quoter.callStatic.quoteExactOutputSingle(
			someToken.address,
			dai.address,
			MEDIUM_POOL_FEE,
			buyCost,
			0
		)

		await someToken.mint(userAccount.address, requiredInputForCost)
		await someToken.approve(multiAction.address, requiredInputForCost)
		await multiAction.convertAndBuy(
			someToken.address,
			ideaToken.address,
			ideaTokenAmount,
			ideaTokenAmount,
			requiredInputForCost,
			BigNumber.from('0'),
			userAccount.address
		)

		const someBalanceAfterBuy = await someToken.balanceOf(userAccount.address)
		expect(someBalanceAfterBuy.eq(BigNumber.from('0'))).to.be.true
		const tokenBalanceAfterBuy = await ideaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterBuy.eq(ideaTokenAmount)).to.be.true

		const sellPrice = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, tokenBalanceAfterBuy)
		const outputFromSell = await quoter.callStatic.quoteExactInputSingle(
			dai.address,
			someToken.address,
			MEDIUM_POOL_FEE,
			sellPrice,
			0
		)

		await ideaToken.approve(multiAction.address, tokenBalanceAfterBuy)
		await multiAction.sellAndConvert(
			someToken.address,
			ideaToken.address,
			tokenBalanceAfterBuy,
			outputFromSell,
			userAccount.address
		)

		const someBalanceAfterSell = await someToken.balanceOf(userAccount.address)
		expect(someBalanceAfterSell.eq(outputFromSell)).to.be.true
		const tokenBalanceAfterSell = await ideaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterSell.eq(BigNumber.from('0'))).to.be.true
	})

	it('can buy/sell tokens 3-hop', async () => {
		const ideaTokenAmount = tenPow18.mul(BigNumber.from('25'))
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, ideaTokenAmount)
		// Exact Output Multihop Swap requires path to be encoded in reverse
		let path = encodePath([dai.address, weth.address, someOtherToken.address], [LOW_POOL_FEE, MEDIUM_POOL_FEE])
		const requiredInputForCost = await quoter.callStatic.quoteExactOutput(path, buyCost)

		await someOtherToken.mint(userAccount.address, requiredInputForCost)
		await someOtherToken.approve(multiAction.address, requiredInputForCost)
		await multiAction.convertAndBuy(
			someOtherToken.address,
			ideaToken.address,
			ideaTokenAmount,
			ideaTokenAmount,
			requiredInputForCost,
			BigNumber.from('0'),
			userAccount.address
		)

		const tokenBalanceAfterBuy = await ideaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterBuy.eq(ideaTokenAmount)).to.be.true

		const sellPrice = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, tokenBalanceAfterBuy)
		path = encodePath([dai.address, weth.address, someOtherToken.address], [LOW_POOL_FEE, MEDIUM_POOL_FEE])
		const outputFromSell = await quoter.callStatic.quoteExactInput(path, sellPrice)

		await ideaToken.approve(multiAction.address, tokenBalanceAfterBuy)
		await multiAction.sellAndConvert(
			someOtherToken.address,
			ideaToken.address,
			tokenBalanceAfterBuy,
			outputFromSell,
			userAccount.address
		)

		const someOtherBalanceAfterSell = await someOtherToken.balanceOf(userAccount.address)
		expect(someOtherBalanceAfterSell.eq(outputFromSell)).to.be.true
		const tokenBalanceAfterSell = await ideaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterSell.eq(BigNumber.from('0'))).to.be.true
	})

	it('can buy and fallback', async () => {
		const ideaTokenAmount = tenPow18.mul(BigNumber.from('25'))

		const ideaTokenFallbackAmount = tenPow18.mul(BigNumber.from('24'))
		const buyFallbackCost = await ideaTokenExchange.getCostForBuyingTokens(
			ideaToken.address,
			ideaTokenFallbackAmount
		)
		const requiredInputForFallbackCost = await quoter.callStatic.quoteExactOutputSingle(
			weth.address,
			dai.address,
			LOW_POOL_FEE,
			buyFallbackCost,
			0
		)

		await multiAction.convertAndBuy(
			zeroAddress,
			ideaToken.address,
			ideaTokenAmount,
			ideaTokenFallbackAmount,
			requiredInputForFallbackCost.add(BigNumber.from('1000')),
			BigNumber.from('0'),
			userAccount.address,
			{ value: requiredInputForFallbackCost.add(BigNumber.from('1000')) }
		)

		const tokenBalanceAfterBuy = await ideaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterBuy.eq(ideaTokenFallbackAmount)).to.be.true
	})

	it('can buy and lock ETH', async () => {
		const ideaTokenAmount = tenPow18.mul(BigNumber.from('25'))
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, ideaTokenAmount)
		const requiredInputForCost = await quoter.callStatic.quoteExactOutputSingle(
			weth.address,
			dai.address,
			LOW_POOL_FEE,
			buyCost,
			0
		)

		await multiAction.convertAndBuy(
			zeroAddress,
			ideaToken.address,
			ideaTokenAmount,
			ideaTokenAmount,
			requiredInputForCost,
			YEAR_DURATION,
			userAccount.address,
			{ value: requiredInputForCost }
		)

		const tokenBalanceAfterBuy = await ideaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterBuy.eq(BigNumber.from('0'))).to.be.true
		expect(
			(
				await ideaTokenVault.getLockedEntries(ideaToken.address, userAccount.address, uint256max)
			)[0].lockedAmount.eq(ideaTokenAmount)
		).to.be.true
	})

	it('can buy and lock DAI', async () => {
		const ideaTokenAmount = tenPow18.mul(BigNumber.from('25'))
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, ideaTokenAmount)
		await dai.mint(userAccount.address, buyCost)
		await dai.approve(multiAction.address, buyCost)

		await multiAction.buyAndLock(
			ideaToken.address,
			ideaTokenAmount,
			ideaTokenAmount,
			buyCost,
			YEAR_DURATION,
			userAccount.address
		)

		const tokenBalanceAfterBuy = await ideaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterBuy.eq(BigNumber.from('0'))).to.be.true
		expect(
			(
				await ideaTokenVault.getLockedEntries(ideaToken.address, userAccount.address, uint256max)
			)[0].lockedAmount.eq(ideaTokenAmount)
		).to.be.true
	})

	it('can buy and lock DAI with fallback', async () => {
		const ideaTokenAmount = tenPow18.mul(BigNumber.from('25'))

		const ideaTokenFallbackAmount = tenPow18.mul(BigNumber.from('24'))
		const buyFallbackCost = await ideaTokenExchange.getCostForBuyingTokens(
			ideaToken.address,
			ideaTokenFallbackAmount
		)

		await dai.mint(userAccount.address, buyFallbackCost)
		await dai.approve(multiAction.address, buyFallbackCost)

		await multiAction.buyAndLock(
			ideaToken.address,
			ideaTokenAmount,
			ideaTokenFallbackAmount,
			buyFallbackCost,
			YEAR_DURATION,
			userAccount.address
		)

		const tokenBalanceAfterBuy = await ideaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterBuy.eq(BigNumber.from('0'))).to.be.true
		expect(
			(
				await ideaTokenVault.getLockedEntries(ideaToken.address, userAccount.address, uint256max)
			)[0].lockedAmount.eq(ideaTokenFallbackAmount)
		).to.be.true
	})

	it('can add and buy', async () => {
		const ideaTokenAmount = tenPow18.mul(BigNumber.from('25'))
		const marketDetails = await ideaTokenFactory.getMarketDetailsByID(marketID)
		const buyCost = (
			await ideaTokenExchange.getCostsForBuyingTokens(marketDetails, BigNumber.from('0'), ideaTokenAmount, false)
		).total

		await dai.mint(userAccount.address, buyCost)
		await dai.approve(multiAction.address, buyCost)

		const newTokenName = 'sometoken.com'
		await multiAction.addAndBuy(newTokenName, marketID, ideaTokenAmount, BigNumber.from('0'), userAccount.address)

		const id = await ideaTokenFactory.getTokenIDByName(newTokenName, marketID)
		expect(id.eq(BigNumber.from('2'))).to.be.true

		const newTokenAddress = (await ideaTokenFactory.getTokenInfo(marketID, id)).ideaToken
		const newIdeaToken = new ethers.Contract(newTokenAddress, IdeaToken.interface, IdeaToken.signer)

		const tokenBalanceAfterBuy = await newIdeaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterBuy.eq(ideaTokenAmount)).to.be.true
	})

	it('can add and buy and lock', async () => {
		const ideaTokenAmount = tenPow18.mul(BigNumber.from('25'))
		const marketDetails = await ideaTokenFactory.getMarketDetailsByID(marketID)
		const buyCost = (
			await ideaTokenExchange.getCostsForBuyingTokens(marketDetails, BigNumber.from('0'), ideaTokenAmount, false)
		).total

		await dai.mint(userAccount.address, buyCost)
		await dai.approve(multiAction.address, buyCost)

		const newTokenName = 'sometoken.com'
		await multiAction.addAndBuy(newTokenName, marketID, ideaTokenAmount, YEAR_DURATION, userAccount.address)

		const id = await ideaTokenFactory.getTokenIDByName(newTokenName, marketID)
		expect(id.eq(BigNumber.from('2'))).to.be.true

		const newTokenAddress = (await ideaTokenFactory.getTokenInfo(marketID, id)).ideaToken
		const newIdeaToken = new ethers.Contract(newTokenAddress, IdeaToken.interface, IdeaToken.signer)

		const tokenBalanceAfterBuy = await newIdeaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterBuy.eq(BigNumber.from('0'))).to.be.true
		expect(
			(
				await ideaTokenVault.getLockedEntries(newIdeaToken.address, userAccount.address, uint256max)
			)[0].lockedAmount.eq(ideaTokenAmount)
		).to.be.true
	})

	it('can convert add and buy', async () => {
		const ideaTokenAmount = tenPow18.mul(BigNumber.from('25'))
		const marketDetails = await ideaTokenFactory.getMarketDetailsByID(marketID)
		const buyCost = (
			await ideaTokenExchange.getCostsForBuyingTokens(marketDetails, BigNumber.from('0'), ideaTokenAmount, false)
		).total
		const requiredInputForCost = await quoter.callStatic.quoteExactOutputSingle(
			weth.address,
			dai.address,
			LOW_POOL_FEE,
			buyCost,
			0
		)

		const newTokenName = 'sometoken.com'

		await multiAction.convertAddAndBuy(
			newTokenName,
			marketID,
			zeroAddress,
			ideaTokenAmount,
			ideaTokenAmount,
			requiredInputForCost,
			BigNumber.from('0'),
			userAccount.address,
			{ value: requiredInputForCost }
		)

		const id = await ideaTokenFactory.getTokenIDByName(newTokenName, marketID)
		expect(id.eq(BigNumber.from('2'))).to.be.true

		const newTokenAddress = (await ideaTokenFactory.getTokenInfo(marketID, id)).ideaToken
		const newIdeaToken = new ethers.Contract(newTokenAddress, IdeaToken.interface, IdeaToken.signer)

		const tokenBalanceAfterBuy = await newIdeaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterBuy.eq(ideaTokenAmount)).to.be.true
	})

	it('can convert add and buy and fallback', async () => {
		const ideaTokenAmount = tenPow18.mul(BigNumber.from('25'))

		const ideaTokenFallbackAmount = tenPow18.mul(BigNumber.from('24'))
		const marketDetails = await ideaTokenFactory.getMarketDetailsByID(marketID)
		const buyFallbackCost = (
			await ideaTokenExchange.getCostsForBuyingTokens(
				marketDetails,
				BigNumber.from('0'),
				ideaTokenFallbackAmount,
				false
			)
		).total
		const requiredInputForFallbackCost = await quoter.callStatic.quoteExactOutputSingle(
			weth.address,
			dai.address,
			LOW_POOL_FEE,
			buyFallbackCost,
			0
		)

		const newTokenName = 'sometoken.com'

		await multiAction.convertAddAndBuy(
			newTokenName,
			marketID,
			zeroAddress,
			ideaTokenAmount,
			ideaTokenFallbackAmount,
			requiredInputForFallbackCost,
			BigNumber.from('0'),
			userAccount.address,
			{ value: requiredInputForFallbackCost }
		)

		const id = await ideaTokenFactory.getTokenIDByName(newTokenName, marketID)
		expect(id.eq(BigNumber.from('2'))).to.be.true

		const newTokenAddress = (await ideaTokenFactory.getTokenInfo(marketID, id)).ideaToken
		const newIdeaToken = new ethers.Contract(newTokenAddress, IdeaToken.interface, IdeaToken.signer)

		const tokenBalanceAfterBuy = await newIdeaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterBuy.eq(ideaTokenFallbackAmount)).to.be.true
	})

	it('can convert add and buy and lock', async () => {
		const ideaTokenAmount = tenPow18.mul(BigNumber.from('25'))
		const marketDetails = await ideaTokenFactory.getMarketDetailsByID(marketID)
		const buyCost = (
			await ideaTokenExchange.getCostsForBuyingTokens(marketDetails, BigNumber.from('0'), ideaTokenAmount, false)
		).total
		const requiredInputForCost = await quoter.callStatic.quoteExactOutputSingle(
			weth.address,
			dai.address,
			LOW_POOL_FEE,
			buyCost,
			0
		)

		const newTokenName = 'sometoken.com'

		await multiAction.convertAddAndBuy(
			newTokenName,
			marketID,
			zeroAddress,
			ideaTokenAmount,
			ideaTokenAmount,
			requiredInputForCost,
			YEAR_DURATION,
			userAccount.address,
			{ value: requiredInputForCost }
		)

		const id = await ideaTokenFactory.getTokenIDByName(newTokenName, marketID)
		expect(id.eq(BigNumber.from('2'))).to.be.true

		const newTokenAddress = (await ideaTokenFactory.getTokenInfo(marketID, id)).ideaToken
		const newIdeaToken = new ethers.Contract(newTokenAddress, IdeaToken.interface, IdeaToken.signer)

		const tokenBalanceAfterBuy = await newIdeaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterBuy.eq(BigNumber.from('0'))).to.be.true
		expect(
			(
				await ideaTokenVault.getLockedEntries(newIdeaToken.address, userAccount.address, uint256max)
			)[0].lockedAmount.eq(ideaTokenAmount)
		).to.be.true
	})

	it('fail buy cost too high', async () => {
		const ideaTokenAmount = tenPow18.mul(BigNumber.from('25'))
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, ideaTokenAmount)
		const requiredInputForCost = await quoter.callStatic.quoteExactOutputSingle(
			someToken.address,
			dai.address,
			MEDIUM_POOL_FEE,
			buyCost,
			0
		)

		expect(
			multiAction.convertAndBuy(
				someToken.address,
				ideaToken.address,
				ideaTokenAmount,
				ideaTokenAmount,
				requiredInputForCost.sub(BigNumber.from('1')),
				BigNumber.from('0'),
				userAccount.address
			)
		).to.be.revertedWith('')
	})

	it('fail sell price too low', async () => {
		const ideaTokenAmount = tenPow18.mul(BigNumber.from('25'))
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, ideaTokenAmount)
		const requiredInputForCost = await quoter.callStatic.quoteExactOutputSingle(
			someToken.address,
			dai.address,
			MEDIUM_POOL_FEE,
			buyCost,
			0
		)

		await someToken.mint(userAccount.address, requiredInputForCost)
		await someToken.approve(multiAction.address, requiredInputForCost)
		await multiAction.convertAndBuy(
			someToken.address,
			ideaToken.address,
			ideaTokenAmount,
			ideaTokenAmount,
			requiredInputForCost,
			BigNumber.from('0'),
			userAccount.address
		)

		const someBalanceAfterBuy = await someToken.balanceOf(userAccount.address)
		expect(someBalanceAfterBuy.eq(BigNumber.from('0'))).to.be.true
		const tokenBalanceAfterBuy = await ideaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterBuy.eq(ideaTokenAmount)).to.be.true

		const sellPrice = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, tokenBalanceAfterBuy)
		const outputFromSell = await quoter.callStatic.quoteExactInputSingle(
			dai.address,
			someToken.address,
			MEDIUM_POOL_FEE,
			sellPrice,
			0
		)

		await ideaToken.approve(multiAction.address, tokenBalanceAfterBuy)
		expect(
			multiAction.sellAndConvert(
				someToken.address,
				ideaToken.address,
				tokenBalanceAfterBuy,
				outputFromSell.add(BigNumber.from('1')),
				userAccount.address
			)
		).to.be.revertedWith('slippage')
	})

	it('fail directly send ETH', async () => {
		expect(
			userAccount.sendTransaction({
				to: multiAction.address,
				value: tenPow18,
			})
		).to.be.revertedWith('')
	})
})
