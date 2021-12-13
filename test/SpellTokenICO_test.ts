const truffleAssert = require("truffle-assertions");
import { assert, web3, artifacts } from "hardhat";

const SpellToken = artifacts.require("SpellToken");
const SpellTokenICO = artifacts.require("SpellTokenICO");
const DAIMockToken = artifacts.require("DAIMockToken");

const bn1e18 = web3.utils.toBN(1e18);

const studentContractAddress = '0x0E822C71e628b20a35F8bCAbe8c11F274246e64D';
const chainLinkETHUSDRinkeby = '0x8A753747A1Fa494EC906cE90E9f37563A8AF630e';
const chainLinkDAIUSDRinkeby = '0x2bA49Aaa16E6afD2a993473cfB70Fa8559B523cF';

describe("SpellTokenICO", () => {
    let accounts: string[];
    let owner: any;
    let payer: any;
    let tokenInstance: any;
    let contractInstance: any;
    let daiTokenInstance: any;

    const paymentAmount = bn1e18.muln(1);

    beforeEach(async function () {
        accounts = await web3.eth.getAccounts();
        owner = accounts[0];
        payer = accounts[1];
        tokenInstance = await SpellToken.new("Spell Token", "SPELL", "1000000000000000000000000000");
        daiTokenInstance = await DAIMockToken.new(web3.utils.toWei(web3.utils.toBN(1000)));
        contractInstance = await SpellTokenICO.new(tokenInstance.address, daiTokenInstance.address, studentContractAddress, chainLinkETHUSDRinkeby, chainLinkDAIUSDRinkeby);
        tokenInstance.transfer(contractInstance.address, web3.utils.toBN(1000).mul(bn1e18));
    });

    describe("buyForETH", function() {
        it("Should buy tokens for ETH successfully with receive", async () => {
            const payerTokenBalanceBefore = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceBefore = await tokenInstance.balanceOf(contractInstance.address);

            await contractInstance.sendTransaction( { from: payer, value: paymentAmount } );

            const payerTokenBalanceAfter = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceAfter = await tokenInstance.balanceOf(contractInstance.address);

            assert.notEqual(web3.utils.toBN(0), contractTokenBalanceBefore.sub(contractTokenBalanceAfter));
            assert.equal(true, contractTokenBalanceBefore.sub(contractTokenBalanceAfter).eq(payerTokenBalanceAfter.sub(payerTokenBalanceBefore)));
        });

        it("Should buy tokens for ETH successfully with fallback", async () => {
            const payerTokenBalanceBefore = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceBefore = await tokenInstance.balanceOf(contractInstance.address);

            await contractInstance.sendTransaction( { from: payer, value: paymentAmount, data: "0x1234567890" } );

            const payerTokenBalanceAfter = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceAfter = await tokenInstance.balanceOf(contractInstance.address);

            assert.notEqual(web3.utils.toBN(0), contractTokenBalanceBefore.sub(contractTokenBalanceAfter));
            assert.equal(true, contractTokenBalanceBefore.sub(contractTokenBalanceAfter).eq(payerTokenBalanceAfter.sub(payerTokenBalanceBefore)));
        });        

        it("Should not be able to buy tokens due zero ETH send", async () => {
            const payerTokenBalanceBefore = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceBefore = await tokenInstance.balanceOf(contractInstance.address);

            await truffleAssert.reverts(
                contractInstance.sendTransaction( { from: payer, value: 0 } ),
                "Send ETH to buy some tokens"
            );

            const payerTokenBalanceAfter = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceAfter = await tokenInstance.balanceOf(contractInstance.address);

            assert.equal(true, payerTokenBalanceBefore.eq(payerTokenBalanceAfter));
            assert.equal(true, contractTokenBalanceBefore.eq(contractTokenBalanceAfter));
        });

        it("Should not be able to buy tokens due not enough tokens on contract balance", async () => {
            const payerEthBalanceBefore = web3.utils.toBN(await web3.eth.getBalance(payer));
            const payerTokenBalanceBefore = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceBefore = await tokenInstance.balanceOf(contractInstance.address);

            const result = await contractInstance.sendTransaction( { from: payer, value: paymentAmount.mul(web3.utils.toBN(20)) } );
            const transaction = await web3.eth.getTransaction(result.tx);
            const txFee = web3.utils.toBN(result.receipt.gasUsed).mul(web3.utils.toBN(transaction.gasPrice));

            const payerEthBalanceAfter = web3.utils.toBN(await web3.eth.getBalance(payer));
            const payerTokenBalanceAfter = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceAfter = await tokenInstance.balanceOf(contractInstance.address);

            assert.equal(true, txFee.eq(payerEthBalanceBefore.sub(payerEthBalanceAfter)));
            assert.equal(true, payerTokenBalanceBefore.eq(payerTokenBalanceAfter));
            assert.equal(true, contractTokenBalanceBefore.eq(contractTokenBalanceAfter));        
        });
    });
    
    describe("buyForDAI", function() {
        it("Should buy tokens for DAI successfully", async () => {
            await daiTokenInstance.approve(contractInstance.address, web3.utils.toBN(1000).mul(bn1e18));

            const ownerDAIBalanceBefore = await daiTokenInstance.balanceOf(owner);
            const contractDAIBalanceBefore = await daiTokenInstance.balanceOf(contractInstance.address);
            const ownerTokenBalanceBefore = await tokenInstance.balanceOf(owner);
            const contractTokenBalanceBefore = await tokenInstance.balanceOf(contractInstance.address);

            const daiAmount = web3.utils.toBN(10).mul(bn1e18);
            await contractInstance.buyForDAI(daiAmount);

            const ownerDAIBalanceAfter = await daiTokenInstance.balanceOf(owner);
            const contractDAIBalanceAfter = await daiTokenInstance.balanceOf(contractInstance.address);
            const ownerTokenBalanceAfter = await tokenInstance.balanceOf(owner);
            const contractTokenBalanceAfter = await tokenInstance.balanceOf(contractInstance.address);

            assert.equal(true, ownerDAIBalanceAfter.eq(ownerDAIBalanceBefore.sub(daiAmount)));
            assert.equal(true, contractDAIBalanceAfter.eq(contractDAIBalanceBefore.add(daiAmount)));
            assert.equal(true, ownerTokenBalanceAfter.eq(ownerTokenBalanceBefore.add(contractTokenBalanceBefore.sub(contractTokenBalanceAfter))));
        });

        it("Should not be able to buy tokens for DAI due no allowance", async () => {
            const ownerDAIBalanceBefore = await daiTokenInstance.balanceOf(owner);
            const contractDAIBalanceBefore = await daiTokenInstance.balanceOf(contractInstance.address);
            const ownerTokenBalanceBefore = await tokenInstance.balanceOf(owner);
            const contractTokenBalanceBefore = await tokenInstance.balanceOf(contractInstance.address);

            const daiAmount = web3.utils.toBN(10).mul(bn1e18);
            await truffleAssert.reverts(
                contractInstance.buyForDAI(daiAmount),
                "Spending DAI is not allowed"
            );

            const ownerDAIBalanceAfter = await daiTokenInstance.balanceOf(owner);
            const contractDAIBalanceAfter = await daiTokenInstance.balanceOf(contractInstance.address);
            const ownerTokenBalanceAfter = await tokenInstance.balanceOf(owner);
            const contractTokenBalanceAfter = await tokenInstance.balanceOf(contractInstance.address);
            
            assert.equal(true, ownerDAIBalanceAfter.eq(ownerDAIBalanceBefore));
            assert.equal(true, contractDAIBalanceAfter.eq(contractDAIBalanceBefore));
            assert.equal(true, ownerTokenBalanceAfter.eq(ownerTokenBalanceBefore));
            assert.equal(true, contractTokenBalanceAfter.eq(contractTokenBalanceBefore));
        });

        it("Should not be able to buy tokens for DAI due to zero DAI amount", async () => {
            const ownerDAIBalanceBefore = await daiTokenInstance.balanceOf(owner);
            const contractDAIBalanceBefore = await daiTokenInstance.balanceOf(contractInstance.address);
            const ownerTokenBalanceBefore = await tokenInstance.balanceOf(owner);
            const contractTokenBalanceBefore = await tokenInstance.balanceOf(contractInstance.address);

            await truffleAssert.reverts(
                contractInstance.buyForDAI(0),
                "Non-zero DAI amount is required"
            );

            const ownerDAIBalanceAfter = await daiTokenInstance.balanceOf(owner);
            const contractDAIBalanceAfter = await daiTokenInstance.balanceOf(contractInstance.address);
            const ownerTokenBalanceAfter = await tokenInstance.balanceOf(owner);
            const contractTokenBalanceAfter = await tokenInstance.balanceOf(contractInstance.address);

            assert.equal(true, ownerDAIBalanceAfter.eq(ownerDAIBalanceBefore));
            assert.equal(true, contractDAIBalanceAfter.eq(contractDAIBalanceBefore));
            assert.equal(true, ownerTokenBalanceAfter.eq(ownerTokenBalanceBefore));
            assert.equal(true, contractTokenBalanceAfter.eq(contractTokenBalanceBefore));
        });

    });

    describe("returnETH", function() {
        it("Should return ETH to contract owner", async () => {
            const contractEthBalanceBefore = web3.utils.toBN(await web3.eth.getBalance(contractInstance.address));
            await contractInstance.sendTransaction( { from: payer, value: paymentAmount } );

            const contractEthBalanceAfter = web3.utils.toBN(await web3.eth.getBalance(contractInstance.address));
            const ownerEthBalanceBefore = web3.utils.toBN(await web3.eth.getBalance(owner));

            const result = await contractInstance.returnETH( { from: owner } );

            const transaction = await web3.eth.getTransaction(result.tx);
            const txFee = web3.utils.toBN(result.receipt.gasUsed).mul(web3.utils.toBN(transaction.gasPrice));
            const ownerEthBalanceAfter = web3.utils.toBN(await web3.eth.getBalance(owner));
            const contractEthBalanceAfterReturnEth = web3.utils.toBN(await web3.eth.getBalance(contractInstance.address));

            assert.equal(true, paymentAmount.eq(contractEthBalanceAfter.sub(contractEthBalanceBefore)));
            assert.equal(true, web3.utils.toBN(0).eq(contractEthBalanceAfterReturnEth));
            assert.equal(true, ownerEthBalanceAfter.eq(ownerEthBalanceBefore.add(paymentAmount).sub(txFee)));
        });

        it("Should not return ETH to non-owner", async () => {

            await contractInstance.sendTransaction( { from: payer, value: paymentAmount } );
            const contractEthBalanceAfter = web3.utils.toBN(await web3.eth.getBalance(contractInstance.address));

            await truffleAssert.reverts(
                contractInstance.returnETH( { from: payer } ),
                "Only owner can return ETH"
            );

            const contractEthBalanceAfterReturnEth = web3.utils.toBN(await web3.eth.getBalance(contractInstance.address));
            assert.equal(true, contractEthBalanceAfter.eq(contractEthBalanceAfterReturnEth));
        });

    });

    describe("returnDAI", function() {
        it("Should return DAI to contract owner", async () => {
            const daiAmount = web3.utils.toBN(10).mul(bn1e18);            
            await daiTokenInstance.transfer( contractInstance.address, daiAmount);

            const ownerDAIBalanceBefore = await daiTokenInstance.balanceOf(owner);
            const contractDAIBalanceBefore = await daiTokenInstance.balanceOf(contractInstance.address);

            await contractInstance.returnDAI( { from: owner } );

            const ownerDAIBalanceAfter = await daiTokenInstance.balanceOf(owner);
            const contractDAIBalanceAfter = await daiTokenInstance.balanceOf(contractInstance.address);            

            assert.equal(true, web3.utils.toBN(0).eq(contractDAIBalanceAfter));
            assert.equal(true, ownerDAIBalanceAfter.eq(ownerDAIBalanceBefore.add(contractDAIBalanceBefore.sub(contractDAIBalanceAfter))));
        });

        it("Should not return DAI to non-owner", async () => {
            const daiAmount = web3.utils.toBN(10).mul(bn1e18);            
            await daiTokenInstance.transfer( contractInstance.address, daiAmount);

            const payerDAIBalanceBefore = await daiTokenInstance.balanceOf(payer);
            const contractDAIBalanceBefore = await daiTokenInstance.balanceOf(contractInstance.address);

            await truffleAssert.reverts(
                contractInstance.returnDAI( { from: payer } ),
                "Only owner can return DAI"
            );

            const payerDAIBalanceAfter = await daiTokenInstance.balanceOf(payer);
            const contractDAIBalanceAfter = await daiTokenInstance.balanceOf(contractInstance.address);            

            assert.equal(true, payerDAIBalanceAfter.eq(payerDAIBalanceBefore));
            assert.equal(true, contractDAIBalanceAfter.eq(contractDAIBalanceBefore));
        });

    });

});