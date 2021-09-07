const { time, expectRevert } = require('@openzeppelin/test-helpers')
const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')

describe('vesting/DelegateableTokenVesting', () => {
	let DelegateableTokenVesting
	let IMO

	let delegateableTokenVesting
	let imo

	let userAccount
	let delegateeA
    let delegateeB
    let delegateeC

    let startTime
    const defaultDuration = BigNumber.from('10000')

    const tenPow17 = BigNumber.from('10').pow(BigNumber.from('17'))
    const tenPow18 = BigNumber.from('10').pow(BigNumber.from('18'))
    const zeroAddress = '0x0000000000000000000000000000000000000000'

	before(async () => {
		const accounts = await ethers.getSigners()
		userAccount = accounts[0]
		delegateeA = accounts[1]
        delegateeB = accounts[2]
        delegateeC = accounts[3]

		DelegateableTokenVesting = await ethers.getContractFactory('DelegateableTokenVesting')
		IMO = await ethers.getContractFactory('IMO')
	})

    async function deployDelegateableTokenVesting(startTime, duration, lockedTokenAddress) {
        delegateableTokenVesting = await DelegateableTokenVesting.deploy(userAccount.address, startTime, duration, lockedTokenAddress)
        await delegateableTokenVesting.deployed()
    }

	beforeEach(async () => {
		imo = await IMO.deploy(userAccount.address)
        await imo.deployed()

        startTime = BigNumber.from((await time.latest()).toString()).add(BigNumber.from('100'))
        await deployDelegateableTokenVesting(startTime, defaultDuration, imo.address)

        await imo.approve(delegateableTokenVesting.address, tenPow18)
        await delegateableTokenVesting.deposit(tenPow18)
	})

    it('can delegate and undelegate', async () => {
        await delegateableTokenVesting.delegate(delegateeA.address, tenPow17)
        await delegateableTokenVesting.delegate(delegateeB.address, tenPow17)
        await delegateableTokenVesting.delegate(delegateeC.address, tenPow17)
        expect(await imo.getCurrentVotes(userAccount.address)).to.equal(tenPow18.sub(BigNumber.from('3').mul(tenPow17)))
        expect(await imo.getCurrentVotes(delegateeA.address)).to.equal(tenPow17)
        expect(await imo.getCurrentVotes(delegateeB.address)).to.equal(tenPow17)
        expect(await imo.getCurrentVotes(delegateeC.address)).to.equal(tenPow17)
    
        await delegateableTokenVesting.undelegate(delegateeA.address)
        await delegateableTokenVesting.undelegate(delegateeB.address)
        await delegateableTokenVesting.undelegate(delegateeC.address)
        expect(await imo.getCurrentVotes(userAccount.address)).to.equal(tenPow18)
    })

    it('can delegate multiple times to same delegatee', async () => {
        await delegateableTokenVesting.delegate(delegateeA.address, tenPow17)
        expect(await imo.getCurrentVotes(userAccount.address)).to.equal(tenPow18.sub(tenPow17))
        expect(await imo.getCurrentVotes(delegateeA.address)).to.equal(tenPow17)

        await delegateableTokenVesting.delegate(delegateeA.address, tenPow17)
        expect(await imo.getCurrentVotes(userAccount.address)).to.equal(tenPow18.sub(tenPow17.mul(BigNumber.from('2'))))
        expect(await imo.getCurrentVotes(delegateeA.address)).to.equal(tenPow17.mul(BigNumber.from('2')))
    })

    it('can change beneficiary', async () => {
        await delegateableTokenVesting.setPendingBeneficiary(delegateeA.address)
        await delegateableTokenVesting.connect(delegateeA).acceptBeneficiary()
        expect(await imo.getCurrentVotes(userAccount.address)).to.equal(BigNumber.from('0'))
        expect(await imo.getCurrentVotes(delegateeA.address)).to.equal(tenPow18)
    })

    it('fail only beneficiary can call delegate', async () => {
        await expectRevert(delegateableTokenVesting.connect(delegateeA).delegate(delegateeB.address, tenPow17), 'only-beneficiary')
    })

    it('fail only beneficiary can call undelegate', async () => {
        await expectRevert(delegateableTokenVesting.connect(delegateeA).undelegate(delegateeB.address), 'only-beneficiary')
    })

    it('fail not enough tokens for delegation', async () => {
        await expectRevert(delegateableTokenVesting.delegate(delegateeB.address, tenPow18.add(BigNumber.from('1'))), 'not-enough-tokens')
    })

    it('fail undelegate invalid delegatee', async () => {
        await expectRevert(delegateableTokenVesting.undelegate(zeroAddress), 'invalid-delegatee')
    })
})
