import React from 'react'
import ReactDOM from 'react-dom'
import { connect, Provider } from 'react-redux'
import { GraphRenderer } from './components/GraphRenderer'
import { defaultModel, Model } from '@alephdata/followthemoney'
import { Vertex } from './core/Vertex'
import { Graph } from './core/Graph'
import { data } from '../resources/az_alievs.js'
import store from './store'
import { addVertexAction } from './actions/vertexAction'

const model = new Model(defaultModel)



function Vis2(props:any) {
  const [count, setCount] = React.useState(1)
  return <div>
    <div>
      <button onClick={() => Array.from({ length: count })
      // @ts-ignore
        .forEach(props.addVertexAction(new Vertex(12,12,12+Math.random())))}>
        add vertex
      </button>
      <input type="text" value={count} onChange={({ target }) => {
        setCount(Number(target.value))
      }}
      />
      <button onClick={() => {
        data
        // @ts-ignore
          .map(rawEntity => model.getEntity(rawEntity))
          // @ts-ignore
          .forEach(graph.addEntity, graph)
      }}>add our friends
      </button>
    </div>
    <div>
      <GraphRenderer />
    </div>
  </div>
}

const ConnectedVis2 = connect(null, {
  addVertexAction
})(Vis2)

ReactDOM.render(
  <Provider store={store}>
    <ConnectedVis2/>
  </Provider>,
  document.querySelector('#app')
)

