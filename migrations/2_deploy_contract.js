const SpellToken = artifacts.require("SpellToken");
const SpellTokenICO = artifacts.require("SpellTokenICO");
// Rinkeby
// const tokenAddress = '0x15B5B9CEDad6d2A5724392f4897EaB1e297a2838';
// const daiTokenAddress = '0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea';
// const studentContractAddress = '0x0E822C71e628b20a35F8bCAbe8c11F274246e64D';
// const chainLinkETHUSD = '0x8A753747A1Fa494EC906cE90E9f37563A8AF630e';
// const chainLinkDAIUSD = '0x2bA49Aaa16E6afD2a993473cfB70Fa8559B523cF';
// const nftSSUTokenAddress = '0x515Dcbe2cCF7d159CBc7C74DA99DeeD04F671725';

// Kovan
const tokenAddress = '0xcE4103296fc81f99Eb44EC9E8846DbB096B45D09';
const daiTokenAddress = '0x4F96Fe3b7A6Cf9725f59d353F723c1bDb64CA6Aa';
const studentContractAddress = '0x0E822C71e628b20a35F8bCAbe8c11F274246e64D';
const chainLinkETHUSD = '0x0c15Ab9A0DB086e062194c273CC79f41597Bbf13';
const chainLinkDAIUSD = '0x777A68032a88E5A84678A77Af2CD65A7b3c0775a';
const nftSSUTokenAddress = '0x515Dcbe2cCF7d159CBc7C74DA99DeeD04F671725';

module.exports = function (deployer) {
   // deployer.deploy(SpellToken, 'Spell Token', 'SPELL', '1000000000000000000000000000');
   deployer.deploy(SpellTokenICO, tokenAddress, daiTokenAddress, studentContractAddress, chainLinkETHUSD, chainLinkDAIUSD, nftSSUTokenAddress);
};
