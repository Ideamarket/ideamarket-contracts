const { time, expectRevert } = require('@openzeppelin/test-helpers')
const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('avm/vesting/TokenVesting', () => {
	let TokenVesting
	let TestERC20

	let tokenVesting
	let testERC20

	let userAccount
	let otherAccount

    let startTime
    const defaultDuration = BigNumber.from('10000')

    const tenPow18 = BigNumber.from('10').pow(BigNumber.from('18'))
    const zeroAddress = '0x0000000000000000000000000000000000000000'

	before(async () => {
		const accounts = await ethers.getSigners()
		userAccount = accounts[0]
		otherAccount = accounts[1]

		TokenVesting = await ethers.getContractFactory('TokenVesting')
		TestERC20 = await ethers.getContractFactory('TestERC20')
	})

    async function deployTokenVesting(startTime, duration, lockedTokenAddress) {
        tokenVesting = await TokenVesting.deploy(userAccount.address, startTime, duration, lockedTokenAddress)
        await tokenVesting.deployed()
    }

	beforeEach(async () => {
		testERC20 = await TestERC20.deploy('TEST', 'TEST')
        await testERC20.deployed()
        await testERC20.mint(userAccount.address, tenPow18)

        startTime = BigNumber.from((await time.latest()).toString()).add(BigNumber.from('100'))
        await deployTokenVesting(startTime, defaultDuration, testERC20.address)
	})

	it('can vest tokens', async () => {
        expect(await tokenVesting._beneficiary()).to.equal(userAccount.address)
        expect(await tokenVesting._lockedToken()).to.equal(testERC20.address)
        expect(await tokenVesting._pendingBeneficiary()).to.equal(zeroAddress)
        expect((await tokenVesting._startTime()).toString()).to.equal(startTime.toString())
        expect((await tokenVesting._duration()).toString()).to.equal(defaultDuration.toString())
        expect((await tokenVesting._initialBalance()).toString()).to.equal('0')
        expect((await tokenVesting.alreadyReleasedAmount()).toString()).to.equal('0')
        expect((await tokenVesting.availableForRelease()).toString()).to.equal('0')
        expect((await tokenVesting.timeSinceStart()).toString()).to.equal('0')

        await testERC20.approve(tokenVesting.address, tenPow18)
        await tokenVesting.deposit(tenPow18)
        expect((await tokenVesting.availableForRelease()).toString()).to.equal('0')
        expect((await tokenVesting.timeSinceStart()).toString()).to.equal('0')

        await time.increaseTo(startTime.add(defaultDuration.div(BigNumber.from('2'))).toString())
        expect((await tokenVesting.timeSinceStart()).gte(defaultDuration.div(BigNumber.from('2')))).to.be.true
        expect((await tokenVesting.availableForRelease()).gte(tenPow18.div(BigNumber.from('2')))).to.be.true

        await tokenVesting.release(userAccount.address, tenPow18.div(BigNumber.from('4')))
        await tokenVesting.releaseMax(otherAccount.address)
        expect((await testERC20.balanceOf(userAccount.address)).toString()).to.equal(tenPow18.div(BigNumber.from('4')))
        expect((await testERC20.balanceOf(otherAccount.address)).gte(tenPow18.div(BigNumber.from('4')))).to.be.true

        await time.increaseTo(startTime.add(defaultDuration).toString())
        const alreadyReleasedAmount = await tokenVesting.alreadyReleasedAmount()
        const availableForRelease = await tokenVesting.availableForRelease()
        expect(tenPow18.sub(alreadyReleasedAmount).toString()).to.equal(availableForRelease.toString())

        await tokenVesting.releaseMax(userAccount.address)
        const userBalance = await testERC20.balanceOf(userAccount.address)
        const otherBalance = await testERC20.balanceOf(otherAccount.address)
        expect(userBalance.add(otherBalance).toString()).to.equal(tenPow18)
	})

    it('can change beneficiary', async () => {
        await tokenVesting.setPendingBeneficiary(otherAccount.address)
        await tokenVesting.connect(otherAccount).acceptBeneficiary()
        expect(await tokenVesting._beneficiary()).to.equal(otherAccount.address)
    })

    it('fail invalid beneficiary', async () => {
        await expectRevert(TokenVesting.deploy(zeroAddress, startTime, '1', testERC20.address), 'invalid-beneficiary')
    })

    it('fail invalid duration', async () => {
        await expectRevert(TokenVesting.deploy(userAccount.address, startTime, '0', testERC20.address), 'invalid-duration')
    })

    it('fail invalid lockedToken', async () => {
        await expectRevert(TokenVesting.deploy(userAccount.address, startTime, '1', zeroAddress), 'invalid-lockedToken')
    })

    it('fail only beneficiary can call release', async () => {
        await expectRevert(tokenVesting.connect(otherAccount).release(otherAccount.address, tenPow18), 'only-beneficiary')
    })

    it('fail only beneficiary can call releaseMax', async () => {
        await expectRevert(tokenVesting.connect(otherAccount).releaseMax(otherAccount.address), 'only-beneficiary')
    })

    it('fail only beneficiary can call setPendingBeneficiary', async () => {
        await expectRevert(tokenVesting.connect(otherAccount).setPendingBeneficiary(otherAccount.address), 'only-beneficiary')
    })

    it('fail only pending beneficiary can call acceptBeneficiary', async () => {
        await tokenVesting.setPendingBeneficiary(otherAccount.address)
        await expectRevert(tokenVesting.acceptBeneficiary(), 'not-allowed')
    })
})
