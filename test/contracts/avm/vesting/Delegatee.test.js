const { expectRevert } = require('@openzeppelin/test-helpers')
const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('avm/vesting/Delegatee', () => {
	let Delegatee
	let IMO

	let delegatee
	let imo

	let userAccount
	let otherAccount

    const tenPow18 = BigNumber.from('10').pow(BigNumber.from('18'))
    const totalSupply = BigNumber.from('100000000').mul(tenPow18)

	before(async () => {
		const accounts = await ethers.getSigners()
		userAccount = accounts[0]
		otherAccount = accounts[1]

		Delegatee = await ethers.getContractFactory('Delegatee')
		IMO = await ethers.getContractFactory('IMO')
	})

	beforeEach(async () => {
		imo = await IMO.deploy(userAccount.address)
        await imo.deployed()

        delegatee = await Delegatee.deploy(userAccount.address, imo.address)
        await delegatee.deployed()
	})

    it('has correct values after deployment', async () => {
        expect(await delegatee.getOwner()).to.equal(userAccount.address)
        expect(await delegatee._token()).to.equal(imo.address)
    })

    it('can withdraw', async () => {
        await imo.transfer(delegatee.address, tenPow18)
        await delegatee.withdraw()
        expect((await imo.balanceOf(userAccount.address)).toString()).to.equal(totalSupply.toString())
    })

    it('does delegate', async () => {
        await imo.delegate(userAccount.address)
        await imo.transfer(delegatee.address, tenPow18)
        expect((await imo.getCurrentVotes(userAccount.address)).toString()).to.equal(totalSupply.toString())
    })

    it('fail only owner can withdraw', async () => {
        await imo.transfer(delegatee.address, tenPow18)
        await expectRevert(delegatee.connect(otherAccount).withdraw(), 'only-owner')
    })
})
