const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('evm/bridge/IdeaTokenExchangeStateTransfer', () => {
	let ProxyAdmin
	let AdminUpgradeabilityProxy
	let DomainNoSubdomainNameVerifier
	let TestERC20
	let TestCDai
	let InterestManagerCompound
	let TestComptroller
	let IdeaTokenFactory
	let IdeaTokenExchangeStateTransfer
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

	let userAccount
	let adminAccount
	let authorizerAccount
	let tradingFeeAccount
	const zeroAddress = '0x0000000000000000000000000000000000000000'
	const oneAddress = '0x0000000000000000000000000000000000000001'
	const twoAddress = '0x0000000000000000000000000000000000000002'

	let domainNoSubdomainNameVerifier
	let dai
	let comp
	let cDai
	let interestManagerCompound
	let comptroller
	let ideaTokenFactory
	let ideaTokenLogic
	let ideaTokenExchange

	let marketID
	let tokenID

	before(async () => {
		const accounts = await ethers.getSigners()
		userAccount = accounts[0]
		adminAccount = accounts[1]
		authorizerAccount = accounts[2]
		tradingFeeAccount = accounts[3]
		interestReceiverAccount = accounts[4]
		platformFeeReceiverAccount = accounts[5]

		ProxyAdmin = await ethers.getContractFactory('ProxyAdmin')
		AdminUpgradeabilityProxy = await ethers.getContractFactory('AdminUpgradeabilityProxy')
		DomainNoSubdomainNameVerifier = await ethers.getContractFactory('DomainNoSubdomainNameVerifier')
		TestERC20 = await ethers.getContractFactory('TestERC20')
		TestCDai = await ethers.getContractFactory('TestCDai')
		InterestManagerCompound = await ethers.getContractFactory('InterestManagerCompound')
		TestComptroller = await ethers.getContractFactory('TestComptroller')
		IdeaTokenFactory = await ethers.getContractFactory('IdeaTokenFactory')
		IdeaTokenExchangeStateTransfer = await ethers.getContractFactory('IdeaTokenExchangeStateTransfer')
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

		const proxyAdmin = await ProxyAdmin.deploy(adminAccount.address)
		await proxyAdmin.deployed()

		const ideaTokenExchangeLogic = await IdeaTokenExchange.deploy()
		await ideaTokenExchangeLogic.deployed()

		const ideaTokenExchangeInitCall = ideaTokenExchangeLogic.interface.encodeFunctionData('initialize', [
			adminAccount.address,
			authorizerAccount.address,
			tradingFeeAccount.address,
			interestManagerCompound.address,
			dai.address,
		])

		ideaTokenExchange = await AdminUpgradeabilityProxy.deploy(
			ideaTokenExchangeLogic.address,
			proxyAdmin.address,
			ideaTokenExchangeInitCall
		)
		await ideaTokenExchange.deployed()
		ideaTokenExchange = new ethers.Contract(
			ideaTokenExchange.address,
			IdeaTokenExchange.interface,
			IdeaTokenExchange.signer
		)

		await interestManagerCompound
			.connect(adminAccount)
			.initialize(ideaTokenExchange.address, dai.address, cDai.address, comp.address, oneAddress)

		await ideaTokenFactory
			.connect(adminAccount)
			.initialize(adminAccount.address, ideaTokenExchange.address, ideaTokenLogic.address)

		await ideaTokenExchange.connect(adminAccount).setIdeaTokenFactoryAddress(ideaTokenFactory.address)

		const ideaTokenExchangeStateTransferLogic = await IdeaTokenExchangeStateTransfer.deploy()
		await ideaTokenExchangeStateTransferLogic.deployed()

		const ideaTokenExchangeStateTransferInitCall = ideaTokenExchangeStateTransferLogic.interface.encodeFunctionData(
			'initializeStateTransfer',
			[adminAccount.address, oneAddress, oneAddress]
		)

		await proxyAdmin
			.connect(adminAccount)
			.upgradeAndCall(
				ideaTokenExchange.address,
				ideaTokenExchangeStateTransferLogic.address,
				ideaTokenExchangeStateTransferInitCall
			)
		ideaTokenExchange = new ethers.Contract(
			ideaTokenExchange.address,
			IdeaTokenExchangeStateTransfer.interface,
			IdeaTokenExchangeStateTransfer.signer
		)

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

	async function deployNewInstance() {
		const proxyAdmin = await ProxyAdmin.deploy(adminAccount.address)
		await proxyAdmin.deployed()

		const ideaTokenExchangeLogic = await IdeaTokenExchange.deploy()
		await ideaTokenExchangeLogic.deployed()

		const ideaTokenExchangeInitCall = ideaTokenExchangeLogic.interface.encodeFunctionData('initialize', [
			adminAccount.address,
			authorizerAccount.address,
			tradingFeeAccount.address,
			interestManagerCompound.address,
			dai.address,
		])

		ideaTokenExchange = await AdminUpgradeabilityProxy.deploy(
			ideaTokenExchangeLogic.address,
			proxyAdmin.address,
			ideaTokenExchangeInitCall
		)
		await ideaTokenExchange.deployed()
		ideaTokenExchange = new ethers.Contract(
			ideaTokenExchange.address,
			IdeaTokenExchange.interface,
			IdeaTokenExchange.signer
		)

		await ideaTokenExchange.connect(adminAccount).setIdeaTokenFactoryAddress(ideaTokenFactory.address)

		const ideaTokenExchangeStateTransferLogic = await IdeaTokenExchangeStateTransfer.deploy()
		await ideaTokenExchangeStateTransferLogic.deployed()

		await proxyAdmin
			.connect(adminAccount)
			.upgrade(ideaTokenExchange.address, ideaTokenExchangeStateTransferLogic.address)
		ideaTokenExchange = new ethers.Contract(
			ideaTokenExchange.address,
			IdeaTokenExchangeStateTransfer.interface,
			IdeaTokenExchangeStateTransfer.signer
		)

		return ideaTokenExchange
	}

	it('admin is owner', async () => {
		expect(adminAccount.address).to.be.equal(await ideaTokenExchange.getOwner())
	})

	it('has correct state vars', async () => {
		const exchange = await deployNewInstance()
		await exchange.connect(adminAccount).initializeStateTransfer(adminAccount.address, oneAddress, twoAddress)
		expect(adminAccount.address).to.be.equal(await exchange._transferManager())
		expect(oneAddress).to.be.equal(await exchange._l2Bridge())
		expect(twoAddress).to.be.equal(await exchange._l1Inbox())
		expect(false).to.be.equal(await exchange._tokenTransferEnabled())
	})

	it('fail init twice', async () => {
		await expect(ideaTokenExchange.initializeStateTransfer(oneAddress, oneAddress, oneAddress)).to.be.revertedWith(
			'already-init'
		)
	})

	/*
	it('fail user calls state transfer methods', async () => {
		await expect(ideaTokenExchange.transferStaticVars(BigNumber.from('1'))).to.be.revertedWith(
			'only-transfer-manager'
		)

		await expect(ideaTokenExchange.transferPlatformVars(tenPow18, BigNumber.from('1'))).to.be.revertedWith(
			'only-transfer-manager'
		)

		await expect(ideaTokenExchange.transferTokenVars(tenPow18, [], BigNumber.from('1'))).to.be.revertedWith(
			'only-transfer-manager'
		)

		await expect(ideaTokenExchange.setTokenTransferEnabled()).to.be.revertedWith('only-transfer-manager')
	})

	it('fail user calls token transfer before enabled', async () => {
		await expect(
			ideaTokenExchange.transferIdeaTokens(tenPow18, tenPow18, oneAddress, BigNumber.from('1'))
		).to.be.revertedWith('not-enabled')
	})

	it('fail init invalid args', async () => {
		const exchange = await deployNewInstance()

		await expect(exchange.initializeStateTransfer(zeroAddress, oneAddress, oneAddress)).to.be.revertedWith(
			'invalid-args'
		)

		await expect(exchange.initializeStateTransfer(oneAddress, zeroAddress, oneAddress)).to.be.revertedWith(
			'invalid-args'
		)

		await expect(exchange.initializeStateTransfer(oneAddress, oneAddress, zeroAddress)).to.be.revertedWith(
			'invalid-args'
		)
	})
	*/
	it('disabled functions revert', async () => {
		await expect(
			ideaTokenExchange.sellTokens(zeroAddress, tenPow18, tenPow18, userAccount.address)
		).to.be.revertedWith('x')

		await expect(
			ideaTokenExchange.buyTokens(zeroAddress, tenPow18, tenPow18, tenPow18, userAccount.address)
		).to.be.revertedWith('x')

		await expect(ideaTokenExchange.withdrawTokenInterest(zeroAddress)).to.be.revertedWith('x')

		await expect(ideaTokenExchange.withdrawPlatformInterest(tenPow18)).to.be.revertedWith('x')

		await expect(ideaTokenExchange.withdrawPlatformFee(tenPow18)).to.be.revertedWith('x')

		await expect(ideaTokenExchange.withdrawTradingFee()).to.be.revertedWith('x')

		await expect(ideaTokenExchange.setTokenOwner(oneAddress, oneAddress)).to.be.revertedWith('x')
	})
})
