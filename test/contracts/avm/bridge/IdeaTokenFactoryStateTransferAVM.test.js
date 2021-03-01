const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

// AVM-DONE
describe('avm/core/IdeaTokenFactoryStateTransfer', () => {
	let DomainNoSubdomainNameVerifier
	let IdeaTokenFactory
	let IdeaToken

	const tokenName = 'example.com'
	const marketName = 'testMarket'
	const baseCost = BigNumber.from('100000000000000000') // 10**17 = $0.1
	const priceRise = BigNumber.from('100000000000000') // 10**14 = $0.0001
	const hatchTokens = BigNumber.from('1000000000000000000000') // 10**21 = 1000
	const tradingFeeRate = BigNumber.from('100')
	const platformFeeRate = BigNumber.from('50')

	let userAccount
	let adminAccount
	let bridgeAccount
	let ideaTokenExchangeAddress

	let domainNoSubdomainNameVerifier
	let ideaTokenLogic
	let ideaTokenFactory

	before(async () => {
		const accounts = await ethers.getSigners()
		userAccount = accounts[0]
		adminAccount = accounts[1]
		bridgeAccount = accounts[2]
		ideaTokenExchangeAddress = accounts[3].address

		DomainNoSubdomainNameVerifier = await ethers.getContractFactory('DomainNoSubdomainNameVerifier')
		IdeaTokenFactory = await ethers.getContractFactory('IdeaTokenFactoryStateTransferAVM')
		IdeaToken = await ethers.getContractFactory('IdeaToken')
	})

	beforeEach(async () => {
		domainNoSubdomainNameVerifier = await DomainNoSubdomainNameVerifier.deploy()
		await domainNoSubdomainNameVerifier.deployed()

		ideaTokenFactory = await IdeaTokenFactory.connect(adminAccount).deploy()
		await ideaTokenFactory.deployed()

		ideaTokenLogic = await IdeaToken.deploy()
		await ideaTokenLogic.deployed()

		await ideaTokenFactory
			.connect(adminAccount)
			.initialize(adminAccount.address, ideaTokenExchangeAddress, ideaTokenLogic.address, bridgeAccount.address)
	})

	it('admin is owner', async () => {
		expect(adminAccount.address).is.equal(await ideaTokenFactory.getOwner())
	})

	it('fail user cannot add market', async () => {
		await expect(
			ideaTokenFactory
				.connect(userAccount)
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
		).to.be.revertedWith('only-owner')
	})

	it('bridge can add token', async () => {
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

		await ideaTokenFactory.connect(bridgeAccount).addToken(tokenName, BigNumber.from('1'), bridgeAccount.address)
	})

	it('fail admin cannot add token', async () => {
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

		await expect(
			ideaTokenFactory.connect(adminAccount).addToken(tokenName, BigNumber.from('1'), adminAccount.address)
		).to.be.revertedWith('only-bridge')
	})

	it('fail user cannot add token', async () => {
		await expect(ideaTokenFactory.addToken(tokenName, BigNumber.from('1'), userAccount.address)).to.be.revertedWith(
			'only-bridge'
		)
	})
})
