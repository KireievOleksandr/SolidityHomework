const SpellTokenICO = artifacts.require("SpellTokenICO");
const tokenAddress = '0x15B5B9CEDad6d2A5724392f4897EaB1e297a2838';
const daiTokenAddress = '0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea';
const studentContractAddress = '0x0E822C71e628b20a35F8bCAbe8c11F274246e64D';
const chainLinkETHUSDRinkeby = '0x8A753747A1Fa494EC906cE90E9f37563A8AF630e';
const chainLinkDAIUSDRinkeby = '0x2bA49Aaa16E6afD2a993473cfB70Fa8559B523cF';

module.exports = function (deployer) {
   deployer.deploy(SpellTokenICO, tokenAddress, daiTokenAddress, studentContractAddress, chainLinkETHUSDRinkeby, chainLinkDAIUSDRinkeby);
};
