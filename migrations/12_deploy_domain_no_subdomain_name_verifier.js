const { saveDeployedAddress, saveDeployedABI } = require("./shared")

/* eslint-disable-next-line no-undef */
const DomainNoSubdomainNameVerifier = artifacts.require(
  "DomainNoSubdomainNameVerifier"
)

module.exports = async function (deployer, network) {
  if (network != "kovan") {
    return
  }

  await deployer.deploy(DomainNoSubdomainNameVerifier)

  saveDeployedAddress(
    network,
    "domainNoSubdomainNameVerifier",
    DomainNoSubdomainNameVerifier.address
  )
  saveDeployedABI(
    network,
    "domainNoSubdomainNameVerifier",
    DomainNoSubdomainNameVerifier.abi
  )
}
