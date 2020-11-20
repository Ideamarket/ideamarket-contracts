const { expect } = require('chai')

describe('nameVerifiers/SubstackNameVerifier', () => {
	let SubstackNameVerifier
	let nameVerifier

	before(async () => {
		SubstackNameVerifier = await ethers.getContractFactory('SubstackNameVerifier')
		nameVerifier = await SubstackNameVerifier.deploy()
		await nameVerifier.deployed()
	})

	it('(empty)', async () => {
		expect(await nameVerifier.verifyTokenName('')).to.be.false
	})

	it('vitalik', async () => {
		expect(await nameVerifier.verifyTokenName('vitalik')).to.be.true
	})

	it('Vitalik', async () => {
		expect(await nameVerifier.verifyTokenName('Vitalik')).to.be.false
	})

	it('VITALIK', async () => {
		expect(await nameVerifier.verifyTokenName('VITALIK')).to.be.false
	})

	it('{unallowed ascii char}', async () => {
		for (let i = 0; i < 255; i++) {
			if (
				!(i >= 0x61 && i <= 0x7a) //a-z
			) {
				expect(await nameVerifier.verifyTokenName(String.fromCharCode(i))).to.be.false
			}
		}
	})

	it('{allowed ascii char}', async () => {
		for (let i = 0; i < 255; i++) {
			if (
				i >= 0x61 &&
				i <= 0x7a //a-z
			) {
				expect(await nameVerifier.verifyTokenName(String.fromCharCode(i))).to.be.true
			}
		}
	})
})
