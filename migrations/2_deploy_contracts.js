const Remittance = artifacts.require("Remittance");

module.exports = (deployer => deployer.deploy(Remittance, 100000, 100));