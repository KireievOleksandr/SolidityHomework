const truffleAssert = require("truffle-assertions");
import { assert, web3, artifacts } from "hardhat";

const SpellToken = artifacts.require("SpellToken");
const SpellTokenICO = artifacts.require("SpellTokenICO");

const bn1e18 = web3.utils.toBN(1e18);

const daiTokenAddress = '0x5592ec0cfb4dbc12d3ab100b257153436a1f0fea';
const studentContractAddress = '0x0E822C71e628b20a35F8bCAbe8c11F274246e64D';
const chainLinkETHUSDRinkeby = '0x8A753747A1Fa494EC906cE90E9f37563A8AF630e';
const chainLinkDAIUSDRinkeby = '0x2bA49Aaa16E6afD2a993473cfB70Fa8559B523cF';

describe("SpellTokenICO", () => {
    let accounts: string[];
    let owner: any;
    let payer: any;
    let tokenInstance: any;
    let contractInstance: any;

    const paymentAmount = bn1e18.muln(1);

    beforeEach(async function () {
        accounts = await web3.eth.getAccounts();
        owner = accounts[0];
        payer = accounts[1];
        tokenInstance = await SpellToken.new("Spell Token", "SPELL", "1000000000000000000000000000");
        contractInstance = await SpellTokenICO.new(tokenInstance.address, daiTokenAddress, studentContractAddress, chainLinkETHUSDRinkeby, chainLinkDAIUSDRinkeby);
        tokenInstance.transfer(contractInstance.address, web3.utils.toBN(1000).mul(bn1e18));
    });

    describe("buyForETH", function() {
        it("Should buy tokens for ETH successfully", async () => {
            const payerTokenBalanceBefore = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceBefore = await tokenInstance.balanceOf(contractInstance.address);

            await contractInstance.sendTransaction( { from: payer, value: paymentAmount } );

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

    
    describe("returnETH", function() {
        it("Should return ETH to contract owner", async () => {
            const payerEthBalanceBefore = web3.utils.toBN(await web3.eth.getBalance(payer));
            const contractEthBalanceBefore = web3.utils.toBN(await web3.eth.getBalance(contractInstance.address));
            const payerTokenBalanceBefore = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceBefore = await tokenInstance.balanceOf(contractInstance.address);

            await contractInstance.sendTransaction( { from: payer, value: paymentAmount } );

            const payerEthBalanceAfter = web3.utils.toBN(await web3.eth.getBalance(payer));
            const contractEthBalanceAfter = web3.utils.toBN(await web3.eth.getBalance(contractInstance.address));
            const payerTokenBalanceAfter = await tokenInstance.balanceOf(payer);
            const contractTokenBalanceAfter = await tokenInstance.balanceOf(contractInstance.address);

            const ownerEthBalanceBefore = web3.utils.toBN(await web3.eth.getBalance(owner));

            const result = await contractInstance.returnETH( { from: owner } );

            const transaction = await web3.eth.getTransaction(result.tx);
            const txFee = web3.utils.toBN(result.receipt.gasUsed).mul(web3.utils.toBN(transaction.gasPrice));
            const ownerEthBalanceAfter = web3.utils.toBN(await web3.eth.getBalance(owner));
            const contractEthBalanceAfterReturnEth = web3.utils.toBN(await web3.eth.getBalance(contractInstance.address));

            assert.equal(true, paymentAmount.eq(contractEthBalanceAfter.sub(contractEthBalanceBefore)));
            assert.equal(true, web3.utils.toBN(0).eq(contractEthBalanceAfterReturnEth));
            assert.equal(true, web3.utils.toBN(0).eq(contractEthBalanceAfterReturnEth));
            assert.equal(true, ownerEthBalanceAfter.eq(ownerEthBalanceBefore.add(paymentAmount).sub(txFee)));
        });

        it("Should not return ETH to non-owner", async () => {
            const contractEthBalanceBefore = web3.utils.toBN(await web3.eth.getBalance(contractInstance.address));
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

});