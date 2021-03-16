const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { l2ethers: ethers } = require('hardhat')

const { expectRevert, waitForTx } = require('../../utils/tx')
const { generateWallets } = require('../../utils/wallet')

describe('ovm/core/IdeaTokenExchangeStateTransfer', () => {
	let DomainNoSubdomainNameVerifier
	let TestERC20
	let TestCDai
	let InterestManagerStateTransferOVM
	let TestComptroller
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
	const oneAddress = '0x0000000000000000000000000000000000000001'
	const someAddress = '0x52bc44d5378309EE2abF1539BF71dE1b7d7bE3b5' // random addr from etherscan

	let domainNoSubdomainNameVerifier
	let dai
	let comp
	let cDai
	let interestManager
	let comptroller
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
		TestCDai = await ethers.getContractFactory('TestCDai')
		InterestManagerStateTransferOVM = await ethers.getContractFactory('InterestManagerStateTransferOVM')
		TestComptroller = await ethers.getContractFactory('TestComptroller')
		IdeaTokenFactory = await ethers.getContractFactory('IdeaTokenFactoryOVM')
		IdeaTokenExchange = await ethers.getContractFactory('IdeaTokenExchangeStateTransferOVM')
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
		await waitForTx(cDai.setExchangeRate(tenPow18))

		interestManager = await InterestManagerStateTransferOVM.deploy()
		await interestManager.deployed()

		ideaTokenLogic = await IdeaToken.deploy()
		await ideaTokenLogic.deployed()

		ideaTokenFactory = await IdeaTokenFactory.deploy()
		await ideaTokenFactory.deployed()

		ideaTokenExchange = await IdeaTokenExchange.deploy()
		await ideaTokenExchange.deployed()

		await waitForTx(interestManager.connect(adminAccount).initializeStateTransfer(adminAccount.address, oneAddress))

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

		await waitForTx(ideaTokenFactory.addToken(tokenName, marketID, userAccount.address))

		tokenID = await ideaTokenFactory.getTokenIDByName(tokenName, marketID)

		ideaToken = new ethers.Contract(
			(await ideaTokenFactory.getTokenInfo(marketID, tokenID)).ideaToken,
			IdeaToken.interface,
			IdeaToken.signer
		)
	})

	it('disabled functions revert', async () => {
		await expectRevert(
			ideaTokenExchange.sellTokens(oneAddress, BigNumber.from('1'), BigNumber.from('1'), oneAddress)
		)
	})
})
