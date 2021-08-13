const { expect } = require('chai')

describe('nameVerifiers/TwitchNameVerifier', () => {
	let TwitchNameVerifier
	let nameVerifier

	before(async () => {
		TwitchNameVerifier = await ethers.getContractFactory('TwitchNameVerifier')
		nameVerifier = await TwitchNameVerifier.deploy()
		await nameVerifier.deployed()
	})

	it('(empty)', async () => {
		expect(await nameVerifier.verifyTokenName('')).to.be.false
	})

	it('a', async () => {
		expect(await nameVerifier.verifyTokenName('a')).to.be.false
	})

	it('A', async () => {
		expect(await nameVerifier.verifyTokenName('A')).to.be.false
	})

	it('aa', async () => {
		expect(await nameVerifier.verifyTokenName('aa')).to.be.false
	})

	it('aaaa', async () => {
		expect(await nameVerifier.verifyTokenName('aaaa')).to.be.true
	})

	it('0x1a1853db0905c759b28bb1d', async () => {
		expect(await nameVerifier.verifyTokenName('0x1a1853db0905c759b28bb1d')).to.be.true
	})

	it('abcdefghijklmnop_', async () => {
		expect(await nameVerifier.verifyTokenName('abcdefghijklmnop_')).to.be.true
	})

	it('(too long)', async () => {
		expect(await nameVerifier.verifyTokenName('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).to.be.false
	})

	it('ABCDEFGHIJKLMNOPQRSTUVWXYZ', async () => {
		expect(await nameVerifier.verifyTokenName('ABCDEFGHIJKLMNOPQRSTUVWXYZ')).to.be.false
	})

	it('123456789_', async () => {
		expect(await nameVerifier.verifyTokenName('123456789_')).to.be.true
	})

	it('@{unallowed ascii char}', async () => {
		for (let i = 0; i < 255; i++) {
			if (
				!(i >= 0x61 && i <= 0x7a) && // a-z
				!(i >= 0x30 && i <= 0x39) && // 0-9
				!(i == 0x5f) // _
			) {
				let minChars =
					String.fromCharCode(i) + String.fromCharCode(i) + String.fromCharCode(i) + String.fromCharCode(i)
				expect(await nameVerifier.verifyTokenName(minChars)).to.be.false
			}
		}
	})

	it('@{allowed ascii char}', async () => {
		for (let i = 0; i < 255; i++) {
			if (
				(i >= 0x61 && i <= 0x7a) || // a-z
				(i >= 0x30 && i <= 0x39) || // 0-9
				i == 0x5f // _
			) {
				let minChars =
					String.fromCharCode(i) + String.fromCharCode(i) + String.fromCharCode(i) + String.fromCharCode(i)
				expect(await nameVerifier.verifyTokenName(minChars)).to.be.true
			}
		}
	})
})
