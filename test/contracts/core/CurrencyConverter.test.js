const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('core/CurrencyConverter', () => {
	let DomainNoSubdomainNameVerifier
	let TestERC20
	let TestCDai
	let InterestManagerCompound
	let IdeaTokenFactory
	let IdeaTokenExchange
	let IdeaToken
	let TestWETH
	let TestTransferHelperLib
	let TestUniswapV2Lib
	let TestUniswapV2Factory
	let TestUniswapV2Router02
	let CurrencyConverter

	const tenPow18 = BigNumber.from('10').pow(BigNumber.from('18'))

	const marketName = 'main'
	const tokenName = 'test.com'
	const baseCost = BigNumber.from('1000000000000000000') // 10**18
	const priceRise = BigNumber.from('100000000000000000') // 10**17
	const tradingFeeRate = BigNumber.from('100')
	const platformFeeRate = BigNumber.from('50')

	let userAccount
	let adminAccount
	let tradingFeeAccount
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

	before(async () => {
		const accounts = await ethers.getSigners()
		userAccount = accounts[0]
		adminAccount = accounts[1]
		tradingFeeAccount = accounts[2]

		DomainNoSubdomainNameVerifier = await ethers.getContractFactory('DomainNoSubdomainNameVerifier')
		TestERC20 = await ethers.getContractFactory('TestERC20')
		TestCDai = await ethers.getContractFactory('TestCDai')
		InterestManagerCompound = await ethers.getContractFactory('InterestManagerCompound')
		IdeaTokenFactory = await ethers.getContractFactory('IdeaTokenFactory')
		IdeaTokenExchange = await ethers.getContractFactory('IdeaTokenExchange')
		IdeaToken = await ethers.getContractFactory('IdeaToken')
		TestWETH = await ethers.getContractFactory('TestWETH')
		TestTransferHelperLib = await ethers.getContractFactory('TestTransferHelper')
		TestUniswapV2Lib = await ethers.getContractFactory('TestUniswapV2Library')
		TestUniswapV2Factory = await ethers.getContractFactory('TestUniswapV2Factory')
		TestUniswapV2Router02 = await ethers.getContractFactory('TestUniswapV2Router02')
		CurrencyConverter = await ethers.getContractFactory('CurrencyConverter')
	})

	beforeEach(async () => {
		domainNoSubdomainNameVerifier = await DomainNoSubdomainNameVerifier.deploy()
		await domainNoSubdomainNameVerifier.deployed()

		dai = await TestERC20.deploy('DAI', 'DAI')
		await dai.deployed()
		comp = await TestERC20.deploy('COMP', 'COMP')
		await comp.deployed()

		someToken = await TestERC20.deploy('SOME', 'SOME')
		await someToken.deployed()

		cDai = await TestCDai.deploy(dai.address, comp.address)
		await cDai.deployed()
		await cDai.setExchangeRate(tenPow18)

		interestManagerCompound = await InterestManagerCompound.deploy()
		await interestManagerCompound.deployed()

		ideaTokenFactory = await IdeaTokenFactory.deploy()
		await ideaTokenFactory.deployed()

		ideaTokenExchange = await IdeaTokenExchange.deploy()
		await ideaTokenExchange.deployed()

		weth = await TestWETH.deploy('WETH', 'WETH')
		await weth.deployed()

		const transferHelperLib = await TestTransferHelperLib.deploy()
		await transferHelperLib.deployed()

		const uniswapV2Lib = await TestUniswapV2Lib.deploy()
		await uniswapV2Lib.deployed()

		//await TestUniswapV2Router02.link('TestTransferHelper', transferHelperLib.address)
		//await TestUniswapV2Router02.link('TestUniswapV2Library', uniswapV2Lib.address)

		uniswapFactory = await TestUniswapV2Factory.deploy(zeroAddress)
		await uniswapFactory.deployed()

		router = await TestUniswapV2Router02.deploy(uniswapFactory.address, weth.address)
		await router.deployed()

		currencyConverter = await CurrencyConverter.deploy(
			ideaTokenExchange.address,
			dai.address,
			router.address,
			weth.address
		)
		await currencyConverter.deployed()

		await interestManagerCompound
			.connect(adminAccount)
			.initialize(ideaTokenExchange.address, dai.address, cDai.address, comp.address, zeroAddress)

		await ideaTokenFactory.connect(adminAccount).initialize(adminAccount.address, ideaTokenExchange.address)

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
				tradingFeeRate,
				platformFeeRate
			)

		marketID = await ideaTokenFactory.getMarketIDByName(marketName)

		await ideaTokenFactory.addToken(tokenName, marketID)

		tokenID = await ideaTokenFactory.getTokenIDByName(tokenName, marketID)

		ideaToken = new ethers.Contract(
			(await ideaTokenFactory.getTokenInfo(marketID, tokenID)).ideaToken,
			IdeaToken.interface,
			IdeaToken.signer
		)

		// Setup Uniswap pools
		// ETH-DAI: 1 ETH, 200 DAI
		const ethAmount = tenPow18
		let daiAmount = tenPow18.mul(BigNumber.from('200'))

		await weth.connect(adminAccount).deposit({ value: ethAmount })
		await dai.connect(adminAccount).mint(adminAccount.address, daiAmount)
		await weth.connect(adminAccount).approve(router.address, ethAmount)
		await dai.connect(adminAccount).approve(router.address, daiAmount)
		await uniswapFactory.connect(adminAccount).createPair(weth.address, dai.address)
		await router
			.connect(adminAccount)
			.addLiquidity(
				weth.address,
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
	})

	it('can buy/sell tokens ETH', async () => {
		const ideaTokenAmount = tenPow18.mul(BigNumber.from('25'))
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, ideaTokenAmount)
		const requiredInputForCost = (await router.getAmountsIn(buyCost, [weth.address, dai.address]))[0]

		await currencyConverter.buyTokens(
			zeroAddress,
			ideaToken.address,
			ideaTokenAmount,
			ideaTokenAmount,
			requiredInputForCost,
			userAccount.address,
			{ value: requiredInputForCost }
		)

		const tokenBalanceAfterBuy = await ideaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterBuy.eq(ideaTokenAmount)).to.be.true

		const sellPrice = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, tokenBalanceAfterBuy)
		const outputFromSell = (await router.getAmountsOut(sellPrice, [dai.address, weth.address]))[1]

		await ideaToken.approve(currencyConverter.address, tokenBalanceAfterBuy)
		await currencyConverter.sellTokens(
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
		const requiredInputForCost = (await router.getAmountsIn(buyCost, [weth.address, dai.address]))[0]

		await weth.deposit({ value: requiredInputForCost })
		await weth.approve(currencyConverter.address, requiredInputForCost)
		await currencyConverter.buyTokens(
			weth.address,
			ideaToken.address,
			ideaTokenAmount,
			ideaTokenAmount,
			requiredInputForCost,
			userAccount.address
		)

		const wethBalanceAfterBuy = await weth.balanceOf(userAccount.address)
		expect(wethBalanceAfterBuy.eq(BigNumber.from('0'))).to.be.true
		const tokenBalanceAfterBuy = await ideaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterBuy.eq(ideaTokenAmount)).to.be.true

		const sellPrice = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, tokenBalanceAfterBuy)
		const outputFromSell = (await router.getAmountsOut(sellPrice, [dai.address, weth.address]))[1]

		await ideaToken.approve(currencyConverter.address, tokenBalanceAfterBuy)
		await currencyConverter.sellTokens(
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
		const requiredInputForCost = (await router.getAmountsIn(buyCost, [someToken.address, dai.address]))[0]

		await someToken.mint(userAccount.address, requiredInputForCost)
		await someToken.approve(currencyConverter.address, requiredInputForCost)
		await currencyConverter.buyTokens(
			someToken.address,
			ideaToken.address,
			ideaTokenAmount,
			ideaTokenAmount,
			requiredInputForCost,
			userAccount.address
		)

		const someBalanceAfterBuy = await someToken.balanceOf(userAccount.address)
		expect(someBalanceAfterBuy.eq(BigNumber.from('0'))).to.be.true
		const tokenBalanceAfterBuy = await ideaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterBuy.eq(ideaTokenAmount)).to.be.true

		const sellPrice = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, tokenBalanceAfterBuy)
		const outputFromSell = (await router.getAmountsOut(sellPrice, [dai.address, someToken.address]))[1]

		await ideaToken.approve(currencyConverter.address, tokenBalanceAfterBuy)
		await currencyConverter.sellTokens(
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

	it('fail buy cost too high', async () => {
		const ideaTokenAmount = tenPow18.mul(BigNumber.from('25'))
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, ideaTokenAmount)
		const requiredInputForCost = (await router.getAmountsIn(buyCost, [someToken.address, dai.address]))[0]

		expect(
			currencyConverter.buyTokens(
				someToken.address,
				ideaToken.address,
				ideaTokenAmount,
				ideaTokenAmount,
				requiredInputForCost.sub(BigNumber.from('1')),
				userAccount.address
			)
		).to.be.revertedWith('')
	})

	it('fail sell price too low', async () => {
		const ideaTokenAmount = tenPow18.mul(BigNumber.from('25'))
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, ideaTokenAmount)
		const requiredInputForCost = (await router.getAmountsIn(buyCost, [someToken.address, dai.address]))[0]

		await someToken.mint(userAccount.address, requiredInputForCost)
		await someToken.approve(currencyConverter.address, requiredInputForCost)
		await currencyConverter.buyTokens(
			someToken.address,
			ideaToken.address,
			ideaTokenAmount,
			ideaTokenAmount,
			requiredInputForCost,
			userAccount.address
		)

		const someBalanceAfterBuy = await someToken.balanceOf(userAccount.address)
		expect(someBalanceAfterBuy.eq(BigNumber.from('0'))).to.be.true
		const tokenBalanceAfterBuy = await ideaToken.balanceOf(userAccount.address)
		expect(tokenBalanceAfterBuy.eq(ideaTokenAmount)).to.be.true

		const sellPrice = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, tokenBalanceAfterBuy)
		const outputFromSell = (await router.getAmountsOut(sellPrice, [dai.address, someToken.address]))[1]

		await ideaToken.approve(currencyConverter.address, tokenBalanceAfterBuy)
		expect(
			currencyConverter.sellTokens(
				someToken.address,
				ideaToken.address,
				tokenBalanceAfterBuy,
				outputFromSell.add(BigNumber.from('1')),
				userAccount.address
			)
		).to.be.revertedWith('sellTokens: slippage too high')
	})
})
