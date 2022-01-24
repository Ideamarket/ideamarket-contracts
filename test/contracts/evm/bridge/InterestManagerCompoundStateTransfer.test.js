const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('evm/bridge/InterestManagerCompoundStateTransfer', () => {
	let ProxyAdmin
	let AdminUpgradeabilityProxy
	let DomainNoSubdomainNameVerifier
	let TestERC20
	let TestCDai
	let InterestManagerCompound
	let InterestManagerCompoundStateTransfer

	let userAccount
	let adminAccount
	let authorizerAccount
	let tradingFeeAccount
	const oneAddress = '0x0000000000000000000000000000000000000001'

	let interestManager

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
		InterestManagerCompoundStateTransfer = await ethers.getContractFactory('InterestManagerCompoundStateTransfer')
	})

	beforeEach(async () => {
		const proxyAdmin = await ProxyAdmin.deploy(adminAccount.address)
		await proxyAdmin.deployed()

		const interestManagerCompoundLogic = await InterestManagerCompound.deploy()
		await interestManagerCompoundLogic.deployed()

		const interestManagerCompoundInitCall = interestManagerCompoundLogic.interface.encodeFunctionData(
			'initialize',
			[adminAccount.address, oneAddress, oneAddress, oneAddress, oneAddress]
		)

		interestManager = await AdminUpgradeabilityProxy.deploy(
			interestManagerCompoundLogic.address,
			proxyAdmin.address,
			interestManagerCompoundInitCall
		)
		await interestManager.deployed()

		const interestManagerCompoundStateTransferLogic = await InterestManagerCompoundStateTransfer.deploy()
		await interestManagerCompoundStateTransferLogic.deployed()

		const interestManagerCompoundStateTransferInitCall =
			interestManagerCompoundStateTransferLogic.interface.encodeFunctionData('initializeStateTransfer', [
				adminAccount.address,
				oneAddress,
				oneAddress,
			])

		await proxyAdmin
			.connect(adminAccount)
			.upgradeAndCall(
				interestManager.address,
				interestManagerCompoundStateTransferLogic.address,
				interestManagerCompoundStateTransferInitCall
			)

		interestManager = new ethers.Contract(
			interestManager.address,
			InterestManagerCompoundStateTransfer.interface,
			InterestManagerCompoundStateTransfer.signer
		)
	})
	/*
	it('disabled functions revert', async () => {
		await expect(
			interestManager.initialize(oneAddress, oneAddress, oneAddress, oneAddress, oneAddress)
		).to.be.revertedWith('x')

		await expect(interestManager.invest(BigNumber.from('1'))).to.be.revertedWith('x')

		await expect(interestManager.redeem(oneAddress, BigNumber.from('1'))).to.be.revertedWith('x')

		await expect(interestManager.redeemInvestmentToken(oneAddress, BigNumber.from('1'))).to.be.revertedWith('x')

		await expect(interestManager.accrueInterest()).to.be.revertedWith('x')

		await expect(interestManager.withdrawComp()).to.be.revertedWith('x')
	})
	*/
})
