const {
  externalContractAddresses,
  saveDeployedAddress,
  loadDeployedAddress,
  deployProxy,
  saveDeployedABI,
} = require("./shared")

/* eslint-disable-next-line no-undef */
const IdeaTokenExchange = artifacts.require("IdeaTokenExchange")

module.exports = async function (deployer, network, accounts) {
  let externalAddresses

  if (network == "kovan") {
    externalAddresses = externalContractAddresses.kovan
  } else {
    return
  }

  const [proxy, logic] = await deployProxy(
    IdeaTokenExchange,
    deployer,
    loadDeployedAddress(network, "proxyAdmin"),
    accounts[0], // owner - this will be changed to the Timelock later
    externalAddresses.authorizer,
    externalAddresses.multisig,
    loadDeployedAddress(network, "interestManager"),
    externalAddresses.dai
  )

  saveDeployedAddress(network, "ideaTokenExchange", proxy)
  saveDeployedABI(network, "ideaTokenExchange", IdeaTokenExchange.abi)
  saveDeployedAddress(network, "ideaTokenExchangeLogic", logic)
}
