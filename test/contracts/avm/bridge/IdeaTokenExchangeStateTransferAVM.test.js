const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

// AVM-DONE
describe('avm/core/IdeaTokenExchangeStateTransfer', () => {
	let DomainNoSubdomainNameVerifier

	let InterestManagerStateTransferAVM
	let IdeaTokenFactory
	let IdeaTokenExchange
	let IdeaToken

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
		const accounts = await ethers.getSigners()
		userAccount = accounts[0]
		adminAccount = accounts[1]
		authorizerAccount = accounts[2]
		tradingFeeAccount = accounts[3]

		DomainNoSubdomainNameVerifier = await ethers.getContractFactory('DomainNoSubdomainNameVerifier')
		TestERC20 = await ethers.getContractFactory('TestERC20')
		InterestManagerStateTransferAVM = await ethers.getContractFactory('InterestManagerStateTransferAVM')
		IdeaTokenFactory = await ethers.getContractFactory('IdeaTokenFactoryAVM')
		IdeaTokenExchange = await ethers.getContractFactory('IdeaTokenExchangeStateTransferAVM')
		IdeaToken = await ethers.getContractFactory('IdeaToken')

		await reset()
	})

	async function reset() {
		domainNoSubdomainNameVerifier = await DomainNoSubdomainNameVerifier.deploy()
		await domainNoSubdomainNameVerifier.deployed()

		dai = await TestERC20.deploy('DAI', 'DAI')
		await dai.deployed()

		interestManager = await InterestManagerStateTransferAVM.deploy()
		await interestManager.deployed()

		ideaTokenLogic = await IdeaToken.deploy()
		await ideaTokenLogic.deployed()

		ideaTokenFactory = await IdeaTokenFactory.deploy()
		await ideaTokenFactory.deployed()

		ideaTokenExchange = await IdeaTokenExchange.deploy()
		await ideaTokenExchange.deployed()

		await interestManager.connect(adminAccount).initializeStateTransfer(ideaTokenExchange.address, oneAddress)

		await ideaTokenFactory
			.connect(adminAccount)
			.initialize(adminAccount.address, ideaTokenExchange.address, ideaTokenLogic.address, oneAddress)

		await ideaTokenExchange
			.connect(adminAccount)
			.initialize(
				adminAccount.address,
				authorizerAccount.address,
				tradingFeeAccount.address,
				interestManager.address,
				dai.address,
				adminAccount.address
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
	}

	it('disabled functions revert', async () => {
		await expect(
			ideaTokenExchange.sellTokens(oneAddress, BigNumber.from('1'), BigNumber.from('1'), oneAddress)
		).to.be.revertedWith('state-transfer')

		await expect(
			ideaTokenExchange.buyTokens(
				oneAddress,
				BigNumber.from('1'),
				BigNumber.from('1'),
				BigNumber.from('1'),
				oneAddress
			)
		).to.be.revertedWith('state-transfer')

		await expect(ideaTokenExchange.withdrawTokenInterest(oneAddress)).to.be.revertedWith('state-transfer')

		await expect(ideaTokenExchange.withdrawPlatformInterest(BigNumber.from('1'))).to.be.revertedWith(
			'state-transfer'
		)

		await expect(ideaTokenExchange.withdrawPlatformFee(BigNumber.from('1'))).to.be.revertedWith('state-transfer')

		await expect(ideaTokenExchange.withdrawTradingFee()).to.be.revertedWith('state-transfer')

		await expect(ideaTokenExchange.setTokenOwner(oneAddress, oneAddress)).to.be.revertedWith('state-transfer')
	})

	it('can set static vars', async () => {
		const before = await interestManager._totalShares()
		await ideaTokenExchange.connect(adminAccount).setStaticVars(BigNumber.from('123'))
		const after = await interestManager._totalShares()
		expect(after.toNumber() - before.toNumber()).to.be.equal(123)
	})

	it('fail user cannot set static vars', async () => {
		await expect(ideaTokenExchange.setStaticVars(BigNumber.from('123'))).to.be.revertedWith('only-bridge')
	})

	it('can set platform vars', async () => {
		const before = await interestManager._totalShares()
		await ideaTokenExchange
			.connect(adminAccount)
			.setPlatformVars(BigNumber.from('1'), BigNumber.from('123'), BigNumber.from('123'), BigNumber.from('123'))

		const after = await interestManager._totalShares()
		expect(after.toNumber() - before.toNumber()).to.be.equal(123 + 123)
	})

	it('fail user cannot set platform vars', async () => {
		await expect(
			ideaTokenExchange.setPlatformVars(
				BigNumber.from('1'),
				BigNumber.from('123'),
				BigNumber.from('123'),
				BigNumber.from('123')
			)
		).to.be.revertedWith('only-bridge')
	})

	it('can set token vars and mint', async () => {
		const before = await interestManager._totalShares()
		await ideaTokenExchange
			.connect(adminAccount)
			.setTokenVarsAndMint(marketID, tokenID, BigNumber.from('500'), BigNumber.from('100'), BigNumber.from('123'))

		const after = await interestManager._totalShares()
		expect(after.toNumber() - before.toNumber()).to.be.equal(123)
		expect((await ideaToken.totalSupply()).toNumber()).to.be.equal(500)
		expect((await ideaToken.balanceOf(adminAccount.address)).toNumber()).to.be.equal(500)
	})

	it('fail user cannot set token vars and mint', async () => {
		await expect(
			ideaTokenExchange.setTokenVarsAndMint(
				marketID,
				tokenID,
				BigNumber.from('500'),
				BigNumber.from('100'),
				BigNumber.from('123')
			)
		).to.be.revertedWith('only-bridge')
	})
})
