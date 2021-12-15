// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

contract SpellTokenICOProxy {

    address public owner;
    address payable public implementation;
    uint256 public version;
    
    AggregatorV3Interface internal priceFeedETHUSD;
    AggregatorV3Interface internal priceFeedDAIUSD;
    address public studentContractAddress;
    address public tokenAddress;
    address public daiTokenAddress;
    address public nftSSUTokenAddress;
    
    constructor(
        address payable _implementation,
        address _tokenAddress,
        address _daiTokenAddress,
        address _studentContractAddress,
        address _chainLinkETHUSDRinkeby,
        address _chainLinkDAIUSDRinkeby,
        address _nftSSUTokenAddress        
    ) {
        owner = msg.sender;
        implementation = _implementation;
        version = 1;
        priceFeedETHUSD = AggregatorV3Interface(_chainLinkETHUSDRinkeby);
        priceFeedDAIUSD = AggregatorV3Interface(_chainLinkDAIUSDRinkeby);
        studentContractAddress = _studentContractAddress;
        tokenAddress = _tokenAddress;
        daiTokenAddress = _daiTokenAddress;
        nftSSUTokenAddress = _nftSSUTokenAddress;        
    }

    fallback() payable external {
      (bool sucess, bytes memory _result) = implementation.delegatecall(msg.data);
    }
    
    function changeImplementation(address payable _newImplementation, uint256 _newVersion) public {
        require(msg.sender == owner, "Only owner is allowed to update implementation");
        require(_newVersion > version, "New version must be greater then previous");
        implementation = _newImplementation;
        version = _newVersion;
    }    
}