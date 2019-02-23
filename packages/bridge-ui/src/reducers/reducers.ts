import { combineReducers } from 'redux'
import bridgeReducer from './bridge/bridgeReducers';

const reducers = combineReducers({
    bridge: bridgeReducer
})

export default reducers