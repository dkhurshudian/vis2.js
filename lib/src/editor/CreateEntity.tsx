import * as React from 'react'
import {SelectSchema} from './SelectSchema';
import {GraphLayout, GraphUpdateHandler} from '../layout';
import {Entity, Schema} from '@alephdata/followthemoney';
import {Divider} from '@blueprintjs/core';
import {EntityEditor} from './EntityEditor';

interface ICreateEntityProps {
  layout: GraphLayout
  subsequentOf: Schema
  updateLayout:GraphUpdateHandler
}

interface ICreateEntityState {
  entity?: Entity
}

export class CreateEntity extends React.Component<ICreateEntityProps, ICreateEntityState> {
  constructor(props: ICreateEntityProps) {
    super(props);
    this.onSchemaSelect = this.onSchemaSelect.bind(this);
    this.appendToLayout = this.appendToLayout.bind(this)
  }
  state:ICreateEntityState = {}

  appendToLayout(entity: Entity){
    const { layout } = this.props
    layout.addEntity(entity);
    layout.layout();
    this.props.updateLayout(layout)
  }

  onSchemaSelect(schema: Schema) {
    this.setState(({entity})=>{
      // generates a new entity based on selected schema
      const nextEntity = this.props.layout.model.createEntity(schema);

      // transfer values from old entity to new one where applicable
      if(entity){
        // stores properties which has a value
        const nextEntityProps = nextEntity.schema.getProperties()
        entity.getProperties()
          .forEach(property => {
            // identifies if next and prev properties are similar
            const similarProp = nextEntityProps.has(property.name) && nextEntityProps.get(property.name);
            if(similarProp && (similarProp.type === property.type)){
              // this is the case when we can save the value
              nextEntity.properties.set(similarProp, entity.getProperty(property))
            }
          })
      }


      return ({
        entity: nextEntity
      })
    })
  }

  render() {
    const {layout, subsequentOf} = this.props;
    const {entity} = this.state;
    return <div>
      <SelectSchema
        disabled={!!entity && !!entity.getProperties().length}
        model={layout.model}
        subsequentOf={subsequentOf}
        onSchemaSelect={this.onSchemaSelect}
      />
      <Divider />
      {entity && <EntityEditor
        onEntityChanged={this.appendToLayout}
        entity={entity}
      /> }
    </div>
  }
}