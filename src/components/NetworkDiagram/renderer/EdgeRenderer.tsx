import * as React from 'react'
import Bezier from 'bezier-js'
import {Edge, Vertex, Point, GraphLayout} from 'NetworkDiagram/layout'
import { EdgeLabelRenderer } from './EdgeLabelRenderer';


interface IEdgeRendererProps {
  edge: Edge,
  vertex1?: Vertex,
  vertex2?: Vertex,
  svgRef: React.RefObject<SVGSVGElement>,
  selectEdge: (edge: Edge, options?: any) => any,
  dragSelection: (offset: Point, initialPosition?: Point) => any,
  dropSelection: () => any,
  layoutConfig:GraphLayout['config'];
  isEdgeHighlighted:GraphLayout['isEdgeHighlighted'];
  noneSelected:boolean;
  isVisualLabelRedundant?:boolean;
  writeable:boolean;
}

export class EdgeRenderer extends React.PureComponent<IEdgeRendererProps>{

  constructor(props: Readonly<IEdgeRendererProps>) {
    super(props)
    this.onClick = this.onClick.bind(this)
  }

  onClick(e: React.MouseEvent) {
    const { edge, selectEdge } = this.props;
    selectEdge(edge, { additional: e.shiftKey })
    e.preventDefault()
    e.stopPropagation()
  }

  generatePath(vertex1: any, vertex2: any) {
    const { edge, layoutConfig } = this.props

    if (edge.labelPosition) {
      const curveGenerator = Bezier.quadraticFromPoints(vertex1, layoutConfig.gridToPixel(edge.labelPosition), vertex2, .5);
      // location of control point:
      const { x, y } = curveGenerator.points[1]

      return {
        path: "M" + vertex1.x + " " + vertex1.y + " Q " + x + " " + y + " " + vertex2.x + " " + vertex2.y,
        center: edge.labelPosition
      }
    } else {
      // mid-point of line:
      const mpx = (vertex2.x + vertex1.x) * 0.5;
      const mpy = (vertex2.y + vertex1.y) * 0.5;

      return {
        path: "M" + vertex1.x + " " + vertex1.y + " L " + vertex2.x + " " + vertex2.y,
        center: layoutConfig.pixelToGrid(new Point(mpx, mpy))
      }
    }
  }


  render() {
    const {
      edge, vertex1, vertex2, dragSelection,
      dropSelection, svgRef, layoutConfig,
      isEdgeHighlighted, noneSelected, isVisualLabelRedundant
    } = this.props;
    if (!vertex1 || !vertex2 || vertex1.hidden || vertex2.hidden) {
      return null;
    }
    const isHighlighted = isEdgeHighlighted(edge) || noneSelected;
    const isEntity = edge.isEntity()
    const isDirected = edge.directed

    const vertex1Position = layoutConfig.gridToPixel(vertex1.position)
    const vertex2Position = layoutConfig.gridToPixel(vertex2.position)
    const { path, center } = this.generatePath(vertex1Position, vertex2Position)

    const clickableLineStyles: React.CSSProperties = {
      cursor: 'pointer'
    }
    const lineStyles: React.CSSProperties = {
      pointerEvents: 'none'
    }
    const arrowRef = isHighlighted ? "url(#arrow)" : "url(#arrow-unselected)"
    return <React.Fragment>
      <g className="edge">
        <path
          stroke="rgba(0,0,0,0)"
          strokeWidth='4'
          fill='none'
          d={path}
          onClick={this.onClick}
          style={clickableLineStyles}
        />
        <path
          stroke={isHighlighted ? layoutConfig.EDGE_COLOR : layoutConfig.UNSELECTED_COLOR}
          strokeWidth='1'
          fill='none'
          d={path}
          strokeDasharray={isEntity ? '0' : '1'}
          style={lineStyles}
          markerEnd={isDirected ? arrowRef : ''}
        />
      </g>
      {isHighlighted && (
        <EdgeLabelRenderer
          svgRef={svgRef}
          center={center}
          labelText={edge.label}
          onClick={this.onClick}
          dragSelection={dragSelection}
          dropSelection={dropSelection}
          outlineColor={layoutConfig.EDGE_COLOR}
          textColor={layoutConfig.EDGE_COLOR}
          isVisualLabelRedundant={isVisualLabelRedundant}
          writeable={this.props.writeable}
          layoutConfig={layoutConfig}
        />
      )}
    </React.Fragment>
  }
}
