pragma solidity ^0.5.0;

import "../events/EventListener.sol";
import "../events/EventEmitter.sol";
import "../BridgedToken.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "../libs/LibEvent.sol";
import "./ITokenBridge.sol";

contract Bridge is Ownable, ITokenBridge {
    struct Network {
        mapping(address => address) tokenToBridgedToken;
        mapping(address => address) bridgedTokenToToken;
        address escrowContract;
    }

    mapping(address => uint256) bridgedTokenToNetwork;

    mapping(uint256 => Network) networks;
    mapping(bytes32 => bool) public processedEvents;

    event BridgedTokensClaimed(address indexed token, address indexed receiver, uint256 amount, uint256 indexed chainId, uint256 salt );

    constructor(uint256 _chainId, EventListener _eventListener, EventEmitter _eventEmitter) ITokenBridge(_eventListener, _eventEmitter) public {
        chainId = _chainId;
    }
    
    function claim(
        address _token,
        address _receiver,
        uint256 _amount,
        uint256 _chainId,
        uint256 _salt,
        bytes32[] memory _proof,
        bool[] memory _proofPaths,
        bytes32 _interchainStateRoot,
        bytes32[] memory _eventsProof,
        bool[] memory _eventsPaths,
        bytes32 _eventsRoot,
        bytes32 _eventHash
        ) public 
    {
        bytes32 eventHash = _getTokensBridgedEventHash(address(this), _receiver, _token, _amount, _chainId, _salt);
        
        require(eventHash == _eventHash, "EVENT_NOT_SAME");
        _checkEventProcessed(eventHash);

        // bytes32 leaf = keccak256(abi.encodePacked(networks[_chainId].escrowContract, eventHash));

        require(eventListener.checkEvent(
            _proof,
            _proofPaths,
            _eventsProof,
            _eventsPaths,
            _eventsRoot,
            eventHash
        ), "EVENT_NOT_FOUND");


        // get or create the token contract
        BridgedToken bridgedToken = BridgedToken(getBridgedToken(_token, _chainId));
        require(address(bridgedToken) != address(0), "INVALID_TOKEN_ADDRESS");

        // mint the tokens
        bridgedToken.mint(_receiver, _amount);
        emit BridgedTokensClaimed(address(bridgedToken), _receiver, _amount, _chainId, _salt);
    }

    function bridge(address _targetBridge, address _token, address _receiver, uint256 _amount, uint256 _chainId, uint256 _salt) public {                
        BridgedToken bridgedToken = BridgedToken(getBridgedToken(_token, _chainId));
        bridgedToken.burn(msg.sender, _amount);

        _createBridgeTokenEvent(_targetBridge, _receiver, _token, _amount, _chainId, _salt);
    }
    
    function initNetwork(address _escrowContract, uint256 _chainId) public onlyOwner {
        require(networks[_chainId].escrowContract == address(0), "CHAIN_ALREADY_INITIALISED");
        networks[_chainId].escrowContract = _escrowContract;
    }
    
    function getBridgedToken(address _token, uint256 _chainId) public returns(address) { 

        // Return the contract address if it already exists
        if(networks[_chainId].tokenToBridgedToken[_token] != address(0)) {
            return networks[_chainId].tokenToBridgedToken[_token];
        }

        // Otherwise deploy the contract
        address bridgedTokenAddress = address(new BridgedToken());
        
        bridgedTokenToNetwork[bridgedTokenAddress] = _chainId;

        networks[_chainId].tokenToBridgedToken[_token] = bridgedTokenAddress;
        networks[_chainId].bridgedTokenToToken[bridgedTokenAddress] = _token;

        return networks[_chainId].tokenToBridgedToken[_token];

    }

    function getBridgedTokenStatic(address _token, uint256 _chainId) public view returns(address) {
        return networks[_chainId].tokenToBridgedToken[_token];
    }

    function getOriginToken(address _token) public view returns(address token, uint256 network) {
        network = bridgedTokenToNetwork[_token];
        token = networks[network].bridgedTokenToToken[_token];
    }

}