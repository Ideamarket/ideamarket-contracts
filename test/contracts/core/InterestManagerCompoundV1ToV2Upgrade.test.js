const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('core/InterestManagerCompoundV1ToV2Upgrade', () => {
	let InterestManagerCompound
	let InterestManagerCompoundV2
	let ProxyAdmin
	let AdminUpgradeabilityProxy
	let TestComptroller
	let TestCDai
	let TestERC20

	const zero = BigNumber.from('0')
	const tenPow18 = BigNumber.from('10').pow(BigNumber.from('18'))
	const oneAddress = '0x0000000000000000000000000000000000000001'

	let userAccount
	let adminAccount
	let compRecipient

	let proxy
	let proxyAdmin
	let interestManagerCompound
	let comptroller
	let cDai
	let dai
	let comp

	before(async () => {
		const accounts = await ethers.getSigners()
		userAccount = accounts[0]
		adminAccount = accounts[1]
		compRecipient = accounts[2]

		InterestManagerCompound = await ethers.getContractFactory('InterestManagerCompound')
		InterestManagerCompoundV2 = await ethers.getContractFactory('InterestManagerCompoundV2')
		ProxyAdmin = await ethers.getContractFactory('ProxyAdmin')
		AdminUpgradeabilityProxy = await ethers.getContractFactory('AdminUpgradeabilityProxy')
		TestComptroller = await ethers.getContractFactory('TestComptroller')
		TestCDai = await ethers.getContractFactory('TestCDai')
		TestERC20 = await ethers.getContractFactory('TestERC20')
	})

	beforeEach(async () => {
		dai = await TestERC20.deploy('DAI', 'DAI')
		await dai.deployed()

		comp = await TestERC20.deploy('COMP', 'COMP')
		await comp.deployed()

		comptroller = await TestComptroller.deploy()
		await comptroller.deployed()

		cDai = await TestCDai.deploy(dai.address, comp.address, comptroller.address)
		await cDai.deployed()
		await cDai.setExchangeRate(tenPow18)

		proxyAdmin = await ProxyAdmin.deploy(adminAccount.address)
		await proxyAdmin.deployed()

		const interestManagerCompoundLogic = await InterestManagerCompound.deploy()
		await interestManagerCompoundLogic.deployed()

		const data = interestManagerCompoundLogic.interface.encodeFunctionData('initialize', [
			adminAccount.address,
			dai.address,
			cDai.address,
			comp.address,
			compRecipient.address,
		])

		proxy = await AdminUpgradeabilityProxy.deploy(interestManagerCompoundLogic.address, proxyAdmin.address, data)
		await proxy.deployed()

		interestManagerCompound = new ethers.Contract(
			proxy.address,
			InterestManagerCompound.interface,
			InterestManagerCompound.signer
		)
	})

	async function performUpgrade() {
		const interestManagerCompoundV2Logic = await InterestManagerCompoundV2.deploy()
		await interestManagerCompoundV2Logic.deployed()

		const dataV2 = interestManagerCompoundV2Logic.interface.encodeFunctionData('initializeV2', [])

		await proxyAdmin
			.connect(adminAccount)
			.upgradeAndCall(proxy.address, interestManagerCompoundV2Logic.address, dataV2)

		interestManagerCompound = new ethers.Contract(
			proxy.address,
			InterestManagerCompoundV2.interface,
			InterestManagerCompoundV2.signer
		)
	}

	it('admin is owner', async () => {
		expect(adminAccount.address).to.equal(await interestManagerCompound.getOwner())

		await performUpgrade()

		expect(adminAccount.address).to.equal(await interestManagerCompound.getOwner())
	})

	it('can invest', async () => {
		await dai.mint(userAccount.address, tenPow18)
		await dai.transfer(interestManagerCompound.address, tenPow18)
		await interestManagerCompound.connect(adminAccount).invest(tenPow18)
		expect(zero.eq(await dai.balanceOf(userAccount.address))).to.be.true
		expect(tenPow18.eq(await dai.balanceOf(cDai.address))).to.be.true
		expect(tenPow18.eq(await cDai.balanceOf(interestManagerCompound.address))).to.be.true
		expect(zero.eq(await dai.balanceOf(interestManagerCompound.address))).to.be.true

		await performUpgrade()

		await dai.mint(userAccount.address, tenPow18)
		await dai.transfer(interestManagerCompound.address, tenPow18)
		await interestManagerCompound.connect(adminAccount).invest(tenPow18)
		expect(zero.eq(await dai.balanceOf(userAccount.address))).to.be.true
		expect(tenPow18.eq(await dai.balanceOf(cDai.address))).to.be.true
		expect(tenPow18.eq(await cDai.balanceOf(interestManagerCompound.address))).to.be.true
		expect(tenPow18.eq(await dai.balanceOf(interestManagerCompound.address))).to.be.true

		await interestManagerCompound.supplyDaiToCompound()

		expect(zero.eq(await dai.balanceOf(userAccount.address))).to.be.true
		expect(tenPow18.add(tenPow18).eq(await dai.balanceOf(cDai.address))).to.be.true
		expect(tenPow18.add(tenPow18).eq(await cDai.balanceOf(interestManagerCompound.address))).to.be.true
		expect(zero.eq(await dai.balanceOf(interestManagerCompound.address))).to.be.true
	})

	it('fail invest not admin', async () => {
		await dai.mint(userAccount.address, tenPow18)
		await dai.transfer(interestManagerCompound.address, tenPow18)
		await expect(interestManagerCompound.invest(tenPow18)).to.be.revertedWith('only-owner')

		await performUpgrade()

		await expect(interestManagerCompound.invest(tenPow18)).to.be.revertedWith('only-owner')
	})

	it('fail invest too few dai', async () => {
		await expect(interestManagerCompound.connect(adminAccount).invest(tenPow18)).to.be.revertedWith(
			'insufficient-dai'
		)

		await performUpgrade()

		await interestManagerCompound.connect(adminAccount).invest(tenPow18)
	})

	it('can redeem', async () => {
		await dai.mint(userAccount.address, tenPow18)
		await dai.transfer(interestManagerCompound.address, tenPow18)
		await interestManagerCompound.connect(adminAccount).invest(tenPow18)

		const redeemAmount = tenPow18.div(BigNumber.from('2'))
		await interestManagerCompound.connect(adminAccount).redeem(adminAccount.address, redeemAmount)

		expect(redeemAmount.eq(await dai.balanceOf(adminAccount.address))).to.be.true
		expect(tenPow18.sub(redeemAmount).eq(await cDai.balanceOf(interestManagerCompound.address))).to.be.true

		await performUpgrade()

		await interestManagerCompound.connect(adminAccount).redeem(adminAccount.address, redeemAmount)

		expect(tenPow18.eq(await dai.balanceOf(adminAccount.address))).to.be.true
		expect(zero.eq(await cDai.balanceOf(interestManagerCompound.address))).to.be.true
	})

	it('fail redeem not admin', async () => {
		await dai.mint(userAccount.address, tenPow18)
		await dai.transfer(interestManagerCompound.address, tenPow18)
		await interestManagerCompound.connect(adminAccount).invest(tenPow18)

		const redeemAmount = tenPow18.div(BigNumber.from('2'))
		await expect(interestManagerCompound.redeem(adminAccount.address, redeemAmount)).to.be.revertedWith(
			'only-owner'
		)

        await performUpgrade()

        await expect(interestManagerCompound.redeem(adminAccount.address, redeemAmount)).to.be.revertedWith(
			'only-owner'
		)
	})

	it('can withdraw COMP', async () => {
		await dai.mint(userAccount.address, tenPow18)
		await dai.transfer(interestManagerCompound.address, tenPow18)
		await interestManagerCompound.connect(adminAccount).invest(tenPow18)

		const compBalanceV1 = await comp.balanceOf(interestManagerCompound.address)
		await interestManagerCompound.withdrawComp()
		expect((await comp.balanceOf(interestManagerCompound.address)).eq(BigNumber.from('0'))).to.be.true
		expect((await comp.balanceOf(compRecipient.address)).eq(compBalanceV1)).to.be.true

        await performUpgrade()

        await dai.mint(userAccount.address, tenPow18)
		await dai.transfer(interestManagerCompound.address, tenPow18)
		await interestManagerCompound.connect(adminAccount).invest(tenPow18)

        const compBalanceV2 = await comp.balanceOf(interestManagerCompound.address)
		await interestManagerCompound.withdrawComp()
		expect((await comp.balanceOf(interestManagerCompound.address)).eq(BigNumber.from('0'))).to.be.true
		expect((await comp.balanceOf(compRecipient.address)).eq(compBalanceV1.add(compBalanceV2))).to.be.true

	})
})
