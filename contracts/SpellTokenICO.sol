// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "@chainlink/contracts/src/v0.8/ChainlinkClient.sol";

/*interface GetStudents {
    function getStudentsList() external view returns (string[] memory students);
}*/

interface ERC20 {
    function allowance(address owner, address spender) external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address _to, uint _value) external returns (bool success);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
}

/*interface ERC721 {
    function balanceOf(address owner) external view returns (uint256);
}*/

contract SpellTokenICO is ChainlinkClient, VRFConsumerBase {
    using Chainlink for Chainlink.Request;

    address chainlinkVRFCoordinator = 0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9;
    address linkTokenAddress = 0xa36085F69e2889c224210F603D836748e7dC0088;

    address private rinkeybyChainlinkNodeOperator;
    bytes32 private jobIdParseUint256;
    
    bytes32 internal keyHash;
    uint256 internal fee;

    uint256 public blockNumber;

    uint256 public lastSentRandomRequestIdHash;
    bytes32 public lastSentRandomRequestId;
    uint256 public lastReceivedRandomRequestIdHash;
    bytes32 public lastReceivedRandomRequestId;
    
    uint256 public lastSentApiRequestIdHash;
    bytes32 public lastSentApiRequestId;
    uint256 public lastReceivedApiRequestIdHash;
    bytes32 public lastReceivedApiRequestId;

    uint256 public lastMultiplier;
    uint256 public lastEthUsdPrice;
    uint256 public lastTokenAmount;

    mapping(bytes32 => uint256) public apiRequestIdToHashMap;
    mapping(bytes32 => uint256) public randomRequestIdToHashMap;
    mapping(uint256 => uint256) public hashToMultiplierMap;
    mapping(uint256 => uint256) public hashToEthUsdPriceMap;
    mapping(uint256 => uint256) public hashToEthAmountMap;

    // AggregatorV3Interface internal priceFeedETHUSD;
    AggregatorV3Interface internal priceFeedDAIUSD;
    address public owner;
    address private studentContractAddress;
    address private tokenAddress;
    address private daiTokenAddress;
    address private nftSSUTokenAddress;

    constructor(
        address _tokenAddress,
        address _daiTokenAddress,
        address _studentContractAddress,
        address _chainLinkETHUSD,
        address _chainLinkDAIUSD,
        address _nftSSUTokenAddress
    ) VRFConsumerBase(chainlinkVRFCoordinator, linkTokenAddress) {
        owner = msg.sender;
        // priceFeedETHUSD = AggregatorV3Interface(_chainLinkETHUSDRinkeby);
        priceFeedDAIUSD = AggregatorV3Interface(_chainLinkDAIUSD);
        studentContractAddress = _studentContractAddress;
        tokenAddress = _tokenAddress;
        daiTokenAddress = _daiTokenAddress;
        nftSSUTokenAddress = _nftSSUTokenAddress;

        setPublicChainlinkToken();
        blockNumber = block.number;
        keyHash = 0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4;
        fee = 0.1 * 10 ** 18;               
        rinkeybyChainlinkNodeOperator = 0xc57B33452b4F7BB189bB5AfaE9cc4aBa1f7a4FD8;
        jobIdParseUint256 = "d5270d1c311941d0b08bead21fea7747";        
    }

    receive() external payable {
        buyForETH();
    }

    fallback() external payable {
        buyForETH();
    }

    function buyForETH() public payable {
        // require(ERC721(nftSSUTokenAddress).balanceOf(msg.sender) > 0, "You need special NFT on you balance to get tokens");
        require(msg.value > 0, "Send ETH to buy some tokens");
        getChainlinkData();
    }

    function buyForDAI(uint daiAmount) public {
        require(daiAmount > 0, "Non-zero DAI amount is required");
        require(ERC20(daiTokenAddress).allowance(msg.sender, address(this)) >= daiAmount, "Spending DAI is not allowed");
        // require(ERC721(nftSSUTokenAddress).balanceOf(msg.sender) > 0, "You need special NFT on you balance to get tokens");

        ( , int priceDAIUSD, , , ) = priceFeedDAIUSD.latestRoundData();
        uint tokenAmount = daiAmount * uint(priceDAIUSD) / (10 ** priceFeedDAIUSD.decimals());

        ERC20(daiTokenAddress).transferFrom(msg.sender, address(this), daiAmount);
        ERC20(tokenAddress).transfer(msg.sender, tokenAmount);
    }

    function returnDAI() public {
        require(msg.sender == owner, "Only owner can return DAI");
        ERC20(daiTokenAddress).transfer(msg.sender, ERC20(daiTokenAddress).balanceOf(address(this)));
    }

    function returnETH() public {
        require(msg.sender == owner, "Only owner can return ETH");
        (bool success, ) = msg.sender.call{ value: address(this).balance }("");
    }

    function getChainlinkData() internal {
        require(LINK.balanceOf(address(this)) >= fee * 2, "Not enough LINK");
        bytes32 randomRequestId = getRandomNumber();
        bytes32 apiRequestId = getEthUsdPrice();
        uint256 requestHash = uint256(keccak256(abi.encodePacked(randomRequestId, apiRequestId)));
        hashToEthAmountMap[requestHash] = msg.value;

        lastSentRandomRequestId = randomRequestId;
        randomRequestIdToHashMap[randomRequestId] = requestHash;
        lastSentRandomRequestIdHash = requestHash;

        lastSentApiRequestId = apiRequestId;
        apiRequestIdToHashMap[apiRequestId] = requestHash;
        lastSentApiRequestIdHash = requestHash;
    }

    function getRandomNumber() public returns (bytes32 requestId) {
        blockNumber = block.number;
        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK");
        return requestRandomness(keyHash, fee);
    }

    function fulfillRandomness(bytes32 randomRequestId, uint256 randomness) internal override {
        blockNumber = block.number;
        uint256 requestHash = randomRequestIdToHashMap[randomRequestId];
        lastReceivedRandomRequestId = randomRequestId;
        lastReceivedRandomRequestIdHash = requestHash;
        hashToMultiplierMap[requestHash] = randomness % 26 + 5;

        if(hashToMultiplierMap[requestHash] > 0 && hashToEthUsdPriceMap[requestHash] > 0) {
            sendTokensForEth(requestHash);
        }
    }
    
    function getEthUsdPrice() public returns (bytes32 requestId) 
    {
        blockNumber = block.number;

        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK");
        Chainlink.Request memory request = buildChainlinkRequest(jobIdParseUint256, address(this), this.fulfill.selector);
        
        request.add("get", "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
        request.add("path", "ethereum.usd");
        request.addInt("times", 10 ** 18);

        return sendChainlinkRequestTo(rinkeybyChainlinkNodeOperator, request, fee);
    }
    
    function fulfill(bytes32 requestId, uint256 result) public recordChainlinkFulfillment(requestId)
    {
        blockNumber = block.number;
        uint256 requestHash = apiRequestIdToHashMap[requestId];
        lastReceivedApiRequestId = requestId;
        lastReceivedApiRequestIdHash = requestHash;
        hashToEthUsdPriceMap[requestHash] = result;
        
        if(hashToMultiplierMap[requestHash] > 0 && hashToEthUsdPriceMap[requestHash] > 0) {
            sendTokensForEth(requestHash);
        }
    }

    function sendTokensForEth(uint requestHash) internal {
        uint256 studentsCount = 35;
        uint256 ethUsdPriceDecimals = 10 ** 18;
        uint256 multiplierFactor = 10;
        uint256 tokenAmount =  hashToEthAmountMap[requestHash] * hashToMultiplierMap[requestHash] * hashToEthUsdPriceMap[requestHash] / studentsCount / ethUsdPriceDecimals / multiplierFactor;
      
        lastMultiplier = hashToMultiplierMap[requestHash];
        lastEthUsdPrice = hashToEthUsdPriceMap[requestHash];
        lastTokenAmount = tokenAmount;

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