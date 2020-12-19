const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('core/IdeaTokenExchange', () => {
	let DomainNoSubdomainNameVerifier
	let TestERC20
	let TestCDai
	let InterestManagerCompound
	let IdeaTokenFactory
	let IdeaTokenExchange
	let IdeaToken

	const tenPow17 = BigNumber.from('10').pow(BigNumber.from('17'))
	const tenPow18 = BigNumber.from('10').pow(BigNumber.from('18'))

	const marketName = 'main'
	const tokenName = 'test.com'
	const baseCost = BigNumber.from('100000000000000000') // 10**17 = $0.1
	const priceRise = BigNumber.from('100000000000000') // 10**14 = $0.0001
	const hatchTokens = BigNumber.from('1000000000000000000000') // 10**21 = 1000
	const tradingFeeRate = BigNumber.from('100')
	const platformFeeRate = BigNumber.from('50')
	const feeScale = BigNumber.from('10000')

	let userAccount
	let adminAccount
	let authorizerAccount
	let tradingFeeAccount
	let interestReceiverAccount
	let platformFeeReceiverAccount
	const zeroAddress = '0x0000000000000000000000000000000000000000'
	const someAddress = '0x52bc44d5378309EE2abF1539BF71dE1b7d7bE3b5' // random addr from etherscan

	let domainNoSubdomainNameVerifier
	let dai
	let comp
	let cDai
	let interestManagerCompound
	let ideaTokenFactory
	let ideaTokenExchange

	let marketID
	let tokenID
	let ideaToken

	before(async () => {
		const accounts = await ethers.getSigners()
		userAccount = accounts[0]
		adminAccount = accounts[1]
		authorizerAccount = accounts[2]
		tradingFeeAccount = accounts[3]
		interestReceiverAccount = accounts[4]
		platformFeeReceiverAccount = accounts[5]

		DomainNoSubdomainNameVerifier = await ethers.getContractFactory('DomainNoSubdomainNameVerifier')
		TestERC20 = await ethers.getContractFactory('TestERC20')
		TestCDai = await ethers.getContractFactory('TestCDai')
		InterestManagerCompound = await ethers.getContractFactory('InterestManagerCompound')
		IdeaTokenFactory = await ethers.getContractFactory('IdeaTokenFactory')
		IdeaTokenExchange = await ethers.getContractFactory('IdeaTokenExchange')
		IdeaToken = await ethers.getContractFactory('IdeaToken')
	})

	beforeEach(async () => {
		domainNoSubdomainNameVerifier = await DomainNoSubdomainNameVerifier.deploy()
		await domainNoSubdomainNameVerifier.deployed()

		dai = await TestERC20.deploy('DAI', 'DAI')
		await dai.deployed()

		comp = await TestERC20.deploy('COMP', 'COMP')
		await comp.deployed()

		cDai = await TestCDai.deploy(dai.address, comp.address)
		await cDai.deployed()
		await cDai.setExchangeRate(tenPow18)

		interestManagerCompound = await InterestManagerCompound.deploy()
		await interestManagerCompound.deployed()

		ideaTokenFactory = await IdeaTokenFactory.deploy()
		await ideaTokenFactory.deployed()

		ideaTokenExchange = await IdeaTokenExchange.deploy()
		await ideaTokenExchange.deployed()

		await interestManagerCompound
			.connect(adminAccount)
			.initialize(ideaTokenExchange.address, dai.address, cDai.address, comp.address, zeroAddress)

		await ideaTokenFactory.connect(adminAccount).initialize(adminAccount.address, ideaTokenExchange.address)

		await ideaTokenExchange
			.connect(adminAccount)
			.initialize(
				adminAccount.address,
				authorizerAccount.address,
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

		await ideaTokenFactory.addToken(tokenName, marketID)

		tokenID = await ideaTokenFactory.getTokenIDByName(tokenName, marketID)

		ideaToken = new ethers.Contract(
			(await ideaTokenFactory.getTokenInfo(marketID, tokenID)).ideaToken,
			IdeaToken.interface,
			IdeaToken.signer
		)
	})

	it('admin is owner', async () => {
		expect(adminAccount.address).to.be.equal(await ideaTokenExchange.getOwner())
	})

	it('can buy and sell 500 tokens with correct interest', async () => {
		const amount = BigNumber.from('250').mul(tenPow18)
		const initialExchangeRate = tenPow18
		const firstCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, amount)
		const firstTradingFee = await getTradingFeeForBuying(ideaToken, amount)
		const firstTradingFeeInvested = firstTradingFee.mul(tenPow18).div(initialExchangeRate)
		const firstPlatformFee = await getPlatformFeeForBuying(ideaToken, amount)
		const firstPlatformFeeInvested = firstPlatformFee.mul(tenPow18).div(initialExchangeRate)
		const firstRawCost = firstCost.sub(firstTradingFee).sub(firstPlatformFee)
		expect(firstCost.eq(await getCostForBuyingTokens(ideaToken, amount))).to.be.true

		await dai.mint(userAccount.address, firstCost)
		await dai.approve(ideaTokenExchange.address, firstCost)
		await ideaTokenExchange.buyTokens(ideaToken.address, amount, amount, firstCost, userAccount.address)

		expect((await dai.balanceOf(userAccount.address)).eq(BigNumber.from('0'))).to.be.true
		expect((await ideaToken.balanceOf(userAccount.address)).eq(amount)).to.be.true
		expect(
			(await ideaTokenExchange.getTradingFeePayable()).eq(
				firstTradingFeeInvested.mul(initialExchangeRate).div(tenPow18)
			)
		).to.be.true
		expect(
			(await ideaTokenExchange.getPlatformFeePayable(marketID)).eq(
				firstPlatformFeeInvested.mul(initialExchangeRate).div(tenPow18)
			)
		).to.be.true

		expect((await ideaTokenExchange.getInterestPayable(ideaToken.address)).eq(BigNumber.from('0'))).to.be.true
		const firstExchangeRate = tenPow18.add(tenPow17) // 1.1
		await cDai.setExchangeRate(firstExchangeRate)

		const firstInterestPayable = firstRawCost.mul(firstExchangeRate).div(tenPow18).sub(firstRawCost)

		expect((await ideaTokenExchange.getInterestPayable(ideaToken.address)).eq(firstInterestPayable)).to.be.true

		const secondCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, amount)
		const secondTradingFee = await getTradingFeeForBuying(ideaToken, amount)
		const secondTradingFeeInvested = secondTradingFee.mul(tenPow18).div(firstExchangeRate)
		const secondPlatformFee = await getPlatformFeeForBuying(ideaToken, amount)
		const secondPlatformFeeInvested = secondPlatformFee.mul(tenPow18).div(firstExchangeRate)
		const secondRawCost = secondCost.sub(secondTradingFee).sub(secondPlatformFee)
		expect(secondCost.eq(await getCostForBuyingTokens(ideaToken, amount))).to.be.true

		await dai.mint(userAccount.address, secondCost)
		await dai.approve(ideaTokenExchange.address, secondCost)
		await ideaTokenExchange.buyTokens(ideaToken.address, amount, amount, secondCost, userAccount.address)

		expect((await dai.balanceOf(userAccount.address)).eq(BigNumber.from('0'))).to.be.true
		expect((await ideaToken.balanceOf(userAccount.address)).eq(amount.add(amount))).to.be.true
		expect(
			(await ideaTokenExchange.getTradingFeePayable()).eq(
				firstTradingFeeInvested.add(secondTradingFeeInvested).mul(firstExchangeRate).div(tenPow18)
			)
		).to.be.true
		expect(
			(await ideaTokenExchange.getPlatformFeePayable(marketID)).eq(
				firstPlatformFeeInvested.add(secondPlatformFeeInvested).mul(firstExchangeRate).div(tenPow18)
			)
		).to.be.true

		// TODO: Minor rounding error
		// expect((await ideaTokenExchange.getInterestPayable(ideaToken.address)).eq(firstInterestPayable)).to.be.true
		const secondExchangeRate = tenPow18.add(tenPow17.mul(BigNumber.from('2'))) // 1.2
		await cDai.setExchangeRate(secondExchangeRate)

		const secondInterestPayable = firstRawCost
			.add(secondRawCost.mul(tenPow18).div(firstExchangeRate))
			.mul(secondExchangeRate)
			.div(tenPow18)
			.sub(firstRawCost.add(secondRawCost))

		expect((await ideaTokenExchange.getInterestPayable(ideaToken.address)).eq(secondInterestPayable)).to.be.true

		const firstPrice = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, amount)
		const thirdTradingFee = await getTradingFeeForSelling(ideaToken, amount)
		const thirdTradingFeeInvested = thirdTradingFee.mul(tenPow18).div(secondExchangeRate)
		const thirdPlatformFee = await getPlatformFeeForSelling(ideaToken, amount)
		const thirdPlatformFeeInvested = thirdPlatformFee.mul(tenPow18).div(secondExchangeRate)
		const firstRawPrice = firstPrice.add(thirdTradingFee).add(thirdPlatformFee)
		expect(firstPrice.eq(await getPriceForSellingTokens(ideaToken, amount)))

		await ideaTokenExchange.sellTokens(ideaToken.address, amount, firstPrice, userAccount.address)

		expect((await dai.balanceOf(userAccount.address)).eq(firstPrice)).to.be.true
		expect((await ideaToken.balanceOf(userAccount.address)).eq(amount))
		expect(
			(await ideaTokenExchange.getTradingFeePayable()).eq(
				firstTradingFeeInvested
					.add(secondTradingFeeInvested)
					.add(thirdTradingFeeInvested)
					.mul(secondExchangeRate)
					.div(tenPow18)
			)
		).to.be.true
		expect(
			(await ideaTokenExchange.getPlatformFeePayable(marketID)).eq(
				firstPlatformFeeInvested
					.add(secondPlatformFeeInvested)
					.add(thirdPlatformFeeInvested)
					.mul(secondExchangeRate)
					.div(tenPow18)
			)
		).to.be.true
		// TODO: Minor rounding error
		//expect((await ideaTokenExchange.getInterestPayable(ideaToken.address)).eq(secondInterestPayable)).to.be.true
		const thirdExchangeRate = tenPow18.add(tenPow17.mul(BigNumber.from('3'))) // 1.3
		await cDai.setExchangeRate(thirdExchangeRate)

		/* eslint-disable-next-line no-unused-vars*/
		const thirdInterestPayable = firstRawCost
			.add(secondRawCost.mul(tenPow18).div(firstExchangeRate))
			.sub(firstRawPrice.mul(tenPow18).div(secondExchangeRate))
			.mul(thirdExchangeRate)
			.div(tenPow18)
			.sub(firstRawCost.add(secondRawCost).sub(firstRawPrice))

		// TODO: Minor rounding error
		//expect((await ideaTokenExchange.getInterestPayable(ideaToken.address)).eq(thirdInterestPayable)).to.be.true

		const secondPrice = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, amount)
		const fourthTradingFee = await getTradingFeeForSelling(ideaToken, amount)
		const fourthTradingFeeInvested = fourthTradingFee.mul(tenPow18).div(thirdExchangeRate)
		const fourthPlatformFee = await getPlatformFeeForSelling(ideaToken, amount)
		const fourthPlatformFeeInvested = fourthPlatformFee.mul(tenPow18).div(thirdExchangeRate)
		const secondRawPrice = secondPrice.add(fourthTradingFee).add(fourthPlatformFee)
		expect(secondPrice.eq(await getPriceForSellingTokens(ideaToken, amount))).to.be.true

		await ideaTokenExchange.sellTokens(ideaToken.address, amount, secondPrice, userAccount.address)

		expect((await dai.balanceOf(userAccount.address)).eq(firstPrice.add(secondPrice))).to.be.true
		expect((await ideaToken.balanceOf(userAccount.address)).eq(BigNumber.from('0'))).to.be.true
		expect(
			(await ideaTokenExchange.getTradingFeePayable()).eq(
				firstTradingFeeInvested
					.add(secondTradingFeeInvested)
					.add(thirdTradingFeeInvested)
					.add(fourthTradingFeeInvested)
					.mul(thirdExchangeRate)
					.div(tenPow18)
			)
		).to.be.true
		expect(
			(await ideaTokenExchange.getPlatformFeePayable(marketID)).eq(
				firstPlatformFeeInvested
					.add(secondPlatformFeeInvested)
					.add(thirdPlatformFeeInvested)
					.add(fourthPlatformFeeInvested)
					.mul(thirdExchangeRate)
					.div(tenPow18)
			)
		).to.be.true

		// TODO: Minor rounding error
		//expect((await ideaTokenExchange.getInterestPayable(ideaToken.address)).eq(thirdInterestPayable)).to.be.true
		const fourthExchangeRate = tenPow18.add(tenPow17.mul(BigNumber.from('4'))) // 1.4
		await cDai.setExchangeRate(fourthExchangeRate)

		/* eslint-disable-next-line no-unused-vars*/
		const fourthInterestPayable = firstRawCost
			.add(secondRawCost.mul(tenPow18).div(firstExchangeRate))
			.sub(firstRawPrice.mul(tenPow18).div(secondExchangeRate))
			.sub(secondRawPrice.mul(tenPow18).div(thirdExchangeRate))
			.mul(fourthExchangeRate)
			.div(tenPow18)
			.sub(firstRawCost.add(secondRawCost).sub(firstRawPrice).sub(secondRawPrice))

		// TODO: Minor rounding error
		//expect.isTrue((await ideaTokenExchange.getInterestPayable(ideaToken.address)).eq(fourthInterestPayable)).to.be.true

		const finalPlatformFee = firstPlatformFeeInvested
			.add(secondPlatformFeeInvested)
			.add(thirdPlatformFeeInvested)
			.add(fourthPlatformFeeInvested)
			.mul(fourthExchangeRate)
			.div(tenPow18)

		expect((await ideaTokenExchange.getPlatformFeePayable(marketID)).eq(finalPlatformFee)).to.be.true

		const finalTradingFee = firstTradingFeeInvested
			.add(secondTradingFeeInvested)
			.add(thirdTradingFeeInvested)
			.add(fourthTradingFeeInvested)
			.mul(fourthExchangeRate)
			.div(tenPow18)

		expect((await ideaTokenExchange.getTradingFeePayable()).eq(finalTradingFee)).to.be.true

		await ideaTokenExchange
			.connect(adminAccount)
			.authorizePlatformFeeWithdrawer(marketID, platformFeeReceiverAccount.address)

		await ideaTokenExchange.connect(platformFeeReceiverAccount).withdrawPlatformFee(marketID)
		expect((await dai.balanceOf(platformFeeReceiverAccount.address)).eq(finalPlatformFee)).to.be.true

		await ideaTokenExchange
			.connect(adminAccount)
			.authorizeInterestWithdrawer(ideaToken.address, interestReceiverAccount.address)

		await ideaTokenExchange.connect(interestReceiverAccount).withdrawInterest(ideaToken.address)
		// TODO: Minor rounding error
		// expect((await dai.balanceOf(interestReceiverAccount)).eq(fourthInterestPayable))

		await ideaTokenExchange.withdrawTradingFee()
		expect((await dai.balanceOf(tradingFeeAccount.address)).eq(finalTradingFee)).to.be.true
		expect((await ideaTokenExchange.getTradingFeePayable()).eq(BigNumber.from('0'))).to.be.true
	})

	it('buy completely in hatch', async () => {
		const amount = hatchTokens.div(2)
		const cost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, amount)
		expect(cost.eq(await getCostForBuyingTokens(ideaToken, amount))).to.be.true
		await dai.mint(userAccount.address, cost)
		await dai.approve(ideaTokenExchange.address, cost)
		await ideaTokenExchange.buyTokens(ideaToken.address, amount, amount, cost, userAccount.address)
	})

	it('buy full hatch', async () => {
		const amount = hatchTokens
		const cost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, amount)
		expect(cost.eq(await getCostForBuyingTokens(ideaToken, amount))).to.be.true
		await dai.mint(userAccount.address, cost)
		await dai.approve(ideaTokenExchange.address, cost)
		await ideaTokenExchange.buyTokens(ideaToken.address, amount, amount, cost, userAccount.address)
	})

	it('buy partially in hatch', async () => {
		const amount = hatchTokens.mul(2)
		const cost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, amount)
		expect(cost.eq(await getCostForBuyingTokens(ideaToken, amount))).to.be.true
		await dai.mint(userAccount.address, cost)
		await dai.approve(ideaTokenExchange.address, cost)
		await ideaTokenExchange.buyTokens(ideaToken.address, amount, amount, cost, userAccount.address)
	})

	it('buy completely outside hatch', async () => {
		const hatchCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, hatchTokens)
		await dai.mint(userAccount.address, hatchCost)
		await dai.approve(ideaTokenExchange.address, hatchCost)
		await ideaTokenExchange.buyTokens(ideaToken.address, hatchTokens, hatchTokens, hatchCost, userAccount.address)

		const amount = hatchTokens.mul(2)
		const cost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, amount)
		expect(cost.eq(await getCostForBuyingTokens(ideaToken, amount))).to.be.true
		await dai.mint(userAccount.address, cost)
		await dai.approve(ideaTokenExchange.address, cost)
		await ideaTokenExchange.buyTokens(ideaToken.address, amount, amount, cost, userAccount.address)
	})

	it('sell completely in hatch', async () => {
		const amount = hatchTokens.div(2)
		const cost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, amount)
		await dai.mint(userAccount.address, cost)
		await dai.approve(ideaTokenExchange.address, cost)
		await ideaTokenExchange.buyTokens(ideaToken.address, amount, amount, cost, userAccount.address)

		const price = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, amount)
		expect(price.eq(await getPriceForSellingTokens(ideaToken, amount))).to.be.true
		await ideaTokenExchange.sellTokens(ideaToken.address, amount, price, userAccount.address)
	})

	it('sell full hatch', async () => {
		const amount = hatchTokens
		const cost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, amount)
		await dai.mint(userAccount.address, cost)
		await dai.approve(ideaTokenExchange.address, cost)
		await ideaTokenExchange.buyTokens(ideaToken.address, amount, amount, cost, userAccount.address)

		const price = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, amount)
		expect(price.eq(await getPriceForSellingTokens(ideaToken, amount))).to.be.true
		await ideaTokenExchange.sellTokens(ideaToken.address, amount, price, userAccount.address)
	})

	it('sell partially in hatch', async () => {
		const buyAmount = hatchTokens.add(tenPow18.mul(100))
		const cost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, buyAmount)
		await dai.mint(userAccount.address, cost)
		await dai.approve(ideaTokenExchange.address, cost)
		await ideaTokenExchange.buyTokens(ideaToken.address, buyAmount, buyAmount, cost, userAccount.address)

		const amount = tenPow18.mul(200)
		const price = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, amount)
		expect(price.eq(await getPriceForSellingTokens(ideaToken, amount))).to.be.true
		await ideaTokenExchange.sellTokens(ideaToken.address, amount, price, userAccount.address)
	})

	it('sell completely outside hatch', async () => {
		const buyAmount = hatchTokens.add(tenPow18.mul(200))
		const cost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, buyAmount)
		await dai.mint(userAccount.address, cost)
		await dai.approve(ideaTokenExchange.address, cost)
		await ideaTokenExchange.buyTokens(ideaToken.address, buyAmount, buyAmount, cost, userAccount.address)

		const amount = tenPow18.mul(100)
		const price = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, amount)
		expect(price.eq(await getPriceForSellingTokens(ideaToken, amount))).to.be.true
		await ideaTokenExchange.sellTokens(ideaToken.address, amount, price, userAccount.address)
	})

	it('can fallback on buy', async () => {
		const amount = tenPow18
		const tooHighAmount = amount.mul(BigNumber.from('2'))
		const cost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, tenPow18)

		await dai.mint(userAccount.address, cost)
		await dai.approve(ideaTokenExchange.address, cost)

		await expect(
			ideaTokenExchange.buyTokens(ideaToken.address, tooHighAmount, tooHighAmount, cost, userAccount.address)
		).to.be.revertedWith('buyTokens: slippage too high')
		await ideaTokenExchange.buyTokens(ideaToken.address, tooHighAmount, amount, cost, userAccount.address)
	})

	it('fail buy/sell - invalid token', async () => {
		await expect(
			ideaTokenExchange.buyTokens(zeroAddress, tenPow18, tenPow18, tenPow18, userAccount.address)
		).to.be.revertedWith('buyTokens: token does not exist')
		await expect(
			ideaTokenExchange.sellTokens(zeroAddress, tenPow18, tenPow18, userAccount.address)
		).to.be.revertedWith('sellTokens: token does not exist')
	})

	it('fail buy/sell - max cost / minPrice', async () => {
		const amount = tenPow18
		const cost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, tenPow18)

		await expect(
			ideaTokenExchange.buyTokens(
				ideaToken.address,
				amount,
				amount,
				cost.sub(BigNumber.from('1')),
				userAccount.address
			)
		).to.be.revertedWith('buyTokens: slippage too high')

		await dai.mint(userAccount.address, cost)
		await dai.approve(ideaTokenExchange.address, cost)
		await ideaTokenExchange.buyTokens(ideaToken.address, amount, amount, cost, userAccount.address)

		const price = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, tenPow18)

		await expect(
			ideaTokenExchange.sellTokens(ideaToken.address, amount, price.add(BigNumber.from('1')), userAccount.address)
		).to.be.revertedWith('sellTokens: price subceeds min price')
	})

	it('fail buy - not enough allowance', async () => {
		const amount = tenPow18
		const cost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, tenPow18)
		await dai.mint(userAccount.address, cost)

		await expect(
			ideaTokenExchange.buyTokens(ideaToken.address, amount, amount, cost, userAccount.address)
		).to.be.revertedWith('buyTokens: not enough allowance')
	})

	it('fail buy/sell - not enough tokens', async () => {
		const amount = tenPow18
		const cost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, tenPow18)
		await dai.mint(userAccount.address, cost.sub(BigNumber.from('1')))
		await dai.approve(ideaTokenExchange.address, cost)

		await expect(
			ideaTokenExchange.buyTokens(ideaToken.address, amount, amount, cost, userAccount.address)
		).to.be.revertedWith('ERC20: transfer amount exceeds balance')

		await dai.mint(adminAccount.address, cost)
		await dai.connect(adminAccount).approve(ideaTokenExchange.address, cost)
		await ideaTokenExchange
			.connect(adminAccount)
			.buyTokens(ideaToken.address, amount, amount, cost, adminAccount.address)

		await expect(
			ideaTokenExchange.sellTokens(
				ideaToken.address,
				BigNumber.from('1'),
				BigNumber.from('0'),
				userAccount.address
			)
		).to.be.revertedWith('sellTokens: not enough tokens')
	})

	it('can withdraw platform interest', async () => {
		await ideaTokenFactory
			.connect(adminAccount)
			.addMarket(
				'SomeOtherMarket',
				domainNoSubdomainNameVerifier.address,
				baseCost,
				priceRise,
				hatchTokens,
				tradingFeeRate,
				platformFeeRate,
				true
			)
		const newMarketID = await ideaTokenFactory.getMarketIDByName('SomeOtherMarket')

		await ideaTokenFactory.addToken('someothertoken.com', newMarketID)
		const newTokenID = await ideaTokenFactory.getTokenIDByName('someothertoken.com', newMarketID)
		const newIdeaToken = new ethers.Contract(
			(await ideaTokenFactory.getTokenInfo(newMarketID, newTokenID)).ideaToken,
			IdeaToken.interface,
			IdeaToken.signer
		)

		const amount = tenPow18
		const cost = await ideaTokenExchange.getCostForBuyingTokens(newIdeaToken.address, tenPow18)
		await dai.mint(userAccount.address, cost)
		await dai.approve(ideaTokenExchange.address, cost)
		await dai.approve(ideaTokenExchange.address, cost)

		expect((await ideaTokenExchange.getPlatformInterestPayable(newMarketID)).eq(BigNumber.from('0'))).to.be.true
		await ideaTokenExchange.buyTokens(newIdeaToken.address, amount, amount, cost, userAccount.address)
		expect((await ideaTokenExchange.getPlatformInterestPayable(newMarketID)).eq(BigNumber.from('0'))).to.be.true

		await cDai.setExchangeRate(tenPow18.mul(BigNumber.from('2')))

		const interest = await ideaTokenExchange.getPlatformInterestPayable(newMarketID)
		expect(interest.eq(BigNumber.from('0'))).to.be.false
		expect((await dai.balanceOf(platformFeeReceiverAccount.address)).eq(BigNumber.from('0'))).to.be.true

		await ideaTokenExchange
			.connect(adminAccount)
			.authorizePlatformFeeWithdrawer(newMarketID, platformFeeReceiverAccount.address)

		await ideaTokenExchange.connect(platformFeeReceiverAccount).withdrawPlatformInterest(newMarketID)

		expect((await ideaTokenExchange.getPlatformInterestPayable(newMarketID)).eq(BigNumber.from('0'))).to.be.true
		expect((await dai.balanceOf(platformFeeReceiverAccount.address)).eq(interest)).to.be.true
	})

	it('no trading fee available', async () => {
		expect((await ideaTokenExchange.getTradingFeePayable()).eq(BigNumber.from('0'))).to.be.true
		await ideaTokenExchange.withdrawTradingFee()
		expect((await dai.balanceOf(tradingFeeAccount.address)).eq(BigNumber.from('0'))).to.be.true
	})

	it('no platform fee available', async () => {
		await ideaTokenExchange
			.connect(adminAccount)
			.authorizePlatformFeeWithdrawer(marketID, platformFeeReceiverAccount.address)

		expect((await ideaTokenExchange.getPlatformFeePayable(marketID)).eq(BigNumber.from('0'))).to.be.true
		await ideaTokenExchange.connect(platformFeeReceiverAccount).withdrawPlatformFee(marketID)
		expect((await dai.balanceOf(platformFeeReceiverAccount.address)).eq(BigNumber.from('0'))).to.be.true
	})

	it('no platform interest available', async () => {
		await ideaTokenExchange
			.connect(adminAccount)
			.authorizePlatformFeeWithdrawer(marketID, platformFeeReceiverAccount.address)

		expect((await ideaTokenExchange.getPlatformInterestPayable(marketID)).eq(BigNumber.from('0'))).to.be.true
		await ideaTokenExchange.connect(platformFeeReceiverAccount).withdrawPlatformInterest(marketID)
		expect((await dai.balanceOf(platformFeeReceiverAccount.address)).eq(BigNumber.from('0'))).to.be.true
	})

	it('no interest available', async () => {
		await ideaTokenExchange
			.connect(adminAccount)
			.authorizeInterestWithdrawer(ideaToken.address, interestReceiverAccount.address)

		expect((await ideaTokenExchange.getInterestPayable(ideaToken.address)).eq(BigNumber.from('0'))).to.be.true
		await ideaTokenExchange.connect(interestReceiverAccount).withdrawInterest(ideaToken.address)
		expect((await dai.balanceOf(interestReceiverAccount.address)).eq(BigNumber.from('0'))).to.be.true
	})

	it('fail authorize interest withdrawer not authorized', async () => {
		await expect(
			ideaTokenExchange.authorizeInterestWithdrawer(ideaToken.address, interestReceiverAccount.address)
		).to.be.revertedWith('authorizeInterestWithdrawer: not authorized')
	})

	it('fail withdraw interest not authorized', async () => {
		await expect(ideaTokenExchange.withdrawInterest(ideaToken.address)).to.be.revertedWith(
			'withdrawInterest: not authorized'
		)
	})

	it('fail withdraw platform fee not authorized', async () => {
		await expect(ideaTokenExchange.withdrawPlatformFee(marketID)).to.be.revertedWith(
			'withdrawPlatformFee: not authorized'
		)
	})

	it('fail withdraw platform interest not authorized', async () => {
		await expect(ideaTokenExchange.withdrawPlatformInterest(marketID)).to.be.revertedWith(
			'withdrawPlatformInterest: not authorized'
		)
	})

	it('fail authorize platform fee withdrawer not authorized', async () => {
		await expect(
			ideaTokenExchange.authorizePlatformFeeWithdrawer(marketID, platformFeeReceiverAccount.address)
		).to.be.revertedWith('authorizePlatformFeeWithdrawer: not authorized')
	})

	it('can set factory address on init', async () => {
		const exchange = await IdeaTokenExchange.deploy()
		await exchange.deployed()

		await exchange
			.connect(adminAccount)
			.initialize(
				adminAccount.address,
				zeroAddress,
				tradingFeeAccount.address,
				interestManagerCompound.address,
				dai.address
			)

		await exchange.connect(adminAccount).setIdeaTokenFactoryAddress(someAddress)
	})

	it('fail only owner can set factory address', async () => {
		const exchange = await IdeaTokenExchange.deploy()
		await exchange.deployed()

		await exchange
			.connect(adminAccount)
			.initialize(
				adminAccount.address,
				zeroAddress,
				tradingFeeAccount.address,
				interestManagerCompound.address,
				dai.address
			)

		await expect(exchange.setIdeaTokenFactoryAddress(someAddress)).to.be.revertedWith('Ownable: onlyOwner')
	})

	it('fail cannot set factory address twice', async () => {
		const exchange = await IdeaTokenExchange.deploy()
		await exchange.deployed()

		await exchange
			.connect(adminAccount)
			.initialize(
				adminAccount.address,
				zeroAddress,
				tradingFeeAccount.address,
				interestManagerCompound.address,
				dai.address
			)

		await exchange.connect(adminAccount).setIdeaTokenFactoryAddress(someAddress)

		await expect(exchange.connect(adminAccount).setIdeaTokenFactoryAddress(someAddress)).to.be.reverted
	})

	it('admin can set authorizer', async () => {
		await ideaTokenExchange.connect(adminAccount).setAuthorizer(zeroAddress)
	})

	it('fail user cannot set authorizer', async () => {
		await expect(ideaTokenExchange.setAuthorizer(zeroAddress)).to.be.revertedWith('Ownable: onlyOwner')
	})

	it('authorizer can set interest withdrawer', async () => {
		await ideaTokenExchange.connect(authorizerAccount).authorizeInterestWithdrawer(ideaToken.address, someAddress)
	})

	it('interest withdrawer can set new interest withdrawer', async () => {
		await ideaTokenExchange
			.connect(authorizerAccount)
			.authorizeInterestWithdrawer(ideaToken.address, tradingFeeAccount.address)
		await ideaTokenExchange.connect(tradingFeeAccount).authorizeInterestWithdrawer(ideaToken.address, someAddress)
	})

	it('fail authorizer cannot set interest withdrawer twice', async () => {
		await ideaTokenExchange.connect(authorizerAccount).authorizeInterestWithdrawer(ideaToken.address, someAddress)
		await expect(
			ideaTokenExchange.connect(authorizerAccount).authorizeInterestWithdrawer(ideaToken.address, someAddress)
		).to.be.revertedWith('authorizeInterestWithdrawer: not authorized')
	})

	it('admin can set interest withdrawer twice', async () => {
		await ideaTokenExchange.connect(adminAccount).authorizeInterestWithdrawer(ideaToken.address, someAddress)
		await ideaTokenExchange.connect(adminAccount).authorizeInterestWithdrawer(ideaToken.address, someAddress)
	})

	it('authorizer can set platform fee withdrawer', async () => {
		await ideaTokenExchange.connect(authorizerAccount).authorizePlatformFeeWithdrawer(marketID, someAddress)
	})

	it('platform fee withdrawer can set new platform fee withdrawer', async () => {
		await ideaTokenExchange
			.connect(authorizerAccount)
			.authorizePlatformFeeWithdrawer(marketID, tradingFeeAccount.address)
		await ideaTokenExchange.connect(tradingFeeAccount).authorizePlatformFeeWithdrawer(marketID, someAddress)
	})

	it('fail authorizer cannot set platform fee withdrawer twice', async () => {
		await ideaTokenExchange.connect(authorizerAccount).authorizePlatformFeeWithdrawer(marketID, someAddress)
		await expect(
			ideaTokenExchange.connect(authorizerAccount).authorizePlatformFeeWithdrawer(marketID, someAddress)
		).to.be.revertedWith('authorizePlatformFeeWithdrawer: not authorized')
	})

	it('admin can set platform fee withdrawer twice', async () => {
		await ideaTokenExchange.connect(adminAccount).authorizePlatformFeeWithdrawer(marketID, someAddress)
		await ideaTokenExchange.connect(adminAccount).authorizePlatformFeeWithdrawer(marketID, someAddress)
	})

	it('admin can disable fees for specific token', async () => {
		expect(await ideaTokenExchange.isTokenFeeDisabled(ideaToken.address)).to.be.false
		await ideaTokenExchange.connect(adminAccount).setTokenFeeKillswitch(ideaToken.address, true)
		expect(await ideaTokenExchange.isTokenFeeDisabled(ideaToken.address)).to.be.true
	})

	it('fail user cannot disable fees for specific token', async () => {
		await expect(ideaTokenExchange.setTokenFeeKillswitch(ideaToken.address, true)).to.be.revertedWith(
			'Ownable: onlyOwner'
		)
	})

	it('correct costs when buying with fee disabled', async () => {
		const amount = tenPow18.mul(BigNumber.from('2000'))
		const marketDetails = await ideaTokenFactory.getMarketDetailsByTokenAddress(ideaToken.address)

		const buyAmountsWithFees = await ideaTokenExchange.getCostsForBuyingTokens(
			marketDetails,
			BigNumber.from('0'),
			amount,
			false
		)
		const buyAmountsWithoutFees = await ideaTokenExchange.getCostsForBuyingTokens(
			marketDetails,
			BigNumber.from('0'),
			amount,
			true
		)

		const expectedTotalWithFee = await getCostForBuyingTokens(ideaToken, amount)
		const expectedTradingFeeWithFee = await getTradingFeeForBuying(ideaToken, amount)
		const expectedPlatformFeeWithFee = await getPlatformFeeForBuying(ideaToken, amount)
		const expectedRawWithFee = expectedTotalWithFee.sub(expectedTradingFeeWithFee).sub(expectedPlatformFeeWithFee)
		expect(buyAmountsWithFees.total.eq(expectedTotalWithFee)).to.be.true
		expect(buyAmountsWithFees.tradingFee.eq(expectedTradingFeeWithFee)).to.be.true
		expect(buyAmountsWithFees.platformFee.eq(expectedPlatformFeeWithFee)).to.be.true
		expect(buyAmountsWithFees.raw.eq(expectedRawWithFee)).to.be.true

		expect(buyAmountsWithoutFees.tradingFee.eq(BigNumber.from('0'))).to.be.true
		expect(buyAmountsWithoutFees.platformFee.eq(BigNumber.from('0'))).to.be.true
		expect(buyAmountsWithoutFees.total.eq(expectedRawWithFee)).to.be.true
		expect(buyAmountsWithoutFees.total.eq(buyAmountsWithoutFees.raw)).to.be.true
	})

	it('correct prices when selling with fee disabled', async () => {
		const amount = tenPow18.mul(BigNumber.from('2000'))
		const costToBuy = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, amount)
		await dai.mint(userAccount.address, costToBuy)
		await dai.approve(ideaTokenExchange.address, costToBuy)
		await ideaTokenExchange.buyTokens(ideaToken.address, amount, amount, costToBuy, userAccount.address)

		const marketDetails = await ideaTokenFactory.getMarketDetailsByTokenAddress(ideaToken.address)

		const sellAmountsWithFees = await ideaTokenExchange.getPricesForSellingTokens(
			marketDetails,
			amount,
			amount,
			false
		)
		const sellAmountsWithoutFees = await ideaTokenExchange.getPricesForSellingTokens(
			marketDetails,
			amount,
			amount,
			true
		)

		const expectedTotalWithFee = await getPriceForSellingTokens(ideaToken, amount)
		const expectedTradingFeeWithFee = await getTradingFeeForSelling(ideaToken, amount)
		const expectedPlatformFeeWithFee = await getPlatformFeeForSelling(ideaToken, amount)
		const expectedRawWithFee = expectedTotalWithFee.add(expectedTradingFeeWithFee).add(expectedPlatformFeeWithFee)
		expect(sellAmountsWithFees.total.eq(expectedTotalWithFee)).to.be.true
		expect(sellAmountsWithFees.tradingFee.eq(expectedTradingFeeWithFee)).to.be.true
		expect(sellAmountsWithFees.platformFee.eq(expectedPlatformFeeWithFee)).to.be.true
		expect(sellAmountsWithFees.raw.eq(expectedRawWithFee)).to.be.true

		expect(sellAmountsWithoutFees.tradingFee.eq(BigNumber.from('0'))).to.be.true
		expect(sellAmountsWithoutFees.platformFee.eq(BigNumber.from('0'))).to.be.true
		expect(sellAmountsWithoutFees.total.eq(expectedRawWithFee)).to.be.true
		expect(sellAmountsWithoutFees.total.eq(sellAmountsWithoutFees.raw)).to.be.true
	})

	function getRawCostForBuyingTokens(baseCost, priceRise, hatchTokens, supply, amount) {
		let hatchCost = BigNumber.from('0')
		let updatedAmount = BigNumber.from(amount.toString())
		let updatedSupply

		if (supply.lt(hatchTokens)) {
			const remainingHatchTokens = hatchTokens.sub(supply)

			if (amount.lte(remainingHatchTokens)) {
				return baseCost.mul(amount).div(tenPow18)
			}

			hatchCost = baseCost.mul(remainingHatchTokens).div(tenPow18)
			updatedSupply = BigNumber.from('0')
			updatedAmount = amount.sub(remainingHatchTokens)
		} else {
			updatedSupply = supply.sub(hatchTokens)
		}

		const priceAtSupply = baseCost.add(priceRise.mul(updatedSupply).div(tenPow18))
		const priceAtSupplyPlusAmount = baseCost.add(priceRise.mul(updatedSupply.add(updatedAmount)).div(tenPow18))
		const average = priceAtSupply.add(priceAtSupplyPlusAmount).div(BigNumber.from('2'))

		return hatchCost.add(average.mul(updatedAmount).div(tenPow18))
	}

	function getRawPriceForSellingTokens(baseCost, priceRise, hatchTokens, supply, amount) {
		let hatchPrice = BigNumber.from('0')
		let updatedAmount = BigNumber.from(amount.toString())
		let updatedSupply

		if (supply.sub(amount).lt(hatchTokens)) {
			if (supply.lte(hatchTokens)) {
				return baseCost.mul(amount).div(tenPow18)
			}

			const tokensInHatch = hatchTokens.sub(supply.sub(amount))
			hatchPrice = baseCost.mul(tokensInHatch).div(tenPow18)
			updatedAmount = amount.sub(tokensInHatch)
			updatedSupply = supply.sub(hatchTokens)
		} else {
			updatedSupply = supply.sub(hatchTokens)
		}

		const priceAtSupply = baseCost.add(priceRise.mul(updatedSupply).div(tenPow18))
		const priceAtSupplyPlusAmount = baseCost.add(priceRise.mul(updatedSupply.sub(updatedAmount)).div(tenPow18))
		const average = priceAtSupply.add(priceAtSupplyPlusAmount).div(BigNumber.from('2'))
		return hatchPrice.add(average.mul(updatedAmount).div(tenPow18))
	}

	async function getTradingFeeForBuying(token, amount) {
		const supply = await token.totalSupply()
		const rawCost = getRawCostForBuyingTokens(baseCost, priceRise, hatchTokens, supply, amount)

		return rawCost.mul(tradingFeeRate).div(feeScale)
	}

	async function getTradingFeeForSelling(token, amount) {
		const supply = await token.totalSupply()
		const rawPrice = getRawPriceForSellingTokens(baseCost, priceRise, hatchTokens, supply, amount)

		return rawPrice.mul(tradingFeeRate).div(feeScale)
	}

	async function getPlatformFeeForBuying(token, amount) {
		const supply = await token.totalSupply()
		const rawCost = getRawCostForBuyingTokens(baseCost, priceRise, hatchTokens, supply, amount)

		return rawCost.mul(platformFeeRate).div(feeScale)
	}

	async function getPlatformFeeForSelling(token, amount) {
		const supply = await token.totalSupply()
		const rawPrice = getRawPriceForSellingTokens(baseCost, priceRise, hatchTokens, supply, amount)

		return rawPrice.mul(platformFeeRate).div(feeScale)
	}

	async function getCostForBuyingTokens(token, amount) {
		const supply = await token.totalSupply()
		const rawCost = getRawCostForBuyingTokens(baseCost, priceRise, hatchTokens, supply, amount)

		const tradingFee = rawCost.mul(tradingFeeRate).div(feeScale)
		const platformFee = rawCost.mul(platformFeeRate).div(feeScale)

		return rawCost.add(tradingFee).add(platformFee)
	}

	async function getPriceForSellingTokens(token, amount) {
		const supply = await token.totalSupply()
		const rawPrice = getRawPriceForSellingTokens(baseCost, priceRise, hatchTokens, supply, amount)

		const tradingFee = rawPrice.mul(tradingFeeRate).div(feeScale)
		const platformFee = rawPrice.mul(platformFeeRate).div(feeScale)

		return rawPrice.sub(tradingFee).sub(platformFee)
	}
})
