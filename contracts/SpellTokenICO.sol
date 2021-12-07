// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

interface GetStudents {
    function getStudentsList() external view returns (string[] memory students);
}

interface ERC20 {
    function transfer(address _to, uint _value) external returns (bool success);
}

contract SpellTokenICO {

    AggregatorV3Interface internal priceFeed;
    address studentContractAddress;
    address tokenAddress;

    constructor(address _tokenAddress, address _studentContractAddress, address _chainLinkETHUSDRinkeby) {
        priceFeed = AggregatorV3Interface(_chainLinkETHUSDRinkeby);
        studentContractAddress = _studentContractAddress;
        tokenAddress = _tokenAddress;
    }

    receive() external payable {
        send();
    }

    fallback() external payable {
        send();
    }

    function send() private {
        require(msg.value > 0, "Send ETH to buy some tokens");
        
        ( , int priceETHUSD, , , ) = priceFeed.latestRoundData();
        uint studentsCount = GetStudents(studentContractAddress).getStudentsList().length;
        uint tokenAmount =  msg.value * uint(priceETHUSD) / studentsCount / (10 ** priceFeed.decimals());

        try ERC20(tokenAddress).transfer(msg.sender, tokenAmount) {
        } catch Error(string memory) {
            (bool success, ) = msg.sender.call{ value: msg.value }("Sorry, there is not enough tokens to buy");
            require(success, "External call failed");
        } catch (bytes memory reason) {
            (bool success, ) = msg.sender.call{ value: msg.value }(reason);
            require(success, "External call failed");
        }
    }
}