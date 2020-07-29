const DomainNoSubdomainNameVerifier = artifacts.require('DomainNoSubdomainNameVerifier')

contract('nameVerifiers/DomainNoSubdomainNameVerifier', async () => {

    let nameVerifier
    
    before(async () => {
        nameVerifier = await DomainNoSubdomainNameVerifier.new()
    })

    it('test.com', async () => {
        assert.isTrue(await nameVerifier.verifyTokenName('test.com'))
    })

    it('abcdefghijklmnopqrstuvwxyz_1234567-89.com', async () => {
        assert.isTrue(await nameVerifier.verifyTokenName('abcdefghijklmnopqrstuvwxyz_1234567-89.com'))
    })

    it('test.com (with trailing whitespace)', async () => {
        assert.isFalse(await nameVerifier.verifyTokenName('test.com '))
    })

    it('test.com (with leading whitespace)', async () => {
        assert.isFalse(await nameVerifier.verifyTokenName(' test.com'))
    })

    it('test.com (with leading and trailing whitespace)', async () => {
        assert.isFalse(await nameVerifier.verifyTokenName(' test.com '))
    })

    it('test (no dot and TLD)', async () => {
        assert.isFalse(await nameVerifier.verifyTokenName('test'))
    })

    it('test. (no TLD)', async () => {
        assert.isFalse(await nameVerifier.verifyTokenName('test.'))
    })

    it('. (dot only)', async () => {
        assert.isFalse(await nameVerifier.verifyTokenName('.'))
    })

    it('.com (no domain)', async () => {
        assert.isFalse(await nameVerifier.verifyTokenName('.com'))
    })

    it('test..com (double dots)', async () => {
        assert.isFalse(await nameVerifier.verifyTokenName('test..com'))
    })

    it('example.test.com (subdomain)', async () => {
        assert.isFalse(await nameVerifier.verifyTokenName('example.test.com'))
    })

    it('test!.com (invalid character)', async () => {
        assert.isFalse(await nameVerifier.verifyTokenName('test!.com'))
    })
})