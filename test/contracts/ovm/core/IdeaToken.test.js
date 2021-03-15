const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { l2ethers: ethers } = require('hardhat')

const { expectRevert, waitForTx } = require('../../utils/tx')

describe('ovm/core/IdeaToken', () => {
	const tenPow18 = BigNumber.from('10').pow(BigNumber.from('18'))

	let IdeaToken
	let userAccount
	let otherUserAccount
	let adminAccount

	let ideaToken

	before(async () => {
		IdeaToken = await ethers.getContractFactory('IdeaToken')
		adminAccount = new ethers.Wallet(
			'0x09e910621c2e988e9f7f6ffcd7024f54ec1461fa6e86a4b545e9e1fe21c28866',
			ethers.provider
		)
		userAccount = new ethers.Wallet(
			'0xce237946ccefcacb4a8956fa09fbf2c1526285871bccaf9cce2b6578103e757f',
			ethers.provider
		)
		otherUserAccount = new ethers.Wallet(
			'0x8da4ef21b864d2cc526dbdb2a120bd2874c36c9d0a1fb7f8c63d7f7a8b41de8f',
			ethers.provider
		)
	})

	beforeEach(async () => {
		ideaToken = await IdeaToken.connect(adminAccount).deploy()
		await ideaToken.deployed()
		await waitForTx(ideaToken.initialize('name', adminAccount.address))
	})

	it('admin is owner', async () => {
		expect(adminAccount.address).to.equal(await ideaToken.getOwner())
	})

	it('admin can mint tokens', async () => {
		await waitForTx(ideaToken.connect(adminAccount).mint(userAccount.address, tenPow18))
		expect(tenPow18.eq(await ideaToken.balanceOf(userAccount.address))).to.be.true
	})

	it('admin can burn tokens', async () => {
		await waitForTx(ideaToken.connect(adminAccount).mint(userAccount.address, tenPow18))
		expect(tenPow18.eq(await ideaToken.balanceOf(userAccount.address))).to.be.true
		await waitForTx(ideaToken.connect(adminAccount).burn(userAccount.address, tenPow18))
		expect(BigNumber.from('0').eq(await ideaToken.balanceOf(userAccount.address))).to.be.true
	})

	it('normal user cannot mint tokens', async () => {
		await expectRevert(ideaToken.connect(userAccount).mint(userAccount.address, tenPow18))
	})

	it('normal user cannot burn tokens', async () => {
		await waitForTx(ideaToken.connect(adminAccount).mint(userAccount.address, tenPow18))
		expect(tenPow18.eq(await ideaToken.balanceOf(userAccount.address))).to.be.true
		await expectRevert(ideaToken.connect(userAccount).burn(userAccount.address, tenPow18))
	})

	it('user can transfer tokens', async () => {
		await waitForTx(ideaToken.connect(adminAccount).mint(userAccount.address, tenPow18))
		expect(tenPow18.eq(await ideaToken.balanceOf(userAccount.address))).to.be.true
		await waitForTx(ideaToken.connect(userAccount).transfer(otherUserAccount.address, tenPow18))
		expect(BigNumber.from('0').eq(await ideaToken.balanceOf(userAccount.address))).to.be.true
		expect(tenPow18.eq(await ideaToken.balanceOf(otherUserAccount.address))).to.be.true
	})

	it('user can approve other user', async () => {
		await waitForTx(ideaToken.connect(adminAccount).mint(userAccount.address, tenPow18))
		expect(tenPow18.eq(await ideaToken.balanceOf(userAccount.address))).to.be.true
		await waitForTx(ideaToken.connect(userAccount).approve(otherUserAccount.address, tenPow18))
		expect(tenPow18.eq(await ideaToken.allowance(userAccount.address, otherUserAccount.address))).to.be.true
		await waitForTx(
			ideaToken.connect(otherUserAccount).transferFrom(userAccount.address, otherUserAccount.address, tenPow18)
		)
		expect(BigNumber.from('0').eq(await ideaToken.balanceOf(userAccount.address))).to.be.true
		expect(tenPow18.eq(await ideaToken.balanceOf(otherUserAccount.address))).to.be.true
	})

	it('user can transfer other users tokens', async () => {
		await waitForTx(ideaToken.connect(adminAccount).mint(userAccount.address, tenPow18))
		expect(tenPow18.eq(await ideaToken.balanceOf(userAccount.address))).to.be.true
		await expectRevert(
			ideaToken.connect(otherUserAccount).transferFrom(userAccount.address, otherUserAccount.address, tenPow18)
		)
	})
})
