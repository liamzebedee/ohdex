pragma solidity ^0.5.0;

import "../events/EventListener.sol";
import "../events/EventEmitter.sol";
import "./tokens/BridgedToken.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "./tokens/WrappedNativeToken.sol";
import "../libs/LibEvent.sol";
import "./ITokenBridge.sol";

contract Bridge is Ownable, ITokenBridge {
    struct Network {
        mapping(address => address) tokenToBridgedToken;
        mapping(address => address) bridgedTokenToToken;
        address bridgeContract;
    }

    mapping(address => uint256) bridgedTokenToNetwork;

    mapping(uint256 => Network) networks;
    mapping(bytes32 => bool) public processedEvents;

    event TokensClaimed(address indexed token, address indexed receiver, uint256 amount, uint256 indexed chainId, uint256 salt );

    constructor(uint256 _chainId, address _eventListener, address _eventEmitter) ITokenBridge() public {
        chainId = _chainId;
        eventListener = EventListener(_eventListener);
        eventEmitter = EventEmitter(_eventEmitter);
        new WrappedNativeToken();
    }
    
    function claim(
        address _token,
        address payable _receiver,
        uint256 _amount,
        uint256 _chainId,
        uint256 _salt,
        bytes32[] memory _proof,
        bool[] memory _proofPaths,
        bytes32 _interchainStateRoot,
        bytes32[] memory _eventsProof,
        bool[] memory _eventsPaths,
        bytes32 _eventsRoot
        ) public 
    {   
        bytes32 eventHash = _getTokensBridgedEventHash(tokenBridgeId, _receiver, _token, _amount, chainId, _salt);
        // TODO check origin address of event
        _checkEventProcessed(eventHash);

        // bytes32 leaf = keccak256(abi.encodePacked(networks[_chainId].escrowContract, eventHash));

        require(eventListener.checkEvent(
            _proof,
            _proofPaths,
            _interchainStateRoot,
            _eventsProof,
            _eventsPaths,
            _eventsRoot,
            eventHash
        ), "EVENT_NOT_FOUND");
        
        // TODO Make this work with claiming native tokens and less hacky
        // if token is a contract and is not a bridged token use transfer 
        if(isContract(_token) && networks[_chainId].tokenToBridgedToken[_token] == address(0)) {
            IERC20(_token).transfer(_receiver, _amount);
        } else {
            // get or create the token contract
            BridgedToken bridgedToken = BridgedToken(getBridgedToken(_token, _chainId));
            require(address(bridgedToken) != address(0), "INVALID_TOKEN_ADDRESS");
            // mint the tokens
            bridgedToken.mint(_receiver, _amount);
        }
        
        emit TokensClaimed(_token, _receiver, _amount, _chainId, _salt);
    }

    function bridge(bytes32 _targetBridge, address _token, address _receiver, uint256 _amount, uint256 _chainId, uint256 _salt) public {
        // If token is not a bridged token being bridged back escrow the tokens.
        if(networks[_chainId].tokenToBridgedToken[_token] == address(0)) {
            require(IERC20(_token).transferFrom(msg.sender, address(this), _amount), "TOKEN_TRANSFER_FAILED");
        } else { //if bridging back burn the tokens
            BridgedToken bridgedToken = BridgedToken(getBridgedToken(_token, _chainId));
            bridgedToken.burn(msg.sender, _amount);
        }   
 
        _createBridgeTokenEvent(_targetBridge, _receiver, _token, _amount, _chainId, _salt);
    }
    
    function initNetwork(address _bridgeContract, uint256 _chainId) public onlyOwner {
        require(networks[_chainId].bridgeContract == address(0), "CHAIN_ALREADY_INITIALISED");
        networks[_chainId].bridgeContract = _bridgeContract;
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

    function isContract(address _addr) private returns (bool isContract){
        uint256 size;
        assembly {
            size := extcodesize(_addr)
        }
        return (size > 0);
    }

}