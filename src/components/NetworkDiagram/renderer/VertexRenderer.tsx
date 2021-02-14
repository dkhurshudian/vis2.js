import * as React from 'react'
import { DraggableCore, DraggableEvent, DraggableData } from 'react-draggable';
import { Point } from 'NetworkDiagram/layout/Point'
import { Vertex } from 'NetworkDiagram/layout/Vertex'
import { getRefMatrix, applyMatrix } from 'NetworkDiagram/renderer/utils';
import { VertexLabelRenderer } from './VertexLabelRenderer';
import { IconRenderer } from "./IconRenderer";
import { modes } from 'NetworkDiagram/utils'
import { GraphLayout } from "NetworkDiagram";
import { EntityManager } from "components/common";


interface IVertexRendererProps {
  vertex: Vertex
  selectVertex: (vertex: Vertex, options?: any) => any
  dragSelection: (offset: Point) => any
  dropSelection: () => any
  actions: any,
  writeable:boolean;
  isElementSelected:GraphLayout['isElementSelected'];
  layoutConfig:GraphLayout['config'];
  entityManager:EntityManager;
  interactionMode:string;
  noneSelected:boolean;
  isVisualLabelRedundant?:boolean;
  shouldHide:boolean;
}

interface IVertexRendererState {
  hovered: boolean
}

export class VertexRenderer extends React.PureComponent<IVertexRendererProps, IVertexRendererState> {
  gRef: React.RefObject<SVGGElement>

  constructor(props: Readonly<IVertexRendererProps>) {
    super(props)

    this.state = { hovered: false }
    this.onDragStart = this.onDragStart.bind(this)
    this.onDragMove = this.onDragMove.bind(this)
    this.onDragEnd = this.onDragEnd.bind(this)
    this.onClick = this.onClick.bind(this)
    this.onDoubleClick = this.onDoubleClick.bind(this)
    this.onMouseOver = this.onMouseOver.bind(this)
    this.onMouseOut = this.onMouseOut.bind(this)
    this.gRef = React.createRef()
  }

  componentDidMount() {
    const { writeable } = this.props;
    const g = this.gRef.current;
    if (writeable && g !== null) {
      g.addEventListener('dblclick', this.onDoubleClick)
    }
  }

  componentWillUnmount() {
    const { writeable } = this.props;
    const g = this.gRef.current;
    if (writeable && g !== null) {
      g.removeEventListener('dblclick', this.onDoubleClick)
    }
  }

  private onDragMove(e: DraggableEvent, data: DraggableData) {
    const { actions, dragSelection, interactionMode, layoutConfig } = this.props;
    const matrix = getRefMatrix(this.gRef)
    const current = applyMatrix(matrix, data.x, data.y)
    const last = applyMatrix(matrix, data.lastX, data.lastY)
    const offset = layoutConfig.pixelToGrid(current.subtract(last))
    if (interactionMode !== modes.ITEM_DRAG) {
      actions.setInteractionMode(modes.ITEM_DRAG)
    }

    if (offset.x || offset.y) {
      dragSelection(offset)
    }
  }

  onDragEnd() {
    const { interactionMode,actions, dropSelection } = this.props;

    if (interactionMode === modes.ITEM_DRAG) {
      actions.setInteractionMode(modes.SELECT)
    }
    dropSelection()
  }

  onDragStart(e: DraggableEvent) {
    this.onClick(e)
  }

  onClick(e: any) {
    const { vertex, selectVertex, actions,interactionMode, isElementSelected } = this.props
    if (interactionMode === modes.EDGE_DRAW) {
      // can't draw link to self
      if (isElementSelected(vertex)) {
        actions.setInteractionMode(modes.SELECT)
        return
      } else if (vertex.isEntity()) {
        selectVertex(vertex, { additional: true })
        actions.setInteractionMode(modes.EDGE_CREATE)
        return
      }
    }
    selectVertex(vertex, { additional: e.shiftKey })
  }

