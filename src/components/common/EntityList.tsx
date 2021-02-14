import React, {memo} from 'react';
import { Entity, Schema as FtMSchema } from '@alephdata/followthemoney';
import { Menu, Icon } from '@blueprintjs/core'
import { Schema } from 'types';
import groupBy from 'lodash/groupBy'
import './EntityList.scss';


interface IEntityListProps {
  entities: Array<Entity>
  onEntitySelected?: (selection: Entity) => void
  onEntityRemoved?: (selection: Entity) => void
}

interface IEntityListState{
  entityGroups: Array<[FtMSchema['plural'], Array<Entity>]>
}
export class EntityList extends React.PureComponent<IEntityListProps, IEntityListState>{
  // NOTE: This piece will be executed every time a tick happens, 99% of time unnecessary taking
  //       more than 60% of computation time for every frame

  // static getDerivedStateFromProps(props:IEntityListProps){
  //   const {entities} = props;
  //   const entityGroups = Object.entries(groupBy(entities, (e:Entity) => e.schema.plural)).map(([groupName, group]) => {
  //     return [
  //       groupName,
  //       group.sort((a, b) => a.getCaption().toLowerCase() > b.getCaption().toLowerCase() ? 1 : -1)
  //     ]
  //   })
  //
  //   return {entityGroups};
  // }
  constructor(props: IEntityListProps) {
    super(props)

    this.renderItem = this.renderItem.bind(this)
  }

  renderItem(entity:Entity) {
    const { onEntityRemoved, onEntitySelected } = this.props;

    return (
      <li className="EntityList__item" key={entity.id}>
        <div
          className="EntityList__item__left bp3-menu-item"
          onClick={() => onEntitySelected && onEntitySelected(entity)}
        >
            <Schema.Icon schema={entity.schema} />
            <div className="bp3-fill">
              {entity.getCaption()}
            </div>
        </div>
        {onEntityRemoved && (
          <div
            className="EntityList__item__right"
            onClick={() => onEntityRemoved(entity)}
          >
            <Icon icon="cross" iconSize={14} />
          </div>
        )}
      </li>
    )
  }

  render() {
    // const { entityGroups } = this.state;

    return <i><br/> <b>Total entities - </b>{this.props.entities.length}</i>
  }
}
