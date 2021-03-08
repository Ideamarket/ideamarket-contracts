const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('ovm/core/MultiAction', () => {
	let DomainNoSubdomainNameVerifier
	let TestERC20
	let TestCDai
	let InterestManagerCompound
	let TestComptroller
	let IdeaTokenFactory
	let IdeaTokenExchange
	let IdeaToken
	let TestTransferHelperLib
	let TestUniswapV2Lib
	let TestUniswapV2Factory
	let TestUniswapV2Router02
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
	let comp
	let comptroller
	let someToken
	let someOtherToken
	let cDai
	let interestManagerCompound
	let ideaTokenLogic
	let ideaTokenFactory
	let ideaTokenExchange
	let owETH
	let uniswapFactory
	let router
	let ideaTokenVault
	let multiAction

	let marketID
	let tokenID
	let ideaToken

	before(async () => {
		const accounts = await ethers.getSigners()
		userAccount = accounts[0]
		adminAccount = accounts[1]
		tradingFeeAccount = accounts[2]

		DomainNoSubdomainNameVerifier = await ethers.getContractFactory('DomainNoSubdomainNameVerifier')
		TestERC20 = await ethers.getContractFactory('TestERC20')
		TestCDai = await ethers.getContractFactory('TestCDai')
		InterestManagerCompound = await ethers.getContractFactory('InterestManagerCompound')
		TestComptroller = await ethers.getContractFactory('TestComptroller')
		IdeaTokenFactory = await ethers.getContractFactory('IdeaTokenFactoryOVM')
		IdeaTokenExchange = await ethers.getContractFactory('IdeaTokenExchangeOVM')
		IdeaToken = await ethers.getContractFactory('IdeaToken')
		TestTransferHelperLib = await ethers.getContractFactory('TestTransferHelper')
		TestUniswapV2Lib = await ethers.getContractFactory('TestUniswapV2Library')
		TestUniswapV2Factory = await ethers.getContractFactory('TestUniswapV2Factory')
		TestUniswapV2Router02 = await ethers.getContractFactory('TestUniswapV2Router02')
		IdeaTokenVault = await ethers.getContractFactory('IdeaTokenVault')
		MultiAction = await ethers.getContractFactory('MultiActionOVM')
	})

	beforeEach(async () => {
		domainNoSubdomainNameVerifier = await DomainNoSubdomainNameVerifier.deploy()
		await domainNoSubdomainNameVerifier.deployed()

		dai = await TestERC20.deploy('DAI', 'DAI')
		await dai.deployed()

		comp = await TestERC20.deploy('COMP', 'COMP')
		await comp.deployed()

		comptroller = await TestComptroller.deploy()
		await comptroller.deployed()

		someToken = await TestERC20.deploy('SOME', 'SOME')
		await someToken.deployed()

		someOtherToken = await TestERC20.deploy('SOMEOTHER', 'SOMEOTHER')
		await someOtherToken.deployed()

		cDai = await TestCDai.deploy(dai.address, comp.address, comptroller.address)
		await cDai.deployed()
		await cDai.setExchangeRate(tenPow18)

		interestManagerCompound = await InterestManagerCompound.deploy()
		await interestManagerCompound.deployed()

		ideaTokenLogic = await IdeaToken.deploy()
		await ideaTokenLogic.deployed()

		ideaTokenFactory = await IdeaTokenFactory.deploy()
		await ideaTokenFactory.deployed()

		ideaTokenExchange = await IdeaTokenExchange.deploy()
		await ideaTokenExchange.deployed()

		owETH = await TestERC20.deploy('owETH', 'owETH')
		await owETH.deployed()

		const transferHelperLib = await TestTransferHelperLib.deploy()
		await transferHelperLib.deployed()

		const uniswapV2Lib = await TestUniswapV2Lib.deploy()
		await uniswapV2Lib.deployed()

		uniswapFactory = await TestUniswapV2Factory.deploy(zeroAddress)
		await uniswapFactory.deployed()

		router = await TestUniswapV2Router02.deploy(uniswapFactory.address, owETH.address)
		await router.deployed()

		ideaTokenVault = await IdeaTokenVault.deploy()
		await ideaTokenVault.deployed()

		multiAction = await MultiAction.deploy(
			ideaTokenExchange.address,
			ideaTokenFactory.address,
			ideaTokenVault.address,
			dai.address,
			router.address
		)
		await multiAction.deployed()

		await interestManagerCompound
			.connect(adminAccount)
			.initialize(ideaTokenExchange.address, dai.address, cDai.address, comp.address, oneAddress)

		await ideaTokenFactory
			.connect(adminAccount)
			.initialize(adminAccount.address, ideaTokenExchange.address, ideaTokenLogic.address)

		await ideaTokenExchange
			.connect(adminAccount)
			.initialize(
				adminAccount.address,
				adminAccount.address,
				tradingFeeAccount.address,
				interestManagerCompound.address,
				dai.address
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

		await owETH.connect(adminAccount).mint(adminAccount.address, ethAmount)
		await dai.connect(adminAccount).mint(adminAccount.address, daiAmount)
		await owETH.connect(adminAccount).approve(router.address, ethAmount)
		await dai.connect(adminAccount).approve(router.address, daiAmount)
		await uniswapFactory.connect(adminAccount).createPair(owETH.address, dai.address)
		await router
			.connect(adminAccount)
			.addLiquidity(
				owETH.address,
				dai.address,
				ethAmount,
				daiAmount,
				ethAmount,
				daiAmount,
				adminAccount.address,
				BigNumber.from('9999999999999999999')
			)

		// SOME-DAI: 1000 SOME, 100 DAI
		const someAmount = tenPow18.mul(BigNumber.from('1000'))
		daiAmount = tenPow18.mul(BigNumber.from('100'))
		await someToken.connect(adminAccount).mint(adminAccount.address, someAmount)
		await dai.connect(adminAccount).mint(adminAccount.address, daiAmount)

		await someToken.connect(adminAccount).approve(router.address, someAmount)
		await dai.connect(adminAccount).approve(router.address, daiAmount)
		await uniswapFactory.connect(adminAccount).createPair(someToken.address, dai.address)

		await router
			.connect(adminAccount)
			.addLiquidity(
				someToken.address,
				dai.address,
				someAmount,
				daiAmount,
				someAmount,
				daiAmount,
				adminAccount.address,
				BigNumber.from('9999999999999999999')
			)

		// ETH-SOMEOTHER: 1 ETH, 500 SOMEOTHER
		const someOtherAmount = tenPow18.mul(BigNumber.from('1000'))

		await owETH.connect(adminAccount).mint(adminAccount.address, ethAmount)
		await someOtherToken.connect(adminAccount).mint(adminAccount.address, someOtherAmount)
		await owETH.connect(adminAccount).approve(router.address, ethAmount)
		await someOtherToken.connect(adminAccount).approve(router.address, someOtherAmount)
		await uniswapFactory.connect(adminAccount).createPair(owETH.address, someOtherToken.address)
		await router
			.connect(adminAccount)
			.addLiquidity(
				owETH.address,
				someOtherToken.address,
				ethAmount,
				someOtherAmount,
				ethAmount,
				someOtherAmount,
				adminAccount.address,
				BigNumber.from('9999999999999999999')
			)
	})

	it('can buy/sell tokens owETH', async () => {
		const ideaTokenAmount = tenPow18.mul(BigNumber.from('25'))
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, ideaTokenAmount)
		const requiredInputForCost = (await router.getAmountsIn(buyCost, [owETH.address, dai.address]))[0]

		await owETH.connect(adminAccount).mint(userAccount.address, requiredInputForCost)
		await owETH.approve(multiAction.address, requiredInputForCost)
		await multiAction.convertAndBuy(
			owETH.address,
			ideaToken.address,
			ideaTokenAmount,
			ideaTokenAmount,
			requiredInputForCost,
			BigNumber.from('0'),
			userAccount.address
		)

		const owETHBalanceAfterBuy = await owETH.balanceOf(userAccount.address)
		expect(owETHBalanceAfterBuy.eq(BigNumber.from('0'))).to.be.true
		const tokenBalanceAfterBuy = await ideaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterBuy.eq(ideaTokenAmount)).to.be.true

		const sellPrice = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, tokenBalanceAfterBuy)
		const outputFromSell = (await router.getAmountsOut(sellPrice, [dai.address, owETH.address]))[1]

		await ideaToken.approve(multiAction.address, tokenBalanceAfterBuy)
		await multiAction.sellAndConvert(
			owETH.address,
			ideaToken.address,
			tokenBalanceAfterBuy,
			outputFromSell,
			userAccount.address
		)

		const owETHBalanceAfterSell = await owETH.balanceOf(userAccount.address)
		expect(owETHBalanceAfterSell.eq(outputFromSell)).to.be.true
		const tokenBalanceAfterSell = await ideaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterSell.eq(BigNumber.from('0'))).to.be.true
	})

	it('can buy/sell tokens SOME', async () => {
		const ideaTokenAmount = tenPow18.mul(BigNumber.from('25'))
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, ideaTokenAmount)
		const requiredInputForCost = (await router.getAmountsIn(buyCost, [someToken.address, dai.address]))[0]

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
		const outputFromSell = (await router.getAmountsOut(sellPrice, [dai.address, someToken.address]))[1]

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

	it('can buy and fallback', async () => {
		const ideaTokenAmount = tenPow18.mul(BigNumber.from('25'))

		const ideaTokenFallbackAmount = tenPow18.mul(BigNumber.from('24'))
		const buyFallbackCost = await ideaTokenExchange.getCostForBuyingTokens(
			ideaToken.address,
			ideaTokenFallbackAmount
		)
		const requiredInputForFallbackCost = (
			await router.getAmountsIn(buyFallbackCost, [owETH.address, dai.address])
		)[0]

		await owETH.connect(adminAccount).mint(userAccount.address, requiredInputForFallbackCost)
		await owETH.approve(multiAction.address, requiredInputForFallbackCost)
		await multiAction.convertAndBuy(
			owETH.address,
			ideaToken.address,
			ideaTokenAmount,
			ideaTokenFallbackAmount,
			requiredInputForFallbackCost.add(BigNumber.from('1000')),
			BigNumber.from('0'),
			userAccount.address
		)

		const tokenBalanceAfterBuy = await ideaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterBuy.eq(ideaTokenFallbackAmount)).to.be.true
	})

	it('can buy and lock ETH', async () => {
		const ideaTokenAmount = tenPow18.mul(BigNumber.from('25'))
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, ideaTokenAmount)
		const requiredInputForCost = (await router.getAmountsIn(buyCost, [owETH.address, dai.address]))[0]

		await owETH.connect(adminAccount).mint(userAccount.address, requiredInputForCost)
		await owETH.approve(multiAction.address, requiredInputForCost)
		await multiAction.convertAndBuy(
			owETH.address,
			ideaToken.address,
			ideaTokenAmount,
			ideaTokenAmount,
			requiredInputForCost,
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
		const requiredInputForCost = (await router.getAmountsIn(buyCost, [owETH.address, dai.address]))[0]

		const newTokenName = 'sometoken.com'

		await owETH.connect(adminAccount).mint(userAccount.address, requiredInputForCost)
		await owETH.approve(multiAction.address, requiredInputForCost)
		await multiAction.convertAddAndBuy(
			newTokenName,
			marketID,
			owETH.address,
			ideaTokenAmount,
			ideaTokenAmount,
			requiredInputForCost,
			BigNumber.from('0'),
			userAccount.address
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
		const requiredInputForFallbackCost = (
			await router.getAmountsIn(buyFallbackCost, [owETH.address, dai.address])
		)[0]

		const newTokenName = 'sometoken.com'

		await owETH.connect(adminAccount).mint(userAccount.address, requiredInputForFallbackCost)
		await owETH.approve(multiAction.address, requiredInputForFallbackCost)
		await multiAction.convertAddAndBuy(
			newTokenName,
			marketID,
			owETH.address,
			ideaTokenAmount,
			ideaTokenFallbackAmount,
			requiredInputForFallbackCost,
			BigNumber.from('0'),
			userAccount.address
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
		const requiredInputForCost = (await router.getAmountsIn(buyCost, [owETH.address, dai.address]))[0]

		const newTokenName = 'sometoken.com'

		await owETH.connect(adminAccount).mint(userAccount.address, requiredInputForCost)
		await owETH.approve(multiAction.address, requiredInputForCost)
		await multiAction.convertAddAndBuy(
			newTokenName,
			marketID,
			owETH.address,
			ideaTokenAmount,
			ideaTokenAmount,
			requiredInputForCost,
			YEAR_DURATION,
			userAccount.address
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
		const requiredInputForCost = (await router.getAmountsIn(buyCost, [someToken.address, dai.address]))[0]

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
		const requiredInputForCost = (await router.getAmountsIn(buyCost, [someToken.address, dai.address]))[0]

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
		const outputFromSell = (await router.getAmountsOut(sellPrice, [dai.address, someToken.address]))[1]

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
})
