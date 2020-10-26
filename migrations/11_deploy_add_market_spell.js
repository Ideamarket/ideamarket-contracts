const { saveDeployedAddress, saveDeployedABI } = require("./shared")

/* eslint-disable-next-line no-undef */
const AddMarketSpell = artifacts.require("AddMarketSpell")

module.exports = async function (deployer, network) {
  if (network != "kovan") {
    return
  }

  await deployer.deploy(AddMarketSpell)

  saveDeployedAddress(network, "addMarketSpell", AddMarketSpell.address)
  saveDeployedABI(network, "addMarketSpell", AddMarketSpell.abi)
}
