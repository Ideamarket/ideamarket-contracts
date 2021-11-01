const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('evm/bridge/IdeaTokenFactoryStateTransfer', () => {
	let ProxyAdmin
	let AdminUpgradeabilityProxy
	let DomainNoSubdomainNameVerifier
	let TestERC20
	let TestCDai
	let InterestManagerCompound
	let TestComptroller
	let IdeaTokenFactory
	let IdeaTokenFactoryStateTransfer
	let IdeaToken

	let userAccount
	let adminAccount
	let authorizerAccount
	let tradingFeeAccount
	const oneAddress = '0x0000000000000000000000000000000000000001'

	let ideaTokenFactory

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
		IdeaTokenFactoryStateTransfer = await ethers.getContractFactory('IdeaTokenFactoryStateTransfer')
		IdeaToken = await ethers.getContractFactory('IdeaToken')
	})

	beforeEach(async () => {
		const proxyAdmin = await ProxyAdmin.deploy(adminAccount.address)
		await proxyAdmin.deployed()

		const ideaTokenFactoryLogic = await IdeaTokenFactory.deploy()
		await ideaTokenFactoryLogic.deployed()

		const ideaTokenFactoryInitCall = ideaTokenFactoryLogic.interface.encodeFunctionData('initialize', [
			adminAccount.address,
			oneAddress,
			oneAddress,
		])

		ideaTokenFactory = await AdminUpgradeabilityProxy.deploy(
			ideaTokenFactoryLogic.address,
			proxyAdmin.address,
			ideaTokenFactoryInitCall
		)
		await ideaTokenFactory.deployed()

		const ideaTokenFactoryStateTransferLogic = await IdeaTokenFactoryStateTransfer.deploy()
		await ideaTokenFactoryStateTransferLogic.deployed()

		await proxyAdmin
			.connect(adminAccount)
			.upgrade(ideaTokenFactory.address, ideaTokenFactoryStateTransferLogic.address)

		ideaTokenFactory = new ethers.Contract(
			ideaTokenFactory.address,
			IdeaTokenFactoryStateTransfer.interface,
			IdeaTokenFactoryStateTransfer.signer
		)
	})

	it('disabled functions revert', async () => {
		await expect(ideaTokenFactory.initialize(oneAddress, oneAddress, oneAddress)).to.be.revertedWith('x')

		await expect(
			ideaTokenFactory.addMarket(
				'a',
				oneAddress,
				BigNumber.from('1'),
				BigNumber.from('1'),
				BigNumber.from('1'),
				BigNumber.from('1'),
				BigNumber.from('1'),
				false
			)
		).to.be.revertedWith('x')

		await expect(ideaTokenFactory.addToken('a', BigNumber.from('1'), oneAddress)).to.be.revertedWith('x')

		await expect(ideaTokenFactory.isValidTokenName('a', BigNumber.from('1'))).to.be.revertedWith('x')

		await expect(ideaTokenFactory.setTradingFee(BigNumber.from('1'), BigNumber.from('1'))).to.be.revertedWith('x')

		await expect(ideaTokenFactory.setPlatformFee(BigNumber.from('1'), BigNumber.from('1'))).to.be.revertedWith('x')

		await expect(ideaTokenFactory.setNameVerifier(BigNumber.from('1'), oneAddress)).to.be.revertedWith('x')
	})
})
