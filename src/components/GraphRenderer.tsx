import React from 'react'
import { Graph, IGraphEvent } from '../core/Graph'
import { Point } from '../core/Point'
import { Viewport } from './Viewport'
import { EdgesRenderer } from './EdgesRenderer'
import { VerticesRenderer } from './VerticesRenderer'
import { Pan } from './Pan'
import { EdgeRenderer } from './EdgeRenderer'
import { VertexRenderer } from './VertexRenderer'

export interface IGraphRendererProps {
}

export interface IGraphRendererState extends IGraphEvent {
}

export class GraphRenderer extends React.PureComponent<IGraphRendererProps, IGraphRendererState> {
  render() {
    const UNIT = 5
    const RATIO = 1
    return <Pan
      UNIT={UNIT}
      RATIO={RATIO}
    >
      <Viewport
        UNIT={UNIT}
        RATIO={RATIO}
      >
        <EdgesRenderer>
          {(edge) => <EdgeRenderer edge={edge}/>}
        </EdgesRenderer>
        <VerticesRenderer>
          {(vertex) => <VertexRenderer vertex={vertex}/>}
        </VerticesRenderer>
      </Viewport>
    </Pan>
  }

  componentWillUnmount(): void {
    this.props.graph.removeEventListener(this.setState)
  }
}
