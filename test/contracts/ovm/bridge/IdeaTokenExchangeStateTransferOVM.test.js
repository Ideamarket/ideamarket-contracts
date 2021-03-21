const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { l2ethers: ethers } = require('hardhat')

const { expectRevert, waitForTx } = require('../../utils/tx')
const { generateWallets } = require('../../utils/wallet')

describe('ovm/core/IdeaTokenExchangeStateTransfer', () => {
	let DomainNoSubdomainNameVerifier

	let InterestManagerStateTransferOVM
	let IdeaTokenFactory
	let IdeaTokenExchange
	let IdeaToken

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
	const oneAddress = '0x0000000000000000000000000000000000000001'

	let domainNoSubdomainNameVerifier
	let dai
	let interestManager
	let ideaTokenFactory
	let ideaTokenLogic
	let ideaTokenExchange

	let marketID
	let tokenID
	let ideaToken

	before(async () => {
		;[
			userAccount,
			adminAccount,
			authorizerAccount,
			tradingFeeAccount,
			interestReceiverAccount,
			platformFeeReceiverAccount,
		] = generateWallets(ethers, 6)

		DomainNoSubdomainNameVerifier = await ethers.getContractFactory('DomainNoSubdomainNameVerifier')
		TestERC20 = await ethers.getContractFactory('TestERC20')
		InterestManagerStateTransferOVM = await ethers.getContractFactory('InterestManagerStateTransferOVM')
		IdeaTokenFactory = await ethers.getContractFactory('IdeaTokenFactoryOVM')
		IdeaTokenExchange = await ethers.getContractFactory('IdeaTokenExchangeStateTransferOVM')
		IdeaToken = await ethers.getContractFactory('IdeaToken')

		await reset()
	})

	async function reset() {
		domainNoSubdomainNameVerifier = await DomainNoSubdomainNameVerifier.deploy()
		await domainNoSubdomainNameVerifier.deployed()

		dai = await TestERC20.deploy('DAI', 'DAI')
		await dai.deployed()

		interestManager = await InterestManagerStateTransferOVM.deploy()
		await interestManager.deployed()

		ideaTokenLogic = await IdeaToken.deploy()
		await ideaTokenLogic.deployed()

		ideaTokenFactory = await IdeaTokenFactory.deploy()
		await ideaTokenFactory.deployed()

		ideaTokenExchange = await IdeaTokenExchange.deploy()
		await ideaTokenExchange.deployed()

		await waitForTx(
			interestManager.connect(adminAccount).initializeStateTransfer(ideaTokenExchange.address, oneAddress)
		)

		await waitForTx(
			ideaTokenFactory
				.connect(adminAccount)
				.initialize(adminAccount.address, ideaTokenExchange.address, ideaTokenLogic.address, oneAddress)
		)

		await waitForTx(
			ideaTokenExchange
				.connect(adminAccount)
				.initialize(
					adminAccount.address,
					authorizerAccount.address,
					tradingFeeAccount.address,
					interestManager.address,
					dai.address,
					adminAccount.address
				)
		)
		await waitForTx(ideaTokenExchange.connect(adminAccount).setIdeaTokenFactoryAddress(ideaTokenFactory.address))

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

		marketID = await ideaTokenFactory.getMarketIDByName(marketName)

		await ideaTokenFactory.addToken(tokenName, marketID, userAccount.address)

		tokenID = await ideaTokenFactory.getTokenIDByName(tokenName, marketID)

		ideaToken = new ethers.Contract(
			(await ideaTokenFactory.getTokenInfo(marketID, tokenID)).ideaToken,
			IdeaToken.interface,
			IdeaToken.signer
		)
	}

	it('disabled functions revert', async () => {
		await expectRevert(
			ideaTokenExchange.sellTokens(oneAddress, BigNumber.from('1'), BigNumber.from('1'), oneAddress)
		)

		await expectRevert(
			ideaTokenExchange.buyTokens(
				oneAddress,
				BigNumber.from('1'),
				BigNumber.from('1'),
				BigNumber.from('1'),
				oneAddress
			)
		)

		await expectRevert(ideaTokenExchange.withdrawTokenInterest(oneAddress))

		await expectRevert(ideaTokenExchange.withdrawPlatformInterest(BigNumber.from('1')))

		await expectRevert(ideaTokenExchange.withdrawPlatformFee(BigNumber.from('1')))

		await expectRevert(ideaTokenExchange.withdrawTradingFee())

		await expectRevert(ideaTokenExchange.setTokenOwner(oneAddress, oneAddress))
	})

	it('can set static vars', async () => {
		const before = await interestManager._totalShares()
		await waitForTx(ideaTokenExchange.connect(adminAccount).setStaticVars(BigNumber.from('123')))
		const after = await interestManager._totalShares()
		expect(after.toNumber() - before.toNumber()).to.be.equal(123)
	})

	it('fail user cannot set static vars', async () => {
		await expectRevert(ideaTokenExchange.setStaticVars(BigNumber.from('123')))
	})

	it('can set platform vars', async () => {
		const before = await interestManager._totalShares()
		await waitForTx(
			ideaTokenExchange
				.connect(adminAccount)
				.setPlatformVars(
					BigNumber.from('1'),
					BigNumber.from('123'),
					BigNumber.from('123'),
					BigNumber.from('123')
				)
		)
		const after = await interestManager._totalShares()
		expect(after.toNumber() - before.toNumber()).to.be.equal(123 + 123)
	})

	it('fail user cannot set platform vars', async () => {
		await expectRevert(
			ideaTokenExchange.setPlatformVars(
				BigNumber.from('1'),
				BigNumber.from('123'),
				BigNumber.from('123'),
				BigNumber.from('123')
			)
		)
	})

	it('can set token vars and mint', async () => {
		const before = await interestManager._totalShares()
		await waitForTx(
			ideaTokenExchange
				.connect(adminAccount)
				.setTokenVarsAndMint(
					marketID,
					tokenID,
					BigNumber.from('500'),
					BigNumber.from('100'),
					BigNumber.from('123')
				)
		)
		const after = await interestManager._totalShares()
		expect(after.toNumber() - before.toNumber()).to.be.equal(123)
		expect((await ideaToken.totalSupply()).toNumber()).to.be.equal(500)
		expect((await ideaToken.balanceOf(adminAccount.address)).toNumber()).to.be.equal(500)
	})

	it('fail user cannot set token vars and mint', async () => {
		await expectRevert(
			ideaTokenExchange.setTokenVarsAndMint(
				marketID,
				tokenID,
				BigNumber.from('500'),
				BigNumber.from('100'),
				BigNumber.from('123')
			)
		)
	})
})
