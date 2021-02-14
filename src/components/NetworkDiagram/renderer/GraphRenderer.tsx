import * as React from 'react'
import { Vertex, Point, Rectangle, Edge, GraphElement, Grouping } from 'NetworkDiagram/layout';
import {GraphContext, IGraphContext} from 'NetworkDiagram/GraphContext'
import { Canvas } from './Canvas'
import { EdgeRenderer } from './EdgeRenderer'
import { EdgeDrawer } from './EdgeDrawer'
import { VertexRenderer } from './VertexRenderer'
import { GroupingRenderer } from './GroupingRenderer'
import { modes } from 'components/NetworkDiagram/utils'



// Sure this numbers can be more accurate. screen size dpi, etc..

// Very important to have a margin between 2 thresholds. TBD;
const VISUAL_LABEL_THRESHOLD = 1.5;
const WINDOWING_THRESHOLD = 1.3;

interface IGraphRendererProps {
  svgRef: React.RefObject<SVGSVGElement>,
  animateTransition: boolean,
  actions: any,
}
export class GraphRenderer extends React.Component<IGraphRendererProps> {
  static contextType = GraphContext;
  context!: IGraphContext;
  constructor(props: any) {
    super(props)
    this.selectElement = this.selectElement.bind(this);
    this.selectArea = this.selectArea.bind(this);
    this.dragSelection = this.dragSelection.bind(this);
    this.dropSelection = this.dropSelection.bind(this);
    this.clearSelection = this.clearSelection.bind(this);
  }

  dragSelection(offset: Point, initialPosition?: Point) {
    const { layout, updateLayout } = this.context;
    layout.dragSelection(offset, initialPosition)
    updateLayout(layout)
  }

  dropSelection() {
    const { layout, updateLayout } = this.context;
    const shouldUpdateHistory = layout.dropSelection()
    updateLayout(layout, null, { modifyHistory:shouldUpdateHistory })
  }

  clearSelection() {
    const { layout, updateLayout } = this.context;
    layout.clearSelection()
    updateLayout(layout)
  }

  selectElement(element: GraphElement | Array<GraphElement>, options?: any) {
    const { layout, updateLayout } = this.context;
    layout.selectElement(element, options);
    updateLayout(layout, null, { clearSearch: true });
  }

  selectArea(area: Rectangle) {
    const { layout, updateLayout } = this.context;
    layout.selectArea(area)
    updateLayout(layout, null, { clearSearch: true })
  }

  renderGroupings() {
    const { layout } = this.context;
    const { actions } = this.props;
    const groupings = layout.getGroupings();
    return groupings.map((grouping: Grouping) => {
      const vertices = grouping.getVertices()

      return (
        <GroupingRenderer
          key={grouping.id}
          grouping={grouping}
          vertices={vertices}
          selectGrouping={this.selectElement}
          dragSelection={this.dragSelection}
          dropSelection={this.dropSelection}
          actions={actions}
          layoutConfig={layout.config}
          writeable={this.context.writeable}
          interactionMode={this.context.interactionMode}
          isGroupingMemberSelected={layout.isGroupingMemberSelected}
          isGroupingSelected={layout.isGroupingSelected}
          notSelected={layout.selection.length===0}
        />
      )
    })
  }

  renderEdges(viewBoxRect:Rectangle) {
    const { layout, viewport } = this.context;
    const { svgRef } = this.props;


    const isVisualLabelRedundant = viewport.zoomLevel > VISUAL_LABEL_THRESHOLD;
    const isWorthWindowing = viewport.zoomLevel < WINDOWING_THRESHOLD;


    const edges = isWorthWindowing ? layout.getEdges().filter((edge: Edge) => {
      return !edge.isHidden() && !viewBoxRect.overlaps(edge.getRect())
    }): layout.getEdges().filter((edge: Edge) => {
      return !edge.isHidden()
    })

    return edges.map((edge: Edge) => {
      const vertex1 = layout.vertices.get(edge.sourceId);
      const vertex2 = layout.vertices.get(edge.targetId);
      return <EdgeRenderer
        key={edge.id}
        svgRef={svgRef}
        edge={edge}
        vertex1={vertex1}
        vertex2={vertex2}
        selectEdge={this.selectElement}
        dragSelection={this.dragSelection}
        dropSelection={this.dropSelection}
        layoutConfig={layout.config}
        isEdgeHighlighted={layout.isEdgeHighlighted}
        noneSelected={layout.selection.length===0}
        isVisualLabelRedundant={isVisualLabelRedundant}
        writeable={this.context.writeable}
      />
    })
  }

  renderVertices(viewBoxRect:Rectangle) {
    const { layout, viewport } = this.context;
    const { actions } = this.props;

    const isVisualLabelRedundant = viewport.zoomLevel > VISUAL_LABEL_THRESHOLD;
    const isWorthWindowing = viewport.zoomLevel < WINDOWING_THRESHOLD;

    const vertices = layout.getVertices().filter(function vertexFilter(vertex: Vertex) {return  !vertex.isHidden()})



    return vertices.map((vertex: Vertex) =>
      <VertexRenderer
        key={vertex.id}
        vertex={vertex}
        selectVertex={this.selectElement}
        dragSelection={this.dragSelection}
        dropSelection={this.dropSelection}
        actions={actions}
        writeable={this.context.writeable}
        layoutConfig={this.context.layout.config}
        isElementSelected={this.context.layout.isElementSelected}
        entityManager={this.context.entityManager}
        interactionMode={this.context.interactionMode} // pass down only necessary flags.
        noneSelected={layout.selection.length===0}
        isVisualLabelRedundant={isVisualLabelRedundant}
        shouldHide={isWorthWindowing && !viewBoxRect.contains(vertex.position)}
      />
    )
  }

  getEdgeCreateSourcePoint() {
    const { layout, viewport } = this.context;

    const vertices = layout.getSelectedVertices()
    if (vertices && vertices.length) {
      return viewport.config.gridToPixel(vertices[0].getPosition())
    }
  }

  render(){
    const { interactionMode, viewport } = this.context;
    const { svgRef, animateTransition, actions } = this.props;
    const viewBoxRect = viewport.getViewBoxRect();
    return (
      <Canvas
        svgRef={svgRef}
        selectArea={this.selectArea}
        clearSelection={this.clearSelection}
        animateTransition={animateTransition}
        actions={actions}
        viewBox={viewport.viewBox}
      >
        {interactionMode === modes.EDGE_DRAW &&
          <EdgeDrawer
            svgRef={svgRef}
            sourcePoint={this.getEdgeCreateSourcePoint()}/>
        }
        {this.renderGroupings()}
        {this.renderEdges(viewBoxRect)}
        {this.renderVertices(viewBoxRect)}
      </Canvas>
    );
  }
}
