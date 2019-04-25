import { combineReducers } from 'redux'
import vertexReducers from './vertexReducer'
import viewportReducers from './viewportReducer';

export default combineReducers([
  // @ts-ignore
  vertexReducers,
  // @ts-ignore
  viewportReducers
])
