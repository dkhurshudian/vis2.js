import { combineReducers } from 'redux'
import { handleAction, handleActions } from 'redux-actions'
import { Map } from 'immutable'
import { addVertexAction } from '../actions/vertexAction'
import { Vertex } from '../core/Vertex'

type IVertices = Map<string, Vertex>;

const initialState: IVertices = Map()

export default handleActions({
  [addVertexAction.toString()](state, { payload: vertex }:{payload:Vertex}) {
    return state.set(vertex.id, vertex)
  }
}, initialState)

