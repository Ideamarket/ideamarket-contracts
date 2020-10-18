const { expectRevert } = require('@openzeppelin/test-helpers')
const { web3 } = require('@openzeppelin/test-helpers/src/setup')

const DomainNoSubdomainNameVerifier = artifacts.require('DomainNoSubdomainNameVerifier')
const TestERC20 = artifacts.require('TestERC20')
const TestCDai = artifacts.require('TestCDai')
const InterestManagerCompound = artifacts.require('InterestManagerCompound')
const IdeaTokenFactory = artifacts.require('IdeaTokenFactory')
const IdeaTokenExchange = artifacts.require('IdeaTokenExchange')
const IdeaToken = artifacts.require('IdeaToken')
const TestWETH = artifacts.require('TestWETH')
const TestTransferHelperLib = artifacts.require('TestTransferHelper')
const TestUniswapV2Lib = artifacts.require('TestUniswapV2Library')
const TestUniswapV2Factory = artifacts.require('TestUniswapV2Factory')
const TestUniswapV2Router02 = artifacts.require('TestUniswapV2Router02')
const CurrencyConverter = artifacts.require('CurrencyConverter')

const BN = web3.utils.BN

contract('core/CurrencyConverter', async accounts => {

	const tenPow18 = new BN('10').pow(new BN('18'))

	const marketName = 'main'
	const tokenName = 'test.com'
	const basePrice = new BN('1000000000000000000') // 10**18
	const priceRise = new BN('100000000000000000') // 10**17
	const tradingFeeRate = new BN('100')
	const platformFeeRate = new BN('50')

	const userAccount = accounts[0]
	const adminAccount = accounts[1]
	const tradingFeeAccount = accounts[2]
	const zeroAddress = '0x0000000000000000000000000000000000000000'

	let domainNoSubdomainNameVerifier
	let dai
	let comp
	let someToken
	let cDai
	let interestManagerCompound
	let ideaTokenFactory
	let ideaTokenExchange
	let weth
	let uniswapFactory
	let router
	let currencyConverter

	let marketID
	let tokenID
	let ideaToken

	beforeEach(async () => {
        
		domainNoSubdomainNameVerifier = await DomainNoSubdomainNameVerifier.new()
		dai = await TestERC20.new('DAI', 'DAI')
		comp = await TestERC20.new('COMP', 'COMP')
		someToken = await TestERC20.new('SOME', 'SOME')
		cDai = await TestCDai.new(dai.address, comp.address)
		await cDai.setExchangeRate(tenPow18)
		interestManagerCompound = await InterestManagerCompound.new()
		ideaTokenFactory = await IdeaTokenFactory.new()
		ideaTokenExchange = await IdeaTokenExchange.new()
		weth = await TestWETH.new('WETH', 'WETH')
		const transferHelperLib = await TestTransferHelperLib.new()
		const uniswapV2Lib = await TestUniswapV2Lib.new()
		await TestUniswapV2Router02.link('TestTransferHelper', transferHelperLib.address)
		await TestUniswapV2Router02.link('TestUniswapV2Library', uniswapV2Lib.address)
		uniswapFactory = await TestUniswapV2Factory.new(zeroAddress)
		router = await TestUniswapV2Router02.new(uniswapFactory.address, weth.address)
		currencyConverter = await CurrencyConverter.new(
			ideaTokenExchange.address,
			dai.address,
			router.address,
			weth.address
		)


		await interestManagerCompound.initialize(ideaTokenExchange.address,
			dai.address,
			cDai.address,
			comp.address,
			zeroAddress,
			{from: adminAccount})

		await ideaTokenFactory.initialize(adminAccount,
			ideaTokenExchange.address,
			{from: adminAccount})

		await ideaTokenExchange.initialize(adminAccount,
			tradingFeeAccount,
			interestManagerCompound.address,
			dai.address,
			{from: adminAccount})
		await ideaTokenExchange.setIdeaTokenFactoryAddress(ideaTokenFactory.address, { from: adminAccount })

		await ideaTokenFactory.addMarket(marketName,
			domainNoSubdomainNameVerifier.address,
			basePrice,
			priceRise,
			tradingFeeRate,
			platformFeeRate,
			{from: adminAccount})

		marketID = await ideaTokenFactory.getMarketIDByName(marketName)

		await ideaTokenFactory.addToken(tokenName, marketID)

		tokenID = await ideaTokenFactory.getTokenIDByName(tokenName, marketID)

		ideaToken = await IdeaToken.at((await ideaTokenFactory.getTokenInfo(marketID, tokenID)).ideaToken)

		// Setup Uniswap pools
		// ETH-DAI: 1 ETH, 200 DAI
		const ethAmount = tenPow18
		let daiAmount = tenPow18.mul(new BN('200'))
		await weth.deposit({ from: adminAccount, value: ethAmount })
		await dai.mint(adminAccount, daiAmount, { from: adminAccount })
		await weth.approve(router.address, ethAmount, { from: adminAccount })
		await dai.approve(router.address, daiAmount, { from: adminAccount })
		await uniswapFactory.createPair(weth.address, dai.address, { from: adminAccount })
		await router.addLiquidity(weth.address,
			dai.address,
			ethAmount,
			daiAmount,
			ethAmount,
			daiAmount,
			adminAccount,
			new BN('9999999999999999999'),  // deadline
			{ from: adminAccount })

		// SOME-DAI: 1000 SOME, 100 DAI
		const someAmount = tenPow18.mul(new BN('1000'))
		daiAmount = tenPow18.mul(new BN('100'))
		await someToken.mint(adminAccount, someAmount, { from: adminAccount })
		await dai.mint(adminAccount, daiAmount, { from: adminAccount })
		await someToken.approve(router.address, someAmount, { from: adminAccount })
		await dai.approve(router.address, daiAmount, { from: adminAccount })
		await uniswapFactory.createPair(someToken.address, dai.address, { from: adminAccount })
		await router.addLiquidity(someToken.address,
			dai.address,
			someAmount,
			daiAmount,
			someAmount,
			daiAmount,
			adminAccount,
			new BN('9999999999999999999'),  // deadline
			{ from: adminAccount })
	})

	it('can buy/sell tokens ETH', async () => {

		const ideaTokenAmount = tenPow18.mul(new BN('25'))
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, ideaTokenAmount)
		const requiredInputForCost = (await router.getAmountsIn(buyCost, [weth.address, dai.address]))[0]

		await currencyConverter.buyTokens(zeroAddress,
			ideaToken.address,
			ideaTokenAmount,
			requiredInputForCost,
			userAccount,
			{ value: requiredInputForCost })
        
		const tokenBalanceAfterBuy = await ideaToken.balanceOf(userAccount)
		assert.isTrue(tokenBalanceAfterBuy.eq(ideaTokenAmount))

		const sellPrice = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, tokenBalanceAfterBuy)
		const outputFromSell = (await router.getAmountsOut(sellPrice, [dai.address, weth.address]))[1]
        
		await ideaToken.approve(currencyConverter.address, tokenBalanceAfterBuy)
		await currencyConverter.sellTokens(zeroAddress,
			ideaToken.address,
			tokenBalanceAfterBuy,
			outputFromSell,
			userAccount)

		const tokenBalanceAfterSell = await ideaToken.balanceOf(userAccount)
		assert.isTrue(tokenBalanceAfterSell.eq(new BN('0')))
	})

	it('can buy/sell tokens WETH', async () => {

		const ideaTokenAmount = tenPow18.mul(new BN('25'))
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, ideaTokenAmount)
		const requiredInputForCost = (await router.getAmountsIn(buyCost, [weth.address, dai.address]))[0]

		await weth.deposit({ value: requiredInputForCost })
		await weth.approve(currencyConverter.address, requiredInputForCost)
		await currencyConverter.buyTokens(weth.address,
			ideaToken.address,
			ideaTokenAmount,
			requiredInputForCost,
			userAccount)
        
		const wethBalanceAfterBuy = await weth.balanceOf(userAccount)
		assert.isTrue(wethBalanceAfterBuy.eq(new BN('0')))
		const tokenBalanceAfterBuy = await ideaToken.balanceOf(userAccount)
		assert.isTrue(tokenBalanceAfterBuy.eq(ideaTokenAmount))

		const sellPrice = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, tokenBalanceAfterBuy)
		const outputFromSell = (await router.getAmountsOut(sellPrice, [dai.address, weth.address]))[1]
        
		await ideaToken.approve(currencyConverter.address, tokenBalanceAfterBuy)
		await currencyConverter.sellTokens(weth.address,
			ideaToken.address,
			tokenBalanceAfterBuy,
			outputFromSell,
			userAccount)

		const wethBalanceAfterSell = await weth.balanceOf(userAccount)
		assert.isTrue(wethBalanceAfterSell.eq(outputFromSell))
		const tokenBalanceAfterSell = await ideaToken.balanceOf(userAccount)
		assert.isTrue(tokenBalanceAfterSell.eq(new BN('0')))
	})

	it('can buy/sell tokens SOME', async () => {

		const ideaTokenAmount = tenPow18.mul(new BN('25'))
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, ideaTokenAmount)
		const requiredInputForCost = (await router.getAmountsIn(buyCost, [someToken.address, dai.address]))[0]

		await someToken.mint(userAccount, requiredInputForCost)
		await someToken.approve(currencyConverter.address, requiredInputForCost)
		await currencyConverter.buyTokens(someToken.address,
			ideaToken.address,
			ideaTokenAmount,
			requiredInputForCost,
			userAccount)
        
		const someBalanceAfterBuy = await someToken.balanceOf(userAccount)
		assert.isTrue(someBalanceAfterBuy.eq(new BN('0')))
		const tokenBalanceAfterBuy = await ideaToken.balanceOf(userAccount)
		assert.isTrue(tokenBalanceAfterBuy.eq(ideaTokenAmount))

		const sellPrice = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, tokenBalanceAfterBuy)
		const outputFromSell = (await router.getAmountsOut(sellPrice, [dai.address, someToken.address]))[1]
        
		await ideaToken.approve(currencyConverter.address, tokenBalanceAfterBuy)
		await currencyConverter.sellTokens(someToken.address,
			ideaToken.address,
			tokenBalanceAfterBuy,
			outputFromSell,
			userAccount)

		const someBalanceAfterSell = await someToken.balanceOf(userAccount)
		assert.isTrue(someBalanceAfterSell.eq(outputFromSell))
		const tokenBalanceAfterSell = await ideaToken.balanceOf(userAccount)
		assert.isTrue(tokenBalanceAfterSell.eq(new BN('0')))
	})

	it('fail buy cost too high', async () => {

		const ideaTokenAmount = tenPow18.mul(new BN('25'))
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, ideaTokenAmount)
		const requiredInputForCost = (await router.getAmountsIn(buyCost, [someToken.address, dai.address]))[0]

		await expectRevert(
			currencyConverter.buyTokens(someToken.address,
				ideaToken.address,
				ideaTokenAmount,
				requiredInputForCost.sub(new BN('1')),
				userAccount),
			'buyTokens: cost too high')
	})

	it('fail sell price too low', async () => {

		const ideaTokenAmount = tenPow18.mul(new BN('25'))
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, ideaTokenAmount)
		const requiredInputForCost = (await router.getAmountsIn(buyCost, [someToken.address, dai.address]))[0]

		await someToken.mint(userAccount, requiredInputForCost)
		await someToken.approve(currencyConverter.address, requiredInputForCost)
		await currencyConverter.buyTokens(someToken.address,
			ideaToken.address,
			ideaTokenAmount,
			requiredInputForCost,
			userAccount)
        
		const someBalanceAfterBuy = await someToken.balanceOf(userAccount)
		assert.isTrue(someBalanceAfterBuy.eq(new BN('0')))
		const tokenBalanceAfterBuy = await ideaToken.balanceOf(userAccount)
		assert.isTrue(tokenBalanceAfterBuy.eq(ideaTokenAmount))

		const sellPrice = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, tokenBalanceAfterBuy)
		const outputFromSell = (await router.getAmountsOut(sellPrice, [dai.address, someToken.address]))[1]
        
		await ideaToken.approve(currencyConverter.address, tokenBalanceAfterBuy)
		await expectRevert(
			currencyConverter.sellTokens(someToken.address,
				ideaToken.address,
				tokenBalanceAfterBuy,
				outputFromSell.add(new BN('1')),
				userAccount),
			'sellTokens: price too low')
	})

})