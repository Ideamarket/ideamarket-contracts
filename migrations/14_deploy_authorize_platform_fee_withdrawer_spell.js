const { saveDeployedAddress, saveDeployedABI } = require("./shared")

/* eslint-disable-next-line no-undef */
const AuthorizePlatformFeeWithdrawerSpell = artifacts.require(
  "AuthorizePlatformFeeWithdrawerSpell"
)

module.exports = async function (deployer, network) {
  if (network != "kovan") {
    return
  }

  await deployer.deploy(AuthorizePlatformFeeWithdrawerSpell)

  saveDeployedAddress(
    network,
    "authorizePlatformFeeWithdrawerSpell",
    AuthorizePlatformFeeWithdrawerSpell.address
  )
  saveDeployedABI(
    network,
    "authorizePlatformFeeWithdrawerSpell",
    AuthorizePlatformFeeWithdrawerSpell.abi
  )
}
