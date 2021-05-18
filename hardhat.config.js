require("@nomiclabs/hardhat-waffle");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  mocha: {
    timeout: 200000
  },
  networks: {
    hardhat: {
      forking: {
        url: `https://xdai-archive.blockscout.com`
        // url: `https://mainnet.infura.io/v3/800c1e376fd048228f96dc28348f2870`
      }
    }
  },
  solidity: "0.8.3",
};
