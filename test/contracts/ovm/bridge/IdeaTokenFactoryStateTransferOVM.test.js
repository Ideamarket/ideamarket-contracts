const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { l2ethers: ethers } = require('hardhat')

const { expectRevert, waitForTx } = require('../../utils/tx')
const { generateWallets } = require('../../utils/wallet')

describe('ovm/core/IdeaTokenFactoryStateTransfer', () => {
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

		let tmpWallet
		;[adminAccount, bridgeAccount, tmpWallet] = generateWallets(ethers, 3)
		ideaTokenExchangeAddress = tmpWallet.address

		DomainNoSubdomainNameVerifier = await ethers.getContractFactory('DomainNoSubdomainNameVerifier')
		IdeaTokenFactory = await ethers.getContractFactory('IdeaTokenFactoryStateTransferOVM')
		IdeaToken = await ethers.getContractFactory('IdeaToken')
	})

	beforeEach(async () => {
		domainNoSubdomainNameVerifier = await DomainNoSubdomainNameVerifier.deploy()
		await domainNoSubdomainNameVerifier.deployed()

		ideaTokenFactory = await IdeaTokenFactory.connect(adminAccount).deploy()
		await ideaTokenFactory.deployed()

		ideaTokenLogic = await IdeaToken.deploy()
		await ideaTokenLogic.deployed()

		await waitForTx(
			ideaTokenFactory
				.connect(adminAccount)
				.initialize(
					adminAccount.address,
					ideaTokenExchangeAddress,
					ideaTokenLogic.address,
					bridgeAccount.address
				)
		)

		await waitForTx(
			ideaTokenFactory
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
		)
	})

	it('admin is owner', async () => {
		expect(adminAccount.address).is.equal(await ideaTokenFactory.getOwner())
	})

	it('fail user cannot add market', async () => {
		await expectRevert(
			ideaTokenFactory.addMarket(
				marketName,
				domainNoSubdomainNameVerifier.address,
				baseCost,
				priceRise,
				hatchTokens,
				tradingFeeRate,
				platformFeeRate,
				false
			)
		)
	})

	it('bridge can add token', async () => {
		await waitForTx(
			ideaTokenFactory.connect(bridgeAccount).addToken(tokenName, BigNumber.from('1'), bridgeAccount.address)
		)
	})

	it('fail admin cannot add token', async () => {
		await expectRevert(
			ideaTokenFactory.connect(adminAccount).addToken(tokenName, BigNumber.from('1'), adminAccount.address)
		)
	})

	it('fail user cannot add token', async () => {
		await expectRevert(ideaTokenFactory.addToken(tokenName, BigNumber.from('1'), userAccount.address))
	})
})
