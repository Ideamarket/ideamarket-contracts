const { expect } = require('chai')

describe('avm/nameVerifiers/YoutubeChannelNameVerifier', () => {
	let YoutubeChannelNameVerifier
	let nameVerifier

	before(async () => {
		YoutubeChannelNameVerifier = await ethers.getContractFactory('YoutubeChannelNameVerifier')
		nameVerifier = await YoutubeChannelNameVerifier.deploy()
		await nameVerifier.deployed()
	})

	it('(empty)', async () => {
		expect(await nameVerifier.verifyTokenName('')).to.be.false
	})

	it('a', async () => {
		expect(await nameVerifier.verifyTokenName('a')).to.be.true
	})

	it('A', async () => {
		expect(await nameVerifier.verifyTokenName('A')).to.be.false
	})

	it('aaaaaaaaaaaaaaa', async () => {
		expect(await nameVerifier.verifyTokenName('aaaaaaaaaaaaaaa')).to.be.true
	})

	it('abcdefghijklmnopqrstuvwxyzäöü', async () => {
		expect(await nameVerifier.verifyTokenName('abcdefghijklmnopqrstuvwxyzäöü')).to.be.true
	})

	it('(too long)', async () => {
		expect(await nameVerifier.verifyTokenName('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa')).to.be.false
	})

	it('ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ', async () => {
		expect(await nameVerifier.verifyTokenName('ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ')).to.be.false
	})

	it('123456789_', async () => {
		expect(await nameVerifier.verifyTokenName('123456789_')).to.be.false
	})

	it('@{unallowed ascii char}', async () => {
		for (let i = 0; i < 255; i++) {
			if (
				!(i >= 0x61 && i <= 0x7a) && //a-z
				i != 0xe4 && // ä
				i != 0xf6 && // ö
				i != 0xfc
			) {
				// ü
				expect(await nameVerifier.verifyTokenName(String.fromCharCode(i))).to.be.false
			}
		}
	})

	it('@{allowed ascii char}', async () => {
		for (let i = 0; i < 255; i++) {
			if (
				(i >= 0x61 && i <= 0x7a) || //a-z
				(i == 0xe4 && // ä
					i == 0xf6 && // ö
					i == 0xfc)
			) {
				// ü
				expect(await nameVerifier.verifyTokenName(String.fromCharCode(i))).to.be.true
			}
		}
	})
})
