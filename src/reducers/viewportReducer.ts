import { Map } from 'immutable'
import { handleAction, handleActions } from 'redux-actions'
import { setPanCenter, setZoomFactor } from '../actions/viewportAction'

const defaultState = Map({
  zoomFactor: 4,
  // FIXME: use records for this;
  panCenter: Map({
    x: 0,
    y: 0
  })
})


export default handleActions({
  [setZoomFactor.toString()](state, { payload }) {
    return state.merge(payload);
  },
  [setPanCenter.toString()](state, {payload}){
    return state.set('panCenter', payload as unknown as any)
  }
}, defaultState)
