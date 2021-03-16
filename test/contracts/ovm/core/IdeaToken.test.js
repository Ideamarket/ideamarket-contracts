const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { l2ethers: ethers } = require('hardhat')

const { expectRevert, waitForTx } = require('../../utils/tx')
const { generateWallets } = require('../../utils/wallet')

describe('ovm/core/IdeaToken', () => {
	const tenPow18 = BigNumber.from('10').pow(BigNumber.from('18'))

	let IdeaToken
	let adminAccount
	let userAccount
	let otherUserAccount
	let ideaToken

	before(async () => {
		IdeaToken = await ethers.getContractFactory('IdeaToken')
		;[adminAccount, userAccount, otherUserAccount] = generateWallets(ethers, 3)
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
