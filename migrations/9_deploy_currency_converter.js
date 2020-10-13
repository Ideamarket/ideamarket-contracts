const { externalContractAddresses, saveDeployedAddress, loadDeployedAddress } = require('./shared')

const CurrencyConverter = artifacts.require('CurrencyConverter')

module.exports = async function(deployer, network, accounts) {
    let externalAddresses

    if(network == 'kovan') {
        externalAddresses = externalContractAddresses.kovan
    } else {
        return
    }

    await deployer.deploy(CurrencyConverter,
                          loadDeployedAddress(network, 'ideaTokenExchange'),
                          externalAddresses.dai,
                          externalAddresses.uniswapV2Router02,
                          externalAddresses.weth)

    saveDeployedAddress(network, 'currencyConverter', CurrencyConverter.address)
}
