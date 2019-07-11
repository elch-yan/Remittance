module.exports = {
    compilers: {
        solc: {
          version: "0.5.5",
        },
      },
      networks: {
        ganache: {
          host: "localhost",
          port: 8545,
          network_id: "*"
        },
        net42: {
          host: "localhost",
          port: 8545,
          gas: 5000000,
          network_id: "42"
        },
        ropsten: {
          host: "localhost",
          port: 8545,
          network_id: 3
        }
      }
}