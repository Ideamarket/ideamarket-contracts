const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('avm/core/MultiActionWithoutUniswap', () => {
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
	const oneAddress = '0x0000000000000000000000000000000000000001'

	let domainNoSubdomainNameVerifier
	let dai
	let someToken
	let someOtherToken
	let interestManager
	let ideaTokenLogic
	let ideaTokenFactory
	let ideaTokenExchange
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
		InterestManager = await ethers.getContractFactory('InterestManagerStateTransferAVM')
		IdeaTokenFactoryAVM = await ethers.getContractFactory('IdeaTokenFactoryAVM')
		IdeaTokenExchangeAVM = await ethers.getContractFactory('IdeaTokenExchangeAVM')
		IdeaToken = await ethers.getContractFactory('IdeaToken')
		IdeaTokenVault = await ethers.getContractFactory('IdeaTokenVault')
		MultiAction = await ethers.getContractFactory('MultiActionWithoutUniswap')
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

		ideaTokenVault = await IdeaTokenVault.deploy()
		await ideaTokenVault.deployed()

		multiAction = await MultiAction.deploy(
			ideaTokenExchange.address,
			ideaTokenFactory.address,
			ideaTokenVault.address,
			dai.address
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

	it('fail directly send ETH', async () => {
		expect(
			userAccount.sendTransaction({
				to: multiAction.address,
				value: tenPow18,
			})
		).to.be.revertedWith('')
	})
})
