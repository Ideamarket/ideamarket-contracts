const { expectRevert } = require('@openzeppelin/test-helpers');

const DomainNoSubdomainNameVerifier = artifacts.require('DomainNoSubdomainNameVerifier')
const TestERC20 = artifacts.require('TestERC20')
const TestCDai = artifacts.require('TestCDai')
const InterestManagerCompound = artifacts.require('InterestManagerCompound')
const IdeaTokenFactory = artifacts.require('IdeaTokenFactory')
const IdeaTokenExchange = artifacts.require('IdeaTokenExchange')
const IdeaToken = artifacts.require('IdeaToken')

const BN = web3.utils.BN

contract('core/IdeaTokenExchange', async accounts => {

    const tenPow17 = new BN('10').pow(new BN('17'))
    const tenPow18 = new BN('10').pow(new BN('18'))

    const marketName = 'main'
    const tokenName = 'test.com'
    const baseCost = new BN('1000000000000000000') // 10**18
    const priceRise = new BN('100000000000000000') // 10**17
    const tokensPerInterval = new BN('100000000000000000000') // 10**20
    const tradingFeeRate = new BN('100')
    const platformFeeRate = new BN('50')
    const feeScale = new BN('10000')

    const userAccount = accounts[0]
    const adminAccount = accounts[1]
    const tradingFeeAccount = accounts[2]
    const interestReceiverAccount = accounts[3]
    const platformFeeReceiverAccount = accounts[4]
    const zeroAddress = '0x0000000000000000000000000000000000000000'

    let domainNoSubdomainNameVerifier
    let dai
    let comp
    let cDai
    let interestManagerCompound
    let ideaTokenFactory
    let ideaTokenExchange

    let marketID
    let tokenID
    let ideaToken

    beforeEach(async () => {
        
        domainNoSubdomainNameVerifier = await DomainNoSubdomainNameVerifier.new()
        dai = await TestERC20.new('DAI', 'DAI')
        comp = await TestERC20.new('COMP', 'COMP')
        cDai = await TestCDai.new(dai.address, comp.address)
        await cDai.setExchangeRate(tenPow18)
        interestManagerCompound = await InterestManagerCompound.new()
        ideaTokenFactory = await IdeaTokenFactory.new()
        ideaTokenExchange = await IdeaTokenExchange.new()

        await interestManagerCompound.initialize(ideaTokenExchange.address,
                                                 dai.address,
                                                 cDai.address,
                                                 comp.address,
                                                 zeroAddress,
                                                 {from: adminAccount})

        await ideaTokenFactory.initialize(adminAccount,
                                          ideaTokenExchange.address,
                                          {from: adminAccount})

        await ideaTokenExchange.initialize(adminAccount,
                                           tradingFeeAccount,
                                           ideaTokenFactory.address,
                                           interestManagerCompound.address,
                                           dai.address,
                                           {from: adminAccount})

        await ideaTokenFactory.addMarket(marketName,
                                         domainNoSubdomainNameVerifier.address,
                                         baseCost,
                                         priceRise,
                                         tokensPerInterval,
                                         tradingFeeRate,
                                         platformFeeRate,
                                         {from: adminAccount})

        marketID = await ideaTokenFactory.getMarketIDByName(marketName)

        await ideaTokenFactory.addToken(tokenName, marketID)

        tokenID = await ideaTokenFactory.getTokenIDByName(tokenName, marketID)

        ideaToken = await IdeaToken.at((await ideaTokenFactory.getTokenInfo(marketID, tokenID)).ideaToken)

    })

    it('admin is owner', async () => {
        assert.equal(adminAccount, await ideaTokenExchange.getOwner())
    })
  
    it('can buy and sell 500 tokens with correct interest', async () => {
        const amount = new BN('250').mul(tenPow18)
        const initialExchangeRate = tenPow18;
        const firstCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, amount)
        const firstTradingFee = await getTradingFeeForBuying(ideaToken, amount)
        const firstTradingFeeInvested = firstTradingFee.mul(tenPow18).div(initialExchangeRate)
        const firstPlatformFee = await getPlatformFeeForBuying(ideaToken, amount)
        const firstPlatformFeeInvested = firstPlatformFee.mul(tenPow18).div(initialExchangeRate)
        const firstRawCost = firstCost.sub(firstTradingFee).sub(firstPlatformFee)
        assert.isTrue(firstCost.eq(await getCostForBuyingTokens(ideaToken, amount)))

        await dai.mint(userAccount, firstCost)
        await dai.approve(ideaTokenExchange.address, firstCost)
        await ideaTokenExchange.buyTokens(ideaToken.address, amount, firstCost, userAccount)

        assert.isTrue((await dai.balanceOf(userAccount)).eq(new BN('0')))
        assert.isTrue((await ideaToken.balanceOf(userAccount)).eq(amount))
        assert.isTrue((await ideaTokenExchange.getTradingFeePayable()).eq(firstTradingFeeInvested.mul(initialExchangeRate).div(tenPow18)))
        assert.isTrue((await ideaTokenExchange.getPlatformFeePayable(marketID)).eq(firstPlatformFeeInvested.mul(initialExchangeRate).div(tenPow18)))

        assert.isTrue((await ideaTokenExchange.getInterestPayable(ideaToken.address)).eq(new BN('0')))
        const firstExchangeRate = tenPow18.add(tenPow17) // 1.1
        await cDai.setExchangeRate(firstExchangeRate)

        const firstInterestPayable = firstRawCost
                                     .mul(firstExchangeRate)
                                     .div(tenPow18)
                                     .sub(firstRawCost)

        assert.isTrue((await ideaTokenExchange.getInterestPayable(ideaToken.address)).eq(firstInterestPayable))

        const secondCost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, amount)
        const secondTradingFee = await getTradingFeeForBuying(ideaToken, amount)
        const secondTradingFeeInvested = secondTradingFee.mul(tenPow18).div(firstExchangeRate)
        const secondPlatformFee = await getPlatformFeeForBuying(ideaToken, amount)
        const secondPlatformFeeInvested = secondPlatformFee.mul(tenPow18).div(firstExchangeRate)
        const secondRawCost = secondCost.sub(secondTradingFee).sub(secondPlatformFee)
        assert.isTrue(secondCost.eq(await getCostForBuyingTokens(ideaToken, amount)))

        await dai.mint(userAccount, secondCost)
        await dai.approve(ideaTokenExchange.address, secondCost)
        await ideaTokenExchange.buyTokens(ideaToken.address, amount, secondCost, userAccount)

        assert.isTrue((await dai.balanceOf(userAccount)).eq(new BN('0')))
        assert.isTrue((await ideaToken.balanceOf(userAccount)).eq(amount.add(amount)))
        assert.isTrue((await ideaTokenExchange.getTradingFeePayable()).eq(firstTradingFeeInvested
                                                                          .add(secondTradingFeeInvested)
                                                                          .mul(firstExchangeRate)
                                                                          .div(tenPow18)))
        assert.isTrue((await ideaTokenExchange.getPlatformFeePayable(marketID)).eq(firstPlatformFeeInvested
                                                                                   .add(secondPlatformFeeInvested)
                                                                                   .mul(firstExchangeRate)
                                                                                   .div(tenPow18)))

        assert.isTrue((await ideaTokenExchange.getInterestPayable(ideaToken.address)).eq(firstInterestPayable))
        const secondExchangeRate = tenPow18.add(tenPow17.mul(new BN('2'))) // 1.2
        await cDai.setExchangeRate(secondExchangeRate)

        const secondInterestPayable = firstRawCost
                                      .add(secondRawCost.mul(tenPow18).div(firstExchangeRate))
                                      .mul(secondExchangeRate)
                                      .div(tenPow18)
                                      .sub(firstRawCost.add(secondRawCost))
        
        assert.isTrue((await ideaTokenExchange.getInterestPayable(ideaToken.address)).eq(secondInterestPayable))

        const firstPrice = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, amount)
        const thirdTradingFee = await getTradingFeeForSelling(ideaToken, amount)
        const thirdTradingFeeInvested = thirdTradingFee.mul(tenPow18).div(secondExchangeRate)
        const thirdPlatformFee = await getPlatformFeeForSelling(ideaToken, amount)
        const thirdPlatformFeeInvested = thirdPlatformFee.mul(tenPow18).div(secondExchangeRate)
        const firstRawPrice = firstPrice.add(thirdTradingFee).add(thirdPlatformFee)
        assert.isTrue(firstPrice.eq(await getPriceForSellingTokens(ideaToken, amount)))

        await ideaTokenExchange.sellTokens(ideaToken.address, amount, firstPrice, userAccount)

        assert.isTrue((await dai.balanceOf(userAccount)).eq(firstPrice))
        assert.isTrue((await ideaToken.balanceOf(userAccount)).eq(amount))
        assert.isTrue((await ideaTokenExchange.getTradingFeePayable()).eq(firstTradingFeeInvested
                                                                          .add(secondTradingFeeInvested)
                                                                          .add(thirdTradingFeeInvested)
                                                                          .mul(secondExchangeRate)
                                                                          .div(tenPow18)))
        assert.isTrue((await ideaTokenExchange.getPlatformFeePayable(marketID)).eq(firstPlatformFeeInvested
                                                                                   .add(secondPlatformFeeInvested)
                                                                                   .add(thirdPlatformFeeInvested)
                                                                                   .mul(secondExchangeRate)
                                                                                   .div(tenPow18)))
        assert.isTrue((await ideaTokenExchange.getInterestPayable(ideaToken.address)).eq(secondInterestPayable))
        const thirdExchangeRate = tenPow18.add(tenPow17.mul(new BN('3'))) // 1.3
        await cDai.setExchangeRate(thirdExchangeRate)

        const thirdInterestPayable = firstRawCost
                                     .add(secondRawCost.mul(tenPow18).div(firstExchangeRate))
                                     .sub(firstRawPrice.mul(tenPow18).div(secondExchangeRate))
                                     .mul(thirdExchangeRate).div(tenPow18)
                                     .sub(firstRawCost.add(secondRawCost).sub(firstRawPrice))

        assert.isTrue((await ideaTokenExchange.getInterestPayable(ideaToken.address)).eq(thirdInterestPayable))

        const secondPrice = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, amount)
        const fourthTradingFee = await getTradingFeeForSelling(ideaToken, amount)
        const fourthTradingFeeInvested = fourthTradingFee.mul(tenPow18).div(thirdExchangeRate)
        const fourthPlatformFee = await getPlatformFeeForSelling(ideaToken, amount)
        const fourthPlatformFeeInvested = fourthPlatformFee.mul(tenPow18).div(thirdExchangeRate)
        const secondRawPrice = secondPrice.add(fourthTradingFee).add(fourthPlatformFee)
        assert.isTrue(secondPrice.eq(await getPriceForSellingTokens(ideaToken, amount)))

        await ideaTokenExchange.sellTokens(ideaToken.address, amount, secondPrice, userAccount)

        assert.isTrue((await dai.balanceOf(userAccount)).eq(firstPrice.add(secondPrice)))
        assert.isTrue((await ideaToken.balanceOf(userAccount)).eq(new BN('0')))
        assert.isTrue((await ideaTokenExchange.getTradingFeePayable()).eq(firstTradingFeeInvested
                                                                          .add(secondTradingFeeInvested)
                                                                          .add(thirdTradingFeeInvested)
                                                                          .add(fourthTradingFeeInvested)
                                                                          .mul(thirdExchangeRate)
                                                                          .div(tenPow18)))
        assert.isTrue((await ideaTokenExchange.getPlatformFeePayable(marketID)).eq(firstPlatformFeeInvested
                                                                                   .add(secondPlatformFeeInvested)
                                                                                   .add(thirdPlatformFeeInvested)
                                                                                   .add(fourthPlatformFeeInvested)
                                                                                   .mul(thirdExchangeRate)
                                                                                   .div(tenPow18)))
    
        assert.isTrue((await ideaTokenExchange.getInterestPayable(ideaToken.address)).eq(thirdInterestPayable))
        const fourthExchangeRate = tenPow18.add(tenPow17.mul(new BN('4'))) // 1.4
        await cDai.setExchangeRate(fourthExchangeRate)

        const fourthInterestPayable = firstRawCost
                                      .add(secondRawCost.mul(tenPow18).div(firstExchangeRate))
                                      .sub(firstRawPrice.mul(tenPow18).div(secondExchangeRate))
                                      .sub(secondRawPrice.mul(tenPow18).div(thirdExchangeRate))
                                      .mul(fourthExchangeRate).div(tenPow18)
                                      .sub(firstRawCost.add(secondRawCost).sub(firstRawPrice).sub(secondRawPrice))

        assert.isTrue((await ideaTokenExchange.getInterestPayable(ideaToken.address)).eq(fourthInterestPayable))

        const finalPlatformFee = firstPlatformFeeInvested
                                 .add(secondPlatformFeeInvested)
                                 .add(thirdPlatformFeeInvested)
                                 .add(fourthPlatformFeeInvested)
                                 .mul(fourthExchangeRate)
                                 .div(tenPow18)

        assert.isTrue((await ideaTokenExchange.getPlatformFeePayable(marketID)).eq(finalPlatformFee))

        const finalTradingFee = firstTradingFeeInvested
                                .add(secondTradingFeeInvested)
                                .add(thirdTradingFeeInvested)
                                .add(fourthTradingFeeInvested)
                                .mul(fourthExchangeRate)
                                .div(tenPow18)

        assert.isTrue((await ideaTokenExchange.getTradingFeePayable()).eq(finalTradingFee))
    
        await ideaTokenExchange.authorizePlatformFeeWithdrawer(marketID,
                                                               platformFeeReceiverAccount,
                                                               { from: adminAccount })

        await ideaTokenExchange.withdrawPlatformFee(marketID, { from: platformFeeReceiverAccount })
        assert.isTrue((await dai.balanceOf(platformFeeReceiverAccount)).eq(finalPlatformFee))

        await ideaTokenExchange.authorizeInterestWithdrawer(ideaToken.address,
                                                            interestReceiverAccount,
                                                            { from: adminAccount })

        await ideaTokenExchange.withdrawInterest(ideaToken.address, { from: interestReceiverAccount })
        assert.isTrue((await dai.balanceOf(interestReceiverAccount)).eq(fourthInterestPayable))

        await ideaTokenExchange.withdrawTradingFee()
        assert.isTrue((await dai.balanceOf(tradingFeeAccount)).eq(finalTradingFee))
        assert.isTrue((await ideaTokenExchange.getTradingFeePayable()).eq(new BN('0')))
    })

    it('fail buy/sell - invalid token', async () => {
        await expectRevert(
            ideaTokenExchange.buyTokens(zeroAddress, tenPow18, tenPow18, userAccount),
            'buyTokens: token does not exist'
        )

        await expectRevert(
            ideaTokenExchange.sellTokens(zeroAddress, tenPow18, tenPow18, userAccount),
            'sellTokens: token does not exist'
        )
    })

    it('fail buy/sell - max cost / minPrice', async () => {
        const amount = tenPow18
        const cost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, tenPow18)

        await expectRevert(
            ideaTokenExchange.buyTokens(ideaToken.address, amount, cost.sub(new BN('1')), userAccount),
            'buyTokens: cost exceeds maxCost'
        )

        await dai.mint(userAccount, cost)
        await dai.approve(ideaTokenExchange.address, cost)
        await ideaTokenExchange.buyTokens(ideaToken.address, amount, cost, userAccount)

        const price = await ideaTokenExchange.getPriceForSellingTokens(ideaToken.address, tenPow18)

        await expectRevert(
            ideaTokenExchange.sellTokens(ideaToken.address, amount, price.add(new BN('1')), userAccount),
            'sellTokens: price subceeds min price'
        )
    })

    it('fail buy - not enough allowance', async () => {
        const amount = tenPow18
        const cost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, tenPow18)
        await dai.mint(userAccount, cost)

        await expectRevert(
            ideaTokenExchange.buyTokens(ideaToken.address, amount, cost, userAccount),
            'buyTokens: not enough allowance'
        )
    })

    it('fail buy/sell - not enough tokens', async () => {
        const amount = tenPow18
        const cost = await ideaTokenExchange.getCostForBuyingTokens(ideaToken.address, tenPow18)
        await dai.mint(userAccount, cost.sub(new BN('1')))
        await dai.approve(ideaTokenExchange.address, cost)

        await expectRevert(
            ideaTokenExchange.buyTokens(ideaToken.address, amount, cost, userAccount),
            'ERC20: transfer amount exceeds balance'
        )

        await dai.mint(adminAccount, new BN(cost))
        await dai.approve(ideaTokenExchange.address, cost, { from: adminAccount })
        await ideaTokenExchange.buyTokens(ideaToken.address, amount, cost, adminAccount, { from: adminAccount })

        await expectRevert(
            ideaTokenExchange.sellTokens(ideaToken.address, new BN('1'), new BN('0'), userAccount),
            'sellTokens: not enough tokens'
        )
    })

    it('no trading fee available', async () => {
        assert.isTrue((await ideaTokenExchange.getTradingFeePayable()).eq(new BN('0')))
        await ideaTokenExchange.withdrawTradingFee()
        assert.isTrue((await dai.balanceOf(tradingFeeAccount)).eq(new BN('0')))
    })

    it('no platform fee available', async () => {
        await ideaTokenExchange.authorizePlatformFeeWithdrawer(marketID,
                                                               platformFeeReceiverAccount,
                                                               { from: adminAccount })
        assert.isTrue((await ideaTokenExchange.getPlatformFeePayable(marketID)).eq(new BN('0')))
        await ideaTokenExchange.withdrawPlatformFee(marketID, { from: platformFeeReceiverAccount })
        assert.isTrue((await dai.balanceOf(platformFeeReceiverAccount)).eq(new BN('0')))
    })

    it('no interest available', async () => {
        await ideaTokenExchange.authorizeInterestWithdrawer(ideaToken.address,
                                                            interestReceiverAccount,
                                                            { from: adminAccount })
        assert.isTrue((await ideaTokenExchange.getInterestPayable(ideaToken.address)).eq(new BN('0')))
        await ideaTokenExchange.withdrawInterest(ideaToken.address, { from: interestReceiverAccount })
        assert.isTrue((await dai.balanceOf(interestReceiverAccount)).eq(new BN('0')))
    })

    it('fail authorize interest withdrawer not authorized', async () => {
        await expectRevert(
            ideaTokenExchange.authorizeInterestWithdrawer(ideaToken.address, interestReceiverAccount),
            'authorizeInterestWithdrawer: not authorized'
        )
    })

    it('fail withdraw interest not authorized', async () => {
        await expectRevert(
            ideaTokenExchange.withdrawInterest(ideaToken.address),
            'withdrawInterest: not authorized'
        )
    })

    it('fail withdraw platform fee not authorized', async () => {
        await expectRevert(
            ideaTokenExchange.withdrawPlatformFee(marketID),
            'withdrawPlatformFee: not authorized'
        )
    })

    it('fail authorize platform fee withdrawer not authorized', async () => {
        await expectRevert(
            ideaTokenExchange.authorizePlatformFeeWithdrawer(marketID, platformFeeReceiverAccount),
            'authorizePlatformFeeWithdrawer: not authorized'
        )
    })

    function getCostForCompletedIntervals(b, r, t, n) {
        return n.mul(t).mul(b.sub(r)).add(r.mul(t).mul(n.mul(n.add(new BN('1'))).div(new BN('2'))))
    }

    function getCostFromZeroSupply(b, r, t, amount) {
        const n = amount.div(t)
        return getCostForCompletedIntervals(b, r, t, n).add(amount.sub(n.mul(t)).mul(b.add(n.mul(r)))).div(tenPow18)
    }

    function getRawCostForBuyingTokens(b, r, t, supply, amount) {
        const costForSupply = getCostFromZeroSupply(b, r, t, supply)
        const costForSupplyPlusAmount = getCostFromZeroSupply(b, r, t, supply.add(amount))

        return costForSupplyPlusAmount.sub(costForSupply)
    }

    function getRawPriceForSellingTokens(b, r, t, supply, amount) {
        const costForSupply = getCostFromZeroSupply(b, r, t, supply)
        const costForSupplyMinusAmount = getCostFromZeroSupply(b, r, t, supply.sub(amount))

        return costForSupply.sub(costForSupplyMinusAmount)
    }

    async function getTradingFeeForBuying(token, amount) {
        const supply = await token.totalSupply()
        const rawCost = getRawCostForBuyingTokens(baseCost,
                                                  priceRise,
                                                  tokensPerInterval,
                                                  supply,
                                                  amount)

        return rawCost.mul(tradingFeeRate).div(feeScale)
    }

    async function getTradingFeeForSelling(token, amount) {
        const supply = await token.totalSupply()
        const rawPrice = getRawPriceForSellingTokens(baseCost,
                                                     priceRise,
                                                     tokensPerInterval,
                                                     supply,
                                                     amount)

        return rawPrice.mul(tradingFeeRate).div(feeScale)
    }

    async function getPlatformFeeForBuying(token, amount) {
        const supply = await token.totalSupply()
        const rawCost = getRawCostForBuyingTokens(baseCost,
                                                  priceRise,
                                                  tokensPerInterval,
                                                  supply,
                                                  amount)

        return rawCost.mul(platformFeeRate).div(feeScale)
    }

    async function getPlatformFeeForSelling(token, amount) {
        const supply = await token.totalSupply()
        const rawPrice = getRawPriceForSellingTokens(baseCost,
                                                     priceRise,
                                                     tokensPerInterval,
                                                     supply,
                                                     amount)

        return rawPrice.mul(platformFeeRate).div(feeScale)
    }

    async function getCostForBuyingTokens(token, amount) {
        const supply = await token.totalSupply()
        const rawCost = getRawCostForBuyingTokens(baseCost,
                                                  priceRise,
                                                  tokensPerInterval,
                                                  supply,
                                                  amount)

        const tradingFee = rawCost.mul(tradingFeeRate).div(feeScale)
        const platformFee = rawCost.mul(platformFeeRate).div(feeScale)

        return rawCost.add(tradingFee).add(platformFee)
    }

    async function getPriceForSellingTokens(token, amount) {
        const supply = await token.totalSupply()
        const rawPrice = getRawPriceForSellingTokens(baseCost,
                                                     priceRise,
                                                     tokensPerInterval,
                                                     supply,
                                                     amount)

        const tradingFee = rawPrice.mul(tradingFeeRate).div(feeScale)
        const platformFee = rawPrice.mul(platformFeeRate).div(feeScale)

        return rawPrice.sub(tradingFee).sub(platformFee)
    }
})