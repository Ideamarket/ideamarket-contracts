const { expect } = require('chai')
const { BigNumber } = require('ethers')
const { ethers } = require('hardhat')
const { time } = require('@openzeppelin/test-helpers')

describe('credibility-ratings/CredibilityRatings', () => {

	let CredibilityRatings

    let zeroAddress = '0x0000000000000000000000000000000000000000'
    let linkAddress = '0x0000000000000000000000000000000000000001'
    let credibilityRatings
    let userAccount
    let otherUserAccount

	before(async () => {
		CredibilityRatings = await ethers.getContractFactory('CredibilityRatings')
		const accounts = await ethers.getSigners()
		userAccount = accounts[0]
		otherUserAccount = accounts[1]
	})

	beforeEach(async () => {
		credibilityRatings = await CredibilityRatings.deploy()
		await credibilityRatings.deployed()
	})

	it('can submit ratings', async () => {
		for(let i = 0; i <= 100; i++) {

            const rating = BigNumber.from(i.toString())

            await credibilityRatings.submitRating(linkAddress, rating)
            expect((await credibilityRatings.getNumRatings(userAccount.address, linkAddress)).eq(BigNumber.from((i + 1).toString()))).to.be.true
            
            const latestTs = BigNumber.from((await time.latest()).toString())
            const [latestRating, ts] = await credibilityRatings.getRating(userAccount.address, linkAddress, BigNumber.from(i.toString()))
            
            expect(latestTs.eq(ts)).to.be.true
            expect(latestRating.eq(rating)).to.be.true
        }
	})

    it('fail invalid link', async () => {
        await expect(
            credibilityRatings.submitRating(zeroAddress, BigNumber.from('1'))
        ).to.be.revertedWith('invalid-link')
    })

    it('fail invalid rating', async () => {
        await expect(
            credibilityRatings.submitRating(linkAddress, BigNumber.from('101'))
        ).to.be.revertedWith('invalid-rating')
    })

})