import { defaultModel, Entity, Model, IEntityDatum } from '@alephdata/followthemoney'


export interface IEntityManagerProps {
  model?: Model,
  createEntity?: (entityData: IEntityDatum) => Promise<IEntityDatum>,
  updateEntity?: (entity: Entity) => void,
  deleteEntity?: (entityId: string) => void,
}

export class EntityManager {
  public readonly model: Model
  private overload: any

  constructor(props?: IEntityManagerProps) {
    if (props) {
      const { model, ...rest } = props;
      this.model = model || new Model(defaultModel)
      this.overload = rest;
    } else {
      this.model = new Model(defaultModel);
    }
  }

  async createEntity(entityData: any) {
    if (this.overload?.createEntity) {
      const entityWithId: IEntityDatum = await this.overload.createEntity(entityData);
      return new Entity(this.model, entityWithId);
    } else {
      const { schema, properties } = entityData;
      const entity = this.model.createEntity(schema);
      if (properties) {
        Object.entries(properties).forEach(([prop, value]: [string, any]) => (
          entity.setProperty(prop, value)
        ));
      }

      return entity;
    }
  }

  updateEntity(entity: Entity) {
    if (this.overload?.updateEntity) {
      this.overload.updateEntity(entity);
    }
  }

  deleteEntity(entityId: string) {
    if (this.overload?.deleteEntity) {
      this.overload.deleteEntity(entityId);
    }
  }

  // entity changes in the reverse direction require undoing create/delete operations
  applyEntityChanges(entityChanges: any, factor: number) {
    const { created, updated, deleted } = entityChanges;

    created && created.forEach((entity: Entity) => factor > 0 ? this.updateEntity(entity) : this.deleteEntity(entity.id));
    updated && updated.forEach((entity: Entity) => this.updateEntity(entity));
    deleted && deleted.forEach((entity: Entity) => factor > 0 ? this.deleteEntity(entity.id) : this.updateEntity(entity));
  }
}