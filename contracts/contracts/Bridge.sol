pragma solidity ^0.5.0;

import "./EventListener.sol";
import "./EventEmitter.sol";
import "./BridgedToken.sol";
import "./BridgedToken.sol";
import "openzeppelin-solidity/contracts/ownership/Ownable.sol";
import "./libs/LibEvent.sol";

contract Bridge is Ownable {

    uint256 public chainId;
    EventListener public eventListener;
    EventEmitter public eventEmitter;

    struct Network {
        mapping(address => address) tokenToBridgedToken;
        mapping(address => address) bridgedTokenToToken;
        address escrowContract;
    }

    mapping(uint256 => Network) networks;
    mapping(bytes32 => bool) public processedEvents;

    constructor(uint256 _chainId, address _eventListener, address _eventEmitter) public {
        chainId = _chainId;

        eventListener = EventListener(_eventListener);
        eventEmitter = EventEmitter(_eventEmitter);

    }
    
    function claim(
        address _receiver,
        address _token,
        uint256 _amount,
        uint256 _salt,
        uint256 _chainId,
        uint256 _period,
        bytes32[] memory _proof ) public {

        
        bytes32 eventHash = keccak256(abi.encodePacked(_receiver, _token, _amount, chainId, _salt));

        require(!processedEvents[eventHash], "EVENT_ALREADY_PROCESSED");
        processedEvents[eventHash] = true;

        bytes32 leaf = keccak256(abi.encodePacked(networks[_chainId].escrowContract, eventHash));

        require(eventListener.checkEvent(_chainId, _period, _proof, leaf), "EVENT_NOT_FOUND");
        
        // get or create the token contract
        BridgedToken bridgedToken = BridgedToken(getBridgedToken(_token, _chainId));

        // mint the tokens
        bridgedToken.mint(_receiver, _amount);

    }

    function bridge(address _token, uint256 _amount, uint256 _chainId, uint256 _salt) public {
                
        BridgedToken bridgedToken = BridgedToken(getBridgedToken(_token, _chainId));

        bridgedToken.burn(msg.sender, _amount);

        eventEmitter.emitEvent(keccak256(abi.encodePacked(msg.sender, _token, _amount, _chainId, _salt)));
    }
    
    function initNetwork(address _escrowContract, uint256 _chainId) public onlyOwner {
        require(networks[_chainId].escrowContract == address(0), "CHAIN_ALREADY_INITIALISED");
        networks[_chainId].escrowContract = _escrowContract;
    }
    
    function getBridgedToken(address _token, uint256 _chainId) public returns(address) { 

        // return the contract address if it already exists
        if(networks[_chainId].tokenToBridgedToken[_token] != address(0)) {
            return networks[_chainId].tokenToBridgedToken[_token];
        }

        // Otherwise deploy the contract
        address bridgedTokenAddress = address(new BridgedToken());

        networks[_chainId].tokenToBridgedToken[_token] = bridgedTokenAddress;
        networks[_chainId].bridgedTokenToToken[bridgedTokenAddress] = _token;

        return networks[_chainId].tokenToBridgedToken[_token];

    }

}