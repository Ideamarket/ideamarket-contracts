const DomainNoSubdomainNameVerifier = artifacts.require('DomainNoSubdomainNameVerifier')
const InterestManagerCompound = artifacts.require('InterestManagerCompound')
const IdeaTokenFactory = artifacts.require('IdeaTokenFactory')
const IdeaTokenExchange = artifacts.require('IdeaTokenExchange')
const IdeaToken = artifacts.require('IdeaToken')

const BN = web3.utils.BN

contract("IdeaTokenExchange", async accounts => {

    const tenPow18 = new BN('10').pow(new BN('18'))

    const marketName = 'main'
    const tokenName = 'test.com'
    const baseCost = new BN('1000000000000000000') // 10**18
    const priceRise = new BN('100000000000000000') // 10**17
    const tokensPerInterval = new BN('100000000000000000000') // 10**20
    const tradingFeeRate = new BN('100')
    const tradingFeeRateScale = new BN('10000')

    const adminAccount = accounts[1]

    let domainNoSubdomainNameVerifier
    let interestManagerCompound
    let ideaTokenFactory
    let ideaTokenExchange

    let marketID
    let tokenID
    let ideaToken

    beforeEach(async () => {
        
        domainNoSubdomainNameVerifier = await DomainNoSubdomainNameVerifier.new()
        interestManagerCompound = await InterestManagerCompound.new()
        ideaTokenFactory = await IdeaTokenFactory.new()
        ideaTokenExchange = await IdeaTokenExchange.new()

        await interestManagerCompound.initialize(ideaTokenExchange.address,
                                                 '0x0000000000000000000000000000000000000000',
                                                 '0x0000000000000000000000000000000000000000',
                                                 '0x0000000000000000000000000000000000000000',
                                                 '0x0000000000000000000000000000000000000000',
                                                 {from: adminAccount})

        await ideaTokenFactory.initialize(adminAccount,
                                          ideaTokenExchange.address,
                                          {from: adminAccount})

        await ideaTokenExchange.initialize(adminAccount,
                                           '0x0000000000000000000000000000000000000000',
                                           ideaTokenFactory.address,
                                           interestManagerCompound.address,
                                           '0x0000000000000000000000000000000000000000',
                                           {from: adminAccount})

        await ideaTokenFactory.addMarket(marketName,
                                         domainNoSubdomainNameVerifier.address,
                                         baseCost,
                                         priceRise,
                                         tokensPerInterval,
                                         tradingFeeRate,
                                         tradingFeeRateScale,
                                         {from: adminAccount})

        marketID = await ideaTokenFactory.getMarketIDByName(marketName)

        await ideaTokenFactory.addToken(tokenName, marketID)

        tokenID = await ideaTokenFactory.getTokenIDByName(tokenName, marketID)

        ideaToken = await IdeaToken.at((await ideaTokenFactory.getTokenInfo(marketID, tokenID)).ideaToken)

    })
  
    it("can buy 500 tokens", async () => {
        const amount = new BN('250').mul(tenPow18)
        const cost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, amount)
        assert.isTrue(cost.eq(await getCostForBuyingTokens(ideaToken, amount)))

        

    })

    function getCostForCompletedIntervals(b, r, t, n) {
        return n.mul(t).mul(b.sub(r)).add(r.mul(t).mul(n.mul(n.add(new BN('1'))).div(new BN('2'))))
    }

    function getCostFromZeroSupply(b, r, t, amount) {
        const n = amount.div(t)
        return getCostForCompletedIntervals(b, r, t, n).add(amount.sub(n.mul(t)).mul(b.add(n.mul(r)))).div(tenPow18)
    }

    function getRawCostForBuyingTokens(b, r, t, supply, amount){
        const costForSupply = getCostFromZeroSupply(b, r, t, supply)
        const costForSupplyPlusAmount = getCostFromZeroSupply(b, r, t, supply.add(amount))

        return costForSupplyPlusAmount.sub(costForSupply)
    }

    async function getCostForBuyingTokens(token, amount) {
        const supply = await token.totalSupply()
        const rawCost = getRawCostForBuyingTokens(baseCost,
                                                  priceRise,
                                                  tokensPerInterval,
                                                  supply,
                                                  amount)

        const fee = rawCost.mul(tradingFeeRate).div(tradingFeeRateScale);

        return rawCost.add(fee);
    }
})