  onDoubleClick(e: MouseEvent) {
    const { actions, vertex, entityManager } = this.props;
    e.preventDefault()
    e.stopPropagation()
    if (vertex.isEntity()) {
      if (entityManager.hasExpand) {
        actions.showVertexMenu(vertex, new Point(e.clientX, e.clientY));
      } else {
        actions.setInteractionMode(modes.EDGE_DRAW);
      }
    }
  }

  onMouseOver() {
    const { interactionMode } = this.props;
    const { vertex } = this.props;

    if (interactionMode === modes.EDGE_DRAW && vertex.isEntity()) {
      this.setState({ hovered: true });
    }
  }

  onMouseOut() {
    this.setState({hovered: false})
  }

  getColor() {
    const { vertex, isElementSelected, noneSelected, layoutConfig } = this.props
    const { hovered } = this.state;

    const highlighted = isElementSelected(vertex) || noneSelected;

    if (highlighted || hovered) {
      return vertex.color || layoutConfig.DEFAULT_VERTEX_COLOR
    } else {
      return layoutConfig.UNSELECTED_COLOR
    }
  }

  allowPointerEvents() {
    const { interactionMode, vertex } = this.props;

    // sets pointer events to none while dragging in order to detect mouseover on other elements
    if (interactionMode === modes.ITEM_DRAG) {
      return false;
    }
    // ensures non-entity vertices can't be selected when drawing edges
    if (interactionMode === modes.EDGE_DRAW && !vertex.isEntity()) {
      return false;
    }
    return true;
  }

  render() {
    const { vertex,writeable,layoutConfig,isElementSelected, entityManager } = this.props
    const { x, y } = layoutConfig.gridToPixel(vertex.position)
    const selected = isElementSelected(vertex)
    const isEntity = vertex.isEntity()
    const defaultRadius = isEntity ? layoutConfig.DEFAULT_VERTEX_RADIUS : layoutConfig.DEFAULT_VERTEX_RADIUS/2;
    const vertexRadius = (vertex.radius || defaultRadius) * layoutConfig.gridUnit
    const translate = `translate(${x} ${y})`
    const labelPosition = new Point(0, vertexRadius + layoutConfig.gridUnit/2)

    const vertexColor = this.getColor()
    const groupStyles: React.CSSProperties = {
      cursor: selected && writeable ? 'grab' : 'pointer',
      pointerEvents: this.allowPointerEvents() ? 'auto' : 'none',
      display:this.props.shouldHide?'none':'initial'

  }

    return (
      <DraggableCore
        handle='.handle'
        onStart={this.onDragStart}
        onDrag={writeable ? this.onDragMove : undefined}
        onStop={writeable ? this.onDragEnd : undefined}
        enableUserSelectHack={false} >
        <g className='vertex' transform={translate} ref={this.gRef} style={groupStyles}>
          <circle
            className="handle"
            r={vertexRadius}
            fill={isEntity ? vertexColor : 'white'}
            stroke={isEntity ? 'none' : vertexColor}
            onMouseOver={this.onMouseOver} onMouseOut={this.onMouseOut}
            />
          {this.props.isVisualLabelRedundant
            ? <rect
              x={vertex.label.length*3/-2}
              y={labelPosition.y}
              fill={vertexColor}
              fillOpacity="0.4"
              height='5px'
              width={`${vertex.label.length*3}px`}
            />
            : <VertexLabelRenderer
              center={labelPosition}
              label={vertex.label}
              type={vertex.type}
              onClick={this.onClick}
              color={vertexColor}
            />}

          {/* 'isEntity' constant can't be used here so that the effects of Vertex.isEntity type guard are applied  */}
          {vertex.isEntity() && <IconRenderer entity={entityManager.getEntity(vertex.entityId)} radius={vertexRadius}/>}
        </g>
      </DraggableCore>
    );
  }
}
