import bridgeActionTypes from './bridgeActionTypes';

const initialState = {
    chainA: 0,
    chainB: 0,
    tokenAddress: "",
    tokenAddressValid: false,
    tokenAmount: "",
    bridgingBack: false,
    originTokenAddress: "",
    tokenAmountValid: false,
    canContinue: false,
};

const mapping = {
    [bridgeActionTypes.SET_CHAIN_A]: (state:any, action:any) => ({
        ...state,
        chainA: action.chainId,
    }),
    [bridgeActionTypes.SET_CHAIN_B]: (state:any, action:any) => ({
        ...state,
        chainB: action.chainId,
    }),
    [bridgeActionTypes.SET_TOKEN_ADDRESS_AND_VALID]: (state:any, action:any) => ({
        ...state,
        tokenAddress: action.tokenAddress,
        tokenAddressValid: action.tokenAddressValid,
    }),
    [bridgeActionTypes.SET_TOKEN_AMOUNT]: (state:any, action:any) => ({
        ...state,
        tokenAmount: action.tokenAmount,
    }),
    [bridgeActionTypes.SET_BRIDGING_BACK]: (state:any, action:any) => ({
        ...state,
        bridgingBack: action.bridgingBack,
        originTokenAddress: action.originTokenAddress,
    }),
    [bridgeActionTypes.SET_CAN_CONTINUE]: (state:any, action:any) => ({
        ...state,
        canContinue: action.canContinue
    }),
};

function bridgeReducer(state = initialState, action:any) {
    let newState = state;

    if (mapping[action.type]) {
        newState = mapping[action.type](state, action);
    }

    return newState;
}

export default bridgeReducer;