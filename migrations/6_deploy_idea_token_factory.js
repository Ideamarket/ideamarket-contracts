const {
  saveDeployedAddress,
  loadDeployedAddress,
  deployProxy,
  saveDeployedABI,
} = require("./shared")

/* eslint-disable-next-line no-undef */
const IdeaTokenFactory = artifacts.require("IdeaTokenFactory")

module.exports = async function (deployer, network) {
  if (network != "kovan") {
    return
  }

  const [proxy, logic] = await deployProxy(
    IdeaTokenFactory,
    deployer,
    loadDeployedAddress(network, "proxyAdmin"),
    loadDeployedAddress(network, "dsPauseProxy"),
    loadDeployedAddress(network, "ideaTokenExchange")
  )

  saveDeployedAddress(network, "ideaTokenFactory", proxy)
  saveDeployedABI(network, "ideaTokenFactory", IdeaTokenFactory.abi)
  saveDeployedAddress(network, "ideaTokenFactoryLogic", logic)
}
