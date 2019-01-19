import { createStore, applyMiddleware } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'

import { rootReducer } from '../reducers';

export function initializeStore (initialState = {}) {
    return createStore(
        rootReducer, 
        initialState, 
        composeWithDevTools(applyMiddleware())
    )
}