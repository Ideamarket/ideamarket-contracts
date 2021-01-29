const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')
const { time } = require('@openzeppelin/test-helpers')

describe('core/IdeaTokenVault', () => {
	let DomainNoSubdomainNameVerifier
	let TestERC20
	let TestCDai
	let InterestManagerCompound
	let TestComptroller
	let IdeaTokenFactory
	let IdeaTokenExchange
	let IdeaToken
	let IdeaTokenVault

	const YEAR_DURATION = BigNumber.from('31556952')

	const uint256max = BigNumber.from('2').pow(BigNumber.from('256')).sub(BigNumber.from('1'))
	const tenPow18 = BigNumber.from('10').pow(BigNumber.from('18'))

	const marketName = 'main'
	const tokenName = 'test.com'
	const baseCost = BigNumber.from('100000000000000000') // 10**17 = $0.1
	const priceRise = BigNumber.from('100000000000000') // 10**14 = $0.0001
	const hatchTokens = BigNumber.from('1000000000000000000000') // 10**21 = 1000
	const tradingFeeRate = BigNumber.from('100')
	const platformFeeRate = BigNumber.from('50')

	let userAccount
	let adminAccount
	let authorizerAccount
	let tradingFeeAccount
	const zeroAddress = '0x0000000000000000000000000000000000000000'

	let domainNoSubdomainNameVerifier
	let dai
	let comp
	let comptroller
	let cDai
	let interestManagerCompound
	let ideaTokenLogic
	let ideaTokenFactory
	let ideaTokenExchange
	let ideaTokenVault

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
		TestComptroller = await ethers.getContractFactory('TestComptroller')
		IdeaTokenFactory = await ethers.getContractFactory('IdeaTokenFactory')
		IdeaTokenExchange = await ethers.getContractFactory('IdeaTokenExchange')
		IdeaToken = await ethers.getContractFactory('IdeaToken')
		IdeaTokenVault = await ethers.getContractFactory('IdeaTokenVault')
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

		ideaTokenVault = await IdeaTokenVault.deploy()
		await ideaTokenVault.deployed()

		await interestManagerCompound
			.connect(adminAccount)
			.initialize(ideaTokenExchange.address, dai.address, cDai.address, comp.address, zeroAddress)

		await ideaTokenFactory
			.connect(adminAccount)
			.initialize(adminAccount.address, ideaTokenExchange.address, ideaTokenLogic.address)

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

		await ideaTokenVault.connect(adminAccount).initialize(ideaTokenFactory.address)

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
	})

	it('can lock and withdraw tokens', async () => {
		await dai.mint(userAccount.address, tenPow18.mul('500'))
		const tokenAmount = tenPow18.mul('500')
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, tokenAmount)
		await dai.approve(ideaTokenExchange.address, buyCost)
		await ideaTokenExchange.buyTokens(ideaToken.address, tokenAmount, tokenAmount, buyCost, userAccount.address)

		await ideaToken.approve(ideaTokenVault.address, tokenAmount.div('2'))
		await ideaTokenVault.lock(ideaToken.address, tokenAmount.div('2'), YEAR_DURATION, userAccount.address)
		expect((await ideaToken.balanceOf(ideaTokenVault.address)).eq(tokenAmount.div('2'))).to.be.true

		await time.increase(time.duration.days(10))

		await ideaToken.approve(ideaTokenVault.address, tokenAmount.div('2'))
		await ideaTokenVault.lock(ideaToken.address, tokenAmount.div('2'), YEAR_DURATION, userAccount.address)
		expect((await ideaToken.balanceOf(ideaTokenVault.address)).eq(tokenAmount)).to.be.true

		expect((await ideaToken.balanceOf(userAccount.address)).eq(BigNumber.from('0'))).to.be.true

		await time.increase(time.duration.days(356))

		expect((await ideaToken.balanceOf(ideaTokenVault.address)).eq(tokenAmount)).to.be.true
		const firstLockedEntries = await ideaTokenVault.getLockedEntries(
			ideaToken.address,
			userAccount.address,
			uint256max
		)
		await ideaTokenVault.withdraw(ideaToken.address, [firstLockedEntries[1].lockedUntil], userAccount.address)
		expect((await ideaToken.balanceOf(userAccount.address)).eq(tokenAmount.div('2'))).to.be.true

		expect((await ideaToken.balanceOf(ideaTokenVault.address)).eq(tokenAmount.div('2'))).to.be.true

		await time.increase(time.duration.days(10))

		expect((await ideaToken.balanceOf(ideaTokenVault.address)).eq(tokenAmount.div('2'))).to.be.true

		const secondLockedEntries = await ideaTokenVault.getLockedEntries(
			ideaToken.address,
			userAccount.address,
			uint256max
		)
		await ideaTokenVault.withdraw(ideaToken.address, [secondLockedEntries[0].lockedUntil], userAccount.address)
		expect((await ideaToken.balanceOf(userAccount.address)).eq(tokenAmount)).to.be.true

		expect((await ideaToken.balanceOf(ideaTokenVault.address)).eq(BigNumber.from('0'))).to.be.true
	})

	it('has correct locked entries', async () => {
		const firstEntries = await ideaTokenVault.getLockedEntries(ideaToken.address, userAccount.address, uint256max)
		expect(firstEntries.length).to.be.equal(0)

		await dai.mint(userAccount.address, tenPow18.mul('500'))
		const tokenAmount = tenPow18.mul('500')
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, tokenAmount)
		await dai.approve(ideaTokenExchange.address, buyCost)
		await ideaTokenExchange.buyTokens(ideaToken.address, tokenAmount, tokenAmount, buyCost, userAccount.address)

		await ideaToken.approve(ideaTokenVault.address, tokenAmount.div('2'))
		await ideaTokenVault.lock(ideaToken.address, tokenAmount.div('2'), YEAR_DURATION, userAccount.address)

		const secondEntries = await ideaTokenVault.getLockedEntries(ideaToken.address, userAccount.address, uint256max)
		expect(secondEntries.length).to.be.equal(1)
		expect(secondEntries[0].lockedAmount.eq(tokenAmount.div('2'))).to.be.true

		await ideaToken.approve(ideaTokenVault.address, tokenAmount.div('2'))
		await ideaTokenVault.lock(ideaToken.address, tokenAmount.div('2'), YEAR_DURATION, userAccount.address)

		const thirdEntries = await ideaTokenVault.getLockedEntries(ideaToken.address, userAccount.address, uint256max)
		expect(thirdEntries.length).to.be.equal(2)
		expect(thirdEntries[0].lockedAmount.eq(tokenAmount.div('2'))).to.be.true
		expect(thirdEntries[1].lockedAmount.eq(tokenAmount.div('2'))).to.be.true

		await time.increase(time.duration.days(400))

		await ideaTokenVault.withdraw(ideaToken.address, [thirdEntries[0].lockedUntil], userAccount.address)

		const fourthEntries = await ideaTokenVault.getLockedEntries(ideaToken.address, userAccount.address, uint256max)
		expect(fourthEntries.length).to.be.equal(1)
		expect(fourthEntries[0].lockedAmount.eq(tokenAmount.div('2'))).to.be.true

		await ideaTokenVault.withdraw(ideaToken.address, [fourthEntries[0].lockedUntil], userAccount.address)

		const fifthEntries = await ideaTokenVault.getLockedEntries(ideaToken.address, userAccount.address, uint256max)
		expect(fifthEntries.length).to.be.equal(0)
	})

	it('can lock with different durations', async () => {
		await dai.mint(userAccount.address, tenPow18.mul('500'))
		const tokenAmount = tenPow18.mul('500')
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, tokenAmount)
		await dai.approve(ideaTokenExchange.address, buyCost)
		await ideaTokenExchange.buyTokens(ideaToken.address, tokenAmount, tokenAmount, buyCost, userAccount.address)

		const otherDuration = BigNumber.from('1234')

		await ideaToken.approve(ideaTokenVault.address, tokenAmount.div('2'))
		await ideaTokenVault.lock(ideaToken.address, tokenAmount.div('2'), YEAR_DURATION, userAccount.address)

		await ideaToken.approve(ideaTokenVault.address, tokenAmount.div('2'))
		await ideaTokenVault.lock(ideaToken.address, tokenAmount.div('2'), otherDuration, userAccount.address)

		await time.increase(otherDuration.add('1').toString())

		const firstEntries = await ideaTokenVault.getLockedEntries(ideaToken.address, userAccount.address, uint256max)
		await ideaTokenVault.withdraw(ideaToken.address, [firstEntries[0].lockedUntil], userAccount.address)
		expect((await ideaToken.balanceOf(userAccount.address)).eq(tokenAmount.div('2'))).to.be.true

		await time.increase(YEAR_DURATION.toString())
		const secondEntries = await ideaTokenVault.getLockedEntries(ideaToken.address, userAccount.address, uint256max)
		await ideaTokenVault.withdraw(ideaToken.address, [secondEntries[0].lockedUntil], userAccount.address)
		expect((await ideaToken.balanceOf(userAccount.address)).eq(tokenAmount)).to.be.true
	})

	it('fail invalid token', async () => {
		await dai.mint(userAccount.address, tenPow18.mul('500'))
		const tokenAmount = tenPow18.mul('500')
		const buyCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, tokenAmount)
		await dai.approve(ideaTokenExchange.address, buyCost)
		await ideaTokenExchange.buyTokens(ideaToken.address, tokenAmount, tokenAmount, buyCost, userAccount.address)

		await ideaToken.approve(ideaTokenVault.address, tokenAmount)
		await expect(
			ideaTokenVault.lock(dai.address, tokenAmount, BigNumber.from('1234'), userAccount.address)
		).to.be.revertedWith('invalid-token')
	})

	it('fail invalid duration', async () => {
		await expect(
			ideaTokenVault.lock(ideaToken.address, tenPow18, BigNumber.from('0'), userAccount.address)
		).to.be.revertedWith('invalid-duration')
	})

	it('fail invalid amount', async () => {
		await expect(
			ideaTokenVault.lock(ideaToken.address, BigNumber.from('0'), YEAR_DURATION, userAccount.address)
		).to.be.revertedWith('invalid-amount')
	})

	it('fail invalid until', async () => {
		await expect(
			ideaTokenVault.withdraw(ideaToken.address, [BigNumber.from('0')], userAccount.address)
		).to.be.revertedWith('invalid-until')
	})

	it('fail too early', async () => {
		await expect(
			ideaTokenVault.withdraw(ideaToken.address, [BigNumber.from('9999999999999999')], userAccount.address)
		).to.be.revertedWith('too-early')
	})

	it('fail not enough allowance', async () => {
		await expect(
			ideaTokenVault.lock(ideaToken.address, tenPow18, YEAR_DURATION, userAccount.address)
		).to.be.revertedWith('insufficient-allowance')
	})

	it('fail not enough balance', async () => {
		await ideaToken.approve(ideaTokenVault.address, tenPow18)
		await expect(
			ideaTokenVault.lock(ideaToken.address, tenPow18, YEAR_DURATION, userAccount.address)
		).to.be.revertedWith('ERC20: transfer amount exceeds balance')
	})
})
