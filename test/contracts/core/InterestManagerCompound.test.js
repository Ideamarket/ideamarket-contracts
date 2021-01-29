const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('core/InterestManagerCompound', () => {
	let InterestManagerCompound
	let TestComptroller
	let TestCDai
	let TestERC20

	const zero = BigNumber.from('0')
	const tenPow18 = BigNumber.from('10').pow(BigNumber.from('18'))

	let userAccount
	let adminAccount
	let compRecipient

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

		interestManagerCompound = await InterestManagerCompound.deploy()
		await interestManagerCompound.deployed()
		await interestManagerCompound.initialize(
			adminAccount.address,
			dai.address,
			cDai.address,
			comp.address,
			compRecipient.address
		)
	})

	it('admin is owner', async () => {
		expect(adminAccount.address).to.equal(await interestManagerCompound.getOwner())
	})

	it('can invest', async () => {
		await dai.mint(userAccount.address, tenPow18)
		await dai.transfer(interestManagerCompound.address, tenPow18)
		await interestManagerCompound.connect(adminAccount).invest(tenPow18)
		expect(zero.eq(await dai.balanceOf(userAccount.address))).to.be.true
		expect(tenPow18.eq(await dai.balanceOf(cDai.address))).to.be.true
		expect(tenPow18.eq(await cDai.balanceOf(interestManagerCompound.address))).to.be.true
	})

	it('fail invest too few dai', async () => {
		await expect(interestManagerCompound.connect(adminAccount).invest(tenPow18)).to.be.revertedWith('insufficient-dai')
	})

	it('can redeem', async () => {
		await dai.mint(userAccount.address, tenPow18)
		await dai.transfer(interestManagerCompound.address, tenPow18)
		await interestManagerCompound.connect(adminAccount).invest(tenPow18)

		const redeemAmount = tenPow18.div(BigNumber.from('2'))
		await interestManagerCompound.connect(adminAccount).redeem(adminAccount.address, redeemAmount)

		expect(redeemAmount.eq(await dai.balanceOf(adminAccount.address))).to.be.true
		expect(tenPow18.sub(redeemAmount).eq(await cDai.balanceOf(interestManagerCompound.address))).to.be.true
	})

	it('fail redeem not admin', async () => {
		await dai.mint(userAccount.address, tenPow18)
		await dai.transfer(interestManagerCompound.address, tenPow18)
		await interestManagerCompound.connect(adminAccount).invest(tenPow18)

		const redeemAmount = tenPow18.div(BigNumber.from('2'))
		await expect(interestManagerCompound.redeem(adminAccount.address, redeemAmount)).to.be.revertedWith(
			'only-owner'
		)
	})

	it('can withdraw COMP', async () => {
		await dai.mint(userAccount.address, tenPow18)
		await dai.transfer(interestManagerCompound.address, tenPow18)
		await interestManagerCompound.connect(adminAccount).invest(tenPow18)

		const compBalance = await comp.balanceOf(interestManagerCompound.address)
		await interestManagerCompound.withdrawComp()
		expect((await comp.balanceOf(interestManagerCompound.address)).eq(BigNumber.from('0'))).to.be.true
		expect((await comp.balanceOf(compRecipient.address)).eq(compBalance)).to.be.true
	})
})
