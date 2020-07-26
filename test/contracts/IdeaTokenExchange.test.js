const DomainNoSubdomainNameVerifier = artifacts.require('DomainNoSubdomainNameVerifier')
const InterestManagerCompound = artifacts.require('InterestManagerCompound')
const IdeaTokenFactory = artifacts.require('IdeaTokenFactory')
const IdeaTokenExchange = artifacts.require('IdeaTokenExchange')

contract("IdeaTokenFormula", async accounts => {

    const marketName = 'main'
    const tokenName = 'test.com'
    const baseCost = new web3.utils.BN('1000000000000000000') // 10**18
    const priceRise = new web3.utils.BN('100000000000000000') // 10**17
    const tokensPerInterval = new web3.utils.BN('100000000000000000000') // 10**20
    const tradingFee = 100

    const adminAccount = accounts[0]

    let domainNoSubdomainNameVerifier
    let interestManagerCompound
    let ideaTokenFactory
    let ideaTokenExchange

    let marketID
    let tokenID

    beforeEach(async () => {
        
        domainNoSubdomainNameVerifier = await DomainNoSubdomainNameVerifier.new()
        interestManagerCompound = await InterestManagerCompound.new()
        ideaTokenFactory = await IdeaTokenFactory.new()
        ideaTokenExchange = await IdeaTokenExchange.new()

        await interestManagerCompound.initialize(ideaTokenExchange.address,
                                                 '0x0000000000000000000000000000000000000000',
                                                 '0x0000000000000000000000000000000000000000',
                                                 '0x0000000000000000000000000000000000000000',
                                                 '0x0000000000000000000000000000000000000000'
                                                 )

        await ideaTokenFactory.initialize(adminAccount,
                                          ideaTokenExchange.address)

        await ideaTokenExchange.initialize(adminAccount,
                                           tradingFee,
                                           '0x0000000000000000000000000000000000000000',
                                           ideaTokenFactory.address,
                                           interestManagerCompound.address,
                                           '0x0000000000000000000000000000000000000000'
                                           )

        await ideaTokenFactory.addMarket(marketName,
                                         domainNoSubdomainNameVerifier.address,
                                         baseCost,
                                         priceRise,
                                         tokensPerInterval)

        marketID = await ideaTokenFactory.getMarketIDByName(marketName)

        await ideaTokenFactory.addToken(tokenName, marketID)

        tokenID = await ideaTokenFactory.getTokenIDByName(tokenName, marketID)

    })
  
    it("should have correct buy price from 0 supply", async () => {
        console.log((await ideaTokenExchange.getCostForBuyingTokens(marketID, tokenID, '1000000000000000000')).toString())
    })
})