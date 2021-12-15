const SpellTokenICO = artifacts.require("SpellTokenICO");
const SpellTokenICOProxy = artifacts.require("SpellTokenICOProxy");
const SpellTokenICOImplementationV1 = artifacts.require("SpellTokenICOImplementationV1");
const SpellTokenICOImplementationV2 = artifacts.require("SpellTokenICOImplementationV2");
const tokenAddress = '0x15B5B9CEDad6d2A5724392f4897EaB1e297a2838';
const daiTokenAddress = '0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea';
const studentContractAddress = '0x0E822C71e628b20a35F8bCAbe8c11F274246e64D';
const chainLinkETHUSDRinkeby = '0x8A753747A1Fa494EC906cE90E9f37563A8AF630e';
const chainLinkDAIUSDRinkeby = '0x2bA49Aaa16E6afD2a993473cfB70Fa8559B523cF';
const nftSSUTokenAddress = '0x515Dcbe2cCF7d159CBc7C74DA99DeeD04F671725';

module.exports = function (deployer) {
   /* Original deployment with no Proxy */
   // deployer.deploy(SpellTokenICO, tokenAddress, daiTokenAddress, studentContractAddress, chainLinkETHUSDRinkeby, chainLinkDAIUSDRinkeby, nftSSUTokenAddress);

   /* Deployment for ImplementationV1 and Proxy using ImplementationV1 */
   // deployer.deploy(SpellTokenICOImplementationV1).then( async () => {
   //    let instanceV1 = await SpellTokenICOImplementationV1.deployed();
   //    return deployer.deploy(
   //       SpellTokenICOProxy,
   //       instanceV1.address,
   //       tokenAddress,
   //       daiTokenAddress,
   //       studentContractAddress,
   //       chainLinkETHUSDRinkeby,
   //       chainLinkDAIUSDRinkeby,
   //       nftSSUTokenAddress
   //    );
   // });

   /* Deployment for ImplementationV2 */
   deployer.deploy(SpellTokenICOImplementationV2);

};