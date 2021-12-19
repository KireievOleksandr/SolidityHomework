const truffleAssert = require("truffle-assertions");
import { assert, web3, artifacts } from "hardhat";
const hre = require("hardhat");

const SpellToken = artifacts.require("SpellToken");
const SpellTokenICOProxy = artifacts.require("SpellTokenICOProxy");
const SpellTokenICOImplementationV1 = artifacts.require("SpellTokenICOImplementationV1");
const SpellTokenICOImplementationV2 = artifacts.require("SpellTokenICOImplementationV2");
const DAIMockToken = artifacts.require("DAIMockToken");

const bn1e18 = web3.utils.toBN(1e18);

const studentContractAddress = '0x0E822C71e628b20a35F8bCAbe8c11F274246e64D';
const chainLinkETHUSDRinkeby = '0x8A753747A1Fa494EC906cE90E9f37563A8AF630e';
const chainLinkDAIUSDRinkeby = '0x2bA49Aaa16E6afD2a993473cfB70Fa8559B523cF';
const nftSSUTokenAddress = '0x515Dcbe2cCF7d159CBc7C74DA99DeeD04F671725';
const addressWithNFT = '0x4ad9FCb2B437368ca228EE09B67A5B8f4495c963';

describe("SpellTokenICO", () => {
    let accounts: string[];
    let owner: any;
    let payer: any;
    let payerWithoutNFT: any;
    let tokenInstance: any;
    let implementationInstance: any;
    let proxyContractInstance: any;
    let contractInstance: any;
    let daiTokenInstance: any;

    const paymentAmount = bn1e18.muln(1);

    beforeEach(async function () {
        accounts = await web3.eth.getAccounts();
        owner = accounts[0];
        payer = addressWithNFT;
        payerWithoutNFT = accounts[1];
        await hre.network.provider.request({
            method: "hardhat_impersonateAccount",
            params: [addressWithNFT],
        });
        await hre.network.provider.request({
            method: "hardhat_setBalance",
            params: [addressWithNFT, web3.utils.numberToHex(bn1e18.mul(web3.utils.toBN(1000)).toString())],
        });
        
        tokenInstance = await SpellToken.new("Spell Token", "SPELL", "1000000000000000000000000000");
        daiTokenInstance = await DAIMockToken.new(web3.utils.toWei(web3.utils.toBN(1000)));
        implementationInstance = await SpellTokenICOImplementationV2.new();
        proxyContractInstance = await SpellTokenICOProxy.new(implementationInstance.address, tokenInstance.address, daiTokenInstance.address, studentContractAddress, chainLinkETHUSDRinkeby, chainLinkDAIUSDRinkeby, nftSSUTokenAddress);
        contractInstance = await new web3.eth.Contract(implementationInstance.abi, proxyContractInstance.address);
        await tokenInstance.transfer(proxyContractInstance.address, web3.utils.toBN(1000).mul(bn1e18));
    });

    describe("buyForETH", function() {
        it("Should buy tokens for ETH successfully with buyForETH", async () => {
            const payerTokenBalanceBefore = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceBefore = await tokenInstance.balanceOf(proxyContractInstance.address);

            await contractInstance.methods.buyForETH().send({ from: payer, value: paymentAmount });

            const payerTokenBalanceAfter = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceAfter = await tokenInstance.balanceOf(proxyContractInstance.address);

            assert.notEqual(web3.utils.toBN(0), contractTokenBalanceBefore.sub(contractTokenBalanceAfter));
            assert.equal(true, contractTokenBalanceBefore.sub(contractTokenBalanceAfter).eq(payerTokenBalanceAfter.sub(payerTokenBalanceBefore)));
        });

        it("Should buy tokens for ETH successfully with receive", async () => {
            const payerTokenBalanceBefore = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceBefore = await tokenInstance.balanceOf(proxyContractInstance.address);

            await proxyContractInstance.sendTransaction( { from: payer, value: paymentAmount } );

            const payerTokenBalanceAfter = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceAfter = await tokenInstance.balanceOf(proxyContractInstance.address);

            assert.notEqual(web3.utils.toBN(0), contractTokenBalanceBefore.sub(contractTokenBalanceAfter));
            assert.equal(true, contractTokenBalanceBefore.sub(contractTokenBalanceAfter).eq(payerTokenBalanceAfter.sub(payerTokenBalanceBefore)));
        });

        it("Should buy tokens for ETH successfully with fallback", async () => {
            const payerTokenBalanceBefore = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceBefore = await tokenInstance.balanceOf(proxyContractInstance.address);

            await proxyContractInstance.sendTransaction( { from: payer, value: paymentAmount, data: "0x1234567890" } );

            const payerTokenBalanceAfter = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceAfter = await tokenInstance.balanceOf(proxyContractInstance.address);

            assert.notEqual(web3.utils.toBN(0), contractTokenBalanceBefore.sub(contractTokenBalanceAfter));
            assert.equal(true, contractTokenBalanceBefore.sub(contractTokenBalanceAfter).eq(payerTokenBalanceAfter.sub(payerTokenBalanceBefore)));
        });

        it("Should not be able to buy tokens due zero ETH send", async () => {
            const payerTokenBalanceBefore = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceBefore = await tokenInstance.balanceOf(proxyContractInstance.address);

            await proxyContractInstance.sendTransaction( { from: payer, value: 0 } );

            const payerTokenBalanceAfter = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceAfter = await tokenInstance.balanceOf(proxyContractInstance.address);

            assert.equal(true, payerTokenBalanceBefore.eq(payerTokenBalanceAfter));
            assert.equal(true, contractTokenBalanceBefore.eq(contractTokenBalanceAfter));
        });

        it("Should not be able to buy tokens due not enough tokens on contract balance", async () => {
            const payerEthBalanceBefore = web3.utils.toBN(await web3.eth.getBalance(payer));
            const payerTokenBalanceBefore = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceBefore = await tokenInstance.balanceOf(proxyContractInstance.address);

            const result = await proxyContractInstance.sendTransaction( { from: payer, value: paymentAmount.mul(web3.utils.toBN(20)) } );
            const transaction = await web3.eth.getTransaction(result.tx);
            const txFee = web3.utils.toBN(result.receipt.gasUsed).mul(web3.utils.toBN(transaction.gasPrice));

            const payerEthBalanceAfter = web3.utils.toBN(await web3.eth.getBalance(payer));
            const payerTokenBalanceAfter = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceAfter = await tokenInstance.balanceOf(proxyContractInstance.address);

            assert.equal(true, txFee.eq(payerEthBalanceBefore.sub(payerEthBalanceAfter)));
            assert.equal(true, payerTokenBalanceBefore.eq(payerTokenBalanceAfter));
            assert.equal(true, contractTokenBalanceBefore.eq(contractTokenBalanceAfter));        
        });

        it("Should not be able to buy tokens due to no special NFT", async () => {
            const payerTokenBalanceBefore = await tokenInstance.balanceOf(payerWithoutNFT);
            const contractTokenBalanceBefore = await tokenInstance.balanceOf(proxyContractInstance.address);

            await proxyContractInstance.sendTransaction( { from: payerWithoutNFT, value: 1000 } );

            const payerTokenBalanceAfter = await tokenInstance.balanceOf(payerWithoutNFT);
            const contractTokenBalanceAfter = await tokenInstance.balanceOf(proxyContractInstance.address);

            assert.equal(true, payerTokenBalanceBefore.eq(payerTokenBalanceAfter));
            assert.equal(true, contractTokenBalanceBefore.eq(contractTokenBalanceAfter));
        });    
    });
    
    describe("buyForDAI", function() {
        it("Should buy tokens for DAI successfully", async () => {
            await daiTokenInstance.transfer(payer, web3.utils.toBN(1000).mul(bn1e18));
            await daiTokenInstance.approve(proxyContractInstance.address, web3.utils.toBN(1000).mul(bn1e18), { from: payer });

            const payerDAIBalanceBefore = await daiTokenInstance.balanceOf(payer);
            const contractDAIBalanceBefore = await daiTokenInstance.balanceOf(proxyContractInstance.address);
            const payerTokenBalanceBefore = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceBefore = await tokenInstance.balanceOf(proxyContractInstance.address);

            const daiAmount = web3.utils.toBN(10).mul(bn1e18);
            await contractInstance.methods.buyForDAI(daiAmount).send({ from: payer });

            const payerDAIBalanceAfter = await daiTokenInstance.balanceOf(payer);
            const contractDAIBalanceAfter = await daiTokenInstance.balanceOf(proxyContractInstance.address);
            const payerTokenBalanceAfter = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceAfter = await tokenInstance.balanceOf(proxyContractInstance.address);

            assert.equal(true, payerDAIBalanceAfter.eq(payerDAIBalanceBefore.sub(daiAmount)));
            assert.equal(true, contractDAIBalanceAfter.eq(contractDAIBalanceBefore.add(daiAmount)));
            assert.equal(true, payerTokenBalanceAfter.eq(payerTokenBalanceBefore.add(contractTokenBalanceBefore.sub(contractTokenBalanceAfter))));
        });

        it("Should not be able to buy tokens for DAI due no allowance", async () => {
            const ownerDAIBalanceBefore = await daiTokenInstance.balanceOf(owner);
            const contractDAIBalanceBefore = await daiTokenInstance.balanceOf(proxyContractInstance.address);
            const ownerTokenBalanceBefore = await tokenInstance.balanceOf(owner);
            const contractTokenBalanceBefore = await tokenInstance.balanceOf(proxyContractInstance.address);

            const daiAmount = web3.utils.toBN(10).mul(bn1e18);
            await contractInstance.methods.buyForDAI(daiAmount).send({ from: owner });

            const ownerDAIBalanceAfter = await daiTokenInstance.balanceOf(owner);
            const contractDAIBalanceAfter = await daiTokenInstance.balanceOf(proxyContractInstance.address);
            const ownerTokenBalanceAfter = await tokenInstance.balanceOf(owner);
            const contractTokenBalanceAfter = await tokenInstance.balanceOf(proxyContractInstance.address);
            
            assert.equal(true, ownerDAIBalanceAfter.eq(ownerDAIBalanceBefore));
            assert.equal(true, contractDAIBalanceAfter.eq(contractDAIBalanceBefore));
            assert.equal(true, ownerTokenBalanceAfter.eq(ownerTokenBalanceBefore));
            assert.equal(true, contractTokenBalanceAfter.eq(contractTokenBalanceBefore));
        });

        it("Should not be able to buy tokens for DAI due to zero DAI amount", async () => {
            const ownerDAIBalanceBefore = await daiTokenInstance.balanceOf(owner);
            const contractDAIBalanceBefore = await daiTokenInstance.balanceOf(proxyContractInstance.address);
            const ownerTokenBalanceBefore = await tokenInstance.balanceOf(owner);
            const contractTokenBalanceBefore = await tokenInstance.balanceOf(proxyContractInstance.address);

            contractInstance.methods.buyForDAI(0).send({ from: owner });

            const ownerDAIBalanceAfter = await daiTokenInstance.balanceOf(owner);
            const contractDAIBalanceAfter = await daiTokenInstance.balanceOf(proxyContractInstance.address);
            const ownerTokenBalanceAfter = await tokenInstance.balanceOf(owner);
            const contractTokenBalanceAfter = await tokenInstance.balanceOf(proxyContractInstance.address);

            assert.equal(true, ownerDAIBalanceAfter.eq(ownerDAIBalanceBefore));
            assert.equal(true, contractDAIBalanceAfter.eq(contractDAIBalanceBefore));
            assert.equal(true, ownerTokenBalanceAfter.eq(ownerTokenBalanceBefore));
            assert.equal(true, contractTokenBalanceAfter.eq(contractTokenBalanceBefore));
        });

        it("Should not be able to buy tokens for DAI due to no special NFT", async () => {
            await daiTokenInstance.approve(proxyContractInstance.address, web3.utils.toBN(1000).mul(bn1e18), { from: payerWithoutNFT });

            const payerDAIBalanceBefore = await daiTokenInstance.balanceOf(payerWithoutNFT);
            const contractDAIBalanceBefore = await daiTokenInstance.balanceOf(proxyContractInstance.address);
            const payerTokenBalanceBefore = await tokenInstance.balanceOf(payerWithoutNFT);
            const contractTokenBalanceBefore = await tokenInstance.balanceOf(proxyContractInstance.address);

            const daiAmount = web3.utils.toBN(10).mul(bn1e18);
            await contractInstance.methods.buyForDAI(daiAmount).send({ from: payerWithoutNFT });

            const payerDAIBalanceAfter = await daiTokenInstance.balanceOf(payerWithoutNFT);
            const contractDAIBalanceAfter = await daiTokenInstance.balanceOf(proxyContractInstance.address);
            const payerTokenBalanceAfter = await tokenInstance.balanceOf(payerWithoutNFT);
            const contractTokenBalanceAfter = await tokenInstance.balanceOf(proxyContractInstance.address);

            assert.equal(true, payerDAIBalanceAfter.eq(payerDAIBalanceBefore));
            assert.equal(true, contractDAIBalanceAfter.eq(contractDAIBalanceBefore));
            assert.equal(true, payerTokenBalanceAfter.eq(payerTokenBalanceBefore));
            assert.equal(true, contractTokenBalanceAfter.eq(contractTokenBalanceBefore));
        });

    });

    describe("returnETH", function() {
        it("Should return ETH to contract owner", async () => {
            const contractEthBalanceBefore = web3.utils.toBN(await web3.eth.getBalance(proxyContractInstance.address));
            await proxyContractInstance.sendTransaction( { from: payer, value: paymentAmount } );

            const contractEthBalanceAfter = web3.utils.toBN(await web3.eth.getBalance(proxyContractInstance.address));
            const ownerEthBalanceBefore = web3.utils.toBN(await web3.eth.getBalance(owner));

            const result = await contractInstance.methods.returnETH().send({ from: owner });

            const transaction = await web3.eth.getTransaction(result.transactionHash);
            const txFee = web3.utils.toBN(result.gasUsed).mul(web3.utils.toBN(transaction.gasPrice));
            const ownerEthBalanceAfter = web3.utils.toBN(await web3.eth.getBalance(owner));
            const contractEthBalanceAfterReturnEth = web3.utils.toBN(await web3.eth.getBalance(proxyContractInstance.address));

            assert.equal(true, paymentAmount.eq(contractEthBalanceAfter.sub(contractEthBalanceBefore)));
            assert.equal(true, web3.utils.toBN(0).eq(contractEthBalanceAfterReturnEth));
            assert.equal(true, ownerEthBalanceAfter.eq(ownerEthBalanceBefore.add(paymentAmount).sub(txFee)));
        });

        it("Should not return ETH to non-owner", async () => {

            await proxyContractInstance.sendTransaction( { from: payer, value: paymentAmount } );
            const contractEthBalanceAfter = web3.utils.toBN(await web3.eth.getBalance(proxyContractInstance.address));

            await contractInstance.methods.returnETH().send( { from: payer } );

            const contractEthBalanceAfterReturnEth = web3.utils.toBN(await web3.eth.getBalance(proxyContractInstance.address));
            assert.equal(true, contractEthBalanceAfter.eq(contractEthBalanceAfterReturnEth));
        });

    });

    describe("returnDAI", function() {
        it("Should return DAI to contract owner", async () => {
            const daiAmount = web3.utils.toBN(10).mul(bn1e18);            
            await daiTokenInstance.transfer( proxyContractInstance.address, daiAmount);

            const ownerDAIBalanceBefore = await daiTokenInstance.balanceOf(owner);
            const contractDAIBalanceBefore = await daiTokenInstance.balanceOf(proxyContractInstance.address);

            await contractInstance.methods.returnDAI().send( { from: owner } );

            const ownerDAIBalanceAfter = await daiTokenInstance.balanceOf(owner);
            const contractDAIBalanceAfter = await daiTokenInstance.balanceOf(proxyContractInstance.address);            

            assert.equal(true, web3.utils.toBN(0).eq(contractDAIBalanceAfter));
            assert.equal(true, ownerDAIBalanceAfter.eq(ownerDAIBalanceBefore.add(contractDAIBalanceBefore.sub(contractDAIBalanceAfter))));
        });

        it("Should not return DAI to non-owner", async () => {
            const daiAmount = web3.utils.toBN(10).mul(bn1e18);            
            await daiTokenInstance.transfer( proxyContractInstance.address, daiAmount);

            const payerDAIBalanceBefore = await daiTokenInstance.balanceOf(payer);
            const contractDAIBalanceBefore = await daiTokenInstance.balanceOf(proxyContractInstance.address);

            await contractInstance.methods.returnDAI().send( { from: payer } );

            const payerDAIBalanceAfter = await daiTokenInstance.balanceOf(payer);
            const contractDAIBalanceAfter = await daiTokenInstance.balanceOf(proxyContractInstance.address);            

            assert.equal(true, payerDAIBalanceAfter.eq(payerDAIBalanceBefore));
            assert.equal(true, contractDAIBalanceAfter.eq(contractDAIBalanceBefore));
        });

    });

    describe("changeImplementation", function() {
        it("Should set initial implementation as version 1", async () => {
            const implementationInstanceV1 = await SpellTokenICOImplementationV1.new();
            proxyContractInstance = await SpellTokenICOProxy.new(implementationInstanceV1.address, tokenInstance.address, daiTokenInstance.address, studentContractAddress, chainLinkETHUSDRinkeby, chainLinkDAIUSDRinkeby, nftSSUTokenAddress);

            const actualImplementationAddress = await proxyContractInstance.implementation();
            const actualImplementationVersion = await proxyContractInstance.version();

            assert.equal(true, implementationInstanceV1.address == actualImplementationAddress);
            assert.equal(true, actualImplementationVersion.toString() === "1");
        });

        it("Should let owner to upgrade implementation", async () => {
            const implementationInstanceV1 = await SpellTokenICOImplementationV1.new();
            const implementationInstanceV2 = await SpellTokenICOImplementationV2.new();
            proxyContractInstance = await SpellTokenICOProxy.new(implementationInstanceV1.address, tokenInstance.address, daiTokenInstance.address, studentContractAddress, chainLinkETHUSDRinkeby, chainLinkDAIUSDRinkeby, nftSSUTokenAddress);

            await proxyContractInstance.changeImplementation(implementationInstanceV2.address, 2);

            const actualImplementationAddress = await proxyContractInstance.implementation();
            const actualImplementationVersion = await proxyContractInstance.version();

            assert.equal(true, implementationInstanceV2.address == actualImplementationAddress);
            assert.equal(true, actualImplementationVersion.toString() === "2");
        });

        it("Should not let non-owner to upgrade implementation", async () => {
            const implementationInstanceV1 = await SpellTokenICOImplementationV1.new();
            const implementationInstanceV2 = await SpellTokenICOImplementationV2.new();
            proxyContractInstance = await SpellTokenICOProxy.new(implementationInstanceV1.address, tokenInstance.address, daiTokenInstance.address, studentContractAddress, chainLinkETHUSDRinkeby, chainLinkDAIUSDRinkeby, nftSSUTokenAddress);

            await truffleAssert.reverts(
                proxyContractInstance.changeImplementation(implementationInstanceV2.address, 2, {from: payer}),
                "Only owner is allowed to update implementation"
            );

            const actualImplementationAddress = await proxyContractInstance.implementation();
            const actualImplementationVersion = await proxyContractInstance.version();
            
            assert.equal(true, implementationInstanceV1.address == actualImplementationAddress);
            assert.equal(true, actualImplementationVersion.toString() === "1");
        });

        it("Should not let upgrading implementation with non consecutive version", async () => {
            const implementationInstanceV1 = await SpellTokenICOImplementationV1.new();
            const implementationInstanceV2 = await SpellTokenICOImplementationV2.new();
            proxyContractInstance = await SpellTokenICOProxy.new(implementationInstanceV1.address, tokenInstance.address, daiTokenInstance.address, studentContractAddress, chainLinkETHUSDRinkeby, chainLinkDAIUSDRinkeby, nftSSUTokenAddress);

            await truffleAssert.reverts(
                proxyContractInstance.changeImplementation(implementationInstanceV2.address, 1),
                "New version must be greater then previous"
            );

            const actualImplementationAddress = await proxyContractInstance.implementation();
            const actualImplementationVersion = await proxyContractInstance.version();
            
            assert.equal(true, implementationInstanceV1.address == actualImplementationAddress);
            assert.equal(true, actualImplementationVersion.toString() === "1");
        });

    });    

});