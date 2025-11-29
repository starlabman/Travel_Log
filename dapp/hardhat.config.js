require("@nomiclabs/hardhat-ethers");
module.exports = {
  solidity: "0.8.17",
  networks: {
    sepolia: {
      url: "https://sepolia.infura.io/v3/YOUR_INFURA_KEY",
      accounts: ["0xYOUR_PRIVATE_KEY"]
    }
  }
};
