import React from 'react';
import { defineMessages, injectIntl, WrappedComponentProps } from 'react-intl';
import _ from 'lodash';
import { GraphUpdateHandler } from '../GraphContext';
import { PropertyEditor } from './PropertyEditor';
import { Property } from '../types';
import { EntityManager } from '../EntityManager';
import { SelectProperty } from './SelectProperty';
import { TruncatedFormat } from "@blueprintjs/table";
import { Button, Checkbox, Classes, Icon, Intent, Popover, Position, Tooltip } from "@blueprintjs/core";
import { Entity, Property as FTMProperty, Schema, Value, Values } from "@alephdata/followthemoney";
import Datasheet from 'react-datasheet';
import { SortType } from './SortType';
import { showErrorToast } from './toaster';
import { validate } from './utils';

import "./TableEditor.scss"

const messages = defineMessages({
  add: {
    id: 'table_editor.add_entity',
    defaultMessage: 'Create a new {schema}',
  },
});

const readOnlyCellProps = { readOnly: true, disableEvents: true, forceComponent: true };
const getCellBase = (type: string) => ({
  className: type,
  ...(type !== 'property' ? readOnlyCellProps : {})
})

const propSort = (a:FTMProperty, b:FTMProperty) => (a.label > b.label ? 1 : -1);

export interface CellData extends Datasheet.Cell<CellData, any> {
  className: string
  value?: any,
  displayValue?: any,
  data?: any,
}

interface ITableEditorProps extends WrappedComponentProps {
  entities: Array<Entity>
  schema: Schema
  sort: SortType | null
  sortColumn: (field: string) => void
  selection: Array<Entity>
  updateSelection: (entity: Entity) => void
  entityManager: EntityManager
  writeable: boolean
  isPending?: boolean
  updateFinishedCallback?: () => void
  visitEntity: (entity: Entity) => void
}

interface ITableEditorState {
  addedProps: Array<FTMProperty>
  shouldCommit: boolean
  tableData?: CellData[][]
}

class TableEditorBase extends React.Component<ITableEditorProps, ITableEditorState> {
  constructor(props:ITableEditorProps) {
    super(props);

    this.state = {
      addedProps: [],
      shouldCommit: false
    }

    this.onShowTopAddRow = this.onShowTopAddRow.bind(this);
    this.onAddColumn = this.onAddColumn.bind(this);
  }

  componentDidMount() {
    this.setState({
      tableData: this.getTableData(),
    });
  }

  componentDidUpdate(prevProps: ITableEditorProps, prevState: ITableEditorState) {
    const { entities, isPending, selection, sort } = this.props;
    const { addedProps } = this.state;

    const emptyInitialLoad = entities.length === 0 && prevProps.isPending && !isPending

    const shouldRegenerate = emptyInitialLoad
      || prevProps.entities.length !== entities.length
      || prevProps.sort?.field !== sort?.field
      || prevProps.sort?.direction !== sort?.direction
      || prevState.addedProps !== addedProps;

    if (shouldRegenerate) {
      this.setState({
        tableData: this.getTableData(),
      })
    } else if (prevProps.selection !== selection) {
      this.reflectUpdatedSelection();
    }
  }

  reflectUpdatedSelection() {
    this.setState(({ tableData }) => ({
      tableData: tableData?.map(row => {
        const [firstCell, checkboxCell, ...rest] = row;
        const newCheckboxCell = checkboxCell?.data?.entity ? this.getCheckboxCell(checkboxCell.data.entity) : checkboxCell;
        return [firstCell, newCheckboxCell, ...rest];
      })
    }));
  }

  getVisibleProperties() {
    const { entities, schema } = this.props;
    const { addedProps } = this.state;

    const requiredProps = schema.required.map(name => schema.getProperty(name));
    const featuredProps = schema.getFeaturedProperties();
    const filledProps = entities.reduce((acc, entity: Entity) => [...acc, ...entity.getProperties()], [] as FTMProperty[]);

    const fullList = _.uniqBy([...requiredProps, ...featuredProps, ...filledProps, ...addedProps], 'name');

    return fullList.filter(prop => (!prop.stub && !prop.hidden));
  }

  getNonVisibleProperties() {
    const { schema } = this.props;
    const visibleProps = this.getVisibleProperties();

    return schema.getEditableProperties()
      .filter(prop => visibleProps.indexOf(prop) < 0)
      .sort(propSort);
  }

  // Table data initialization

  getTableData = () => {
    const visibleProps = this.getVisibleProperties()
    return [this.getTableHeader(visibleProps), ...this.getTableContent(visibleProps)]
  }

  getTableHeader = (visibleProps: Array<FTMProperty>) => {
    const { writeable } = this.props;

    const headerCells = visibleProps.map(property => this.getHeaderCell(property));
    const entityLinkCell = this.getEntityLinkCell();

    if (writeable) {
      const addEntityCell = this.getAddEntityCell();
      const propSelectCell = this.getPropSelectCell();
      return [entityLinkCell, addEntityCell, ...headerCells, propSelectCell];
    } else {
      return [entityLinkCell, ...headerCells];
    }
  }

  getTableContent = (visibleProps: Array<FTMProperty>) => {
    const { entities, isPending, writeable } = this.props;

    const entityRows = entities.map((e) => this.getEntityRow(e, visibleProps));
    const skeletonRows = isPending ? this.getSkeletonRows(visibleProps) : [];
    const bottomAddRow = writeable ? [this.getAddRow(visibleProps)] : [];

    return [...entityRows, ...skeletonRows, ...bottomAddRow];
  }

  getEntityRow = (entity: Entity, visibleProps: Array<FTMProperty>) => {
    const { writeable } = this.props;

    const propCells = visibleProps.map(property => {
      let values = entity.getProperty(property.name);
      if (property.type.name === 'entity') {
        values = values.map((v:Value) => typeof v === 'string' ? v : v.id);
      }

      return ({
        ...getCellBase('property'),
        readOnly: !writeable,
        value: values,
        data: { entity, property },
      })
    });

    const entityLinkCell = this.getEntityLinkCell(entity);

    if (writeable) {
      const checkbox = this.getCheckboxCell(entity);
      return [entityLinkCell, checkbox, ...propCells];
    } else {
      return [entityLinkCell, ...propCells];
    }
  }

  getCheckboxCell = (entity: Entity) => {
    const { selection } = this.props;
    const isSelected = selection.some(e => e.id === entity.id);
    return { ...getCellBase('checkbox'), data: { entity, isSelected }}
  }

  getEntityLinkCell = (entity?: Entity) => {
    return ({
      ...getCellBase('entity-link'),
      ...(entity ? {component: this.renderEntityLinkButton({ entity })} : {})
    })
  }

  getHeaderCell = (property: FTMProperty) => {
    return { ...getCellBase('header'), component: this.renderColumnHeader(property) };
  }

  getAddEntityCell = () => {
    return { ...getCellBase('add-button'), component: this.renderAddButton() };
  }

  getPropSelectCell = () => {
    return { ...getCellBase('prop-select'), component: this.renderPropertySelect() };
  }

  getSkeletonRows = (visibleProps: Array<FTMProperty>) => {
    const skeletonRowCount = 8;

    return (Array.from(Array(skeletonRowCount).keys())).map(key => {
      const propCells = visibleProps.map(() => ({ ...getCellBase('skeleton'), component: this.renderSkeleton() }));
      return [this.getEntityLinkCell(), {...getCellBase('checkbox')}, ...propCells];
    });
  }

  getAddRow = (visibleProps: Array<FTMProperty>) => {
    const placeholderCells = visibleProps.map(property => ({
      ...getCellBase('property'),
      data: { entity: null, property }
    }));
    return [this.getEntityLinkCell(), {...getCellBase('checkbox')}, ...placeholderCells]
  }

  // Table renderers

  renderValue = ({ cell, row }: Datasheet.ValueViewerProps<CellData, any>) => {
    if (!cell.data) return null;
    const { entity, property } = cell.data;

    if (entity && property) {
      return this.renderPropValue(cell.data)
    }
    if (entity) {
      return this.renderCheckbox(cell.data)
    }
    if (property) {
      return <span>—</span>
    }
    return null;
  }

  renderPropValue = ({entity, property}: {entity: Entity, property: FTMProperty}) => (
    <div className="TableEditor__overflow-container">
      <Property.Values
        values={entity.getProperty(property.name)}
        prop={property}
        resolveEntityReference={this.props.entityManager.resolveEntityReference}
      />
    </div>
  );

  renderEditor = ({ cell, onCommit, onChange, onKeyDown }: Datasheet.DataEditorProps<CellData, any>) => {
    const { entityManager, schema } = this.props;
    const { shouldCommit } = this.state;
    const { entity, property } = cell.data;

    if (!property) return null;

    if (shouldCommit) {
      this.setState({ shouldCommit: false });
      onCommit(null);
    }

    return (
      <PropertyEditor
        entity={entity || new Entity(entityManager.model, { schema, id: `${Math.random()}` })}
        property={property}
        onChange={(newVal) => onChange(newVal)}
        onSubmit={(ent) => { onChange(ent.getProperty(property)); this.setState({ shouldCommit: true }); }}
        usePortal={false}
        fetchEntitySuggestions={entityManager.getEntitySuggestions}
        resolveEntityReference={entityManager.resolveEntityReference}
      />
    );
  }

  renderColumnHeader = (property: FTMProperty) => {
    const { sort, sortColumn } = this.props;

    const isSorted = sort && sort.field === property.name;
    const sortIcon = isSorted ? (sort && sort.direction === 'asc' ? 'caret-up' : 'caret-down') : null;
    return (
      <Button
        onClick={() => sortColumn(property.name)}
        rightIcon={sortIcon}
        minimal
        fill
        text={property.label}
      />
    );
  }

  renderAddButton = () => {
    const { intl, schema } = this.props;
    return (
      <Tooltip content={intl.formatMessage(messages.add, { schema: schema.label })}>
        <Button icon="new-object" onClick={this.onShowTopAddRow} intent={Intent.PRIMARY} minimal />
      </Tooltip>
    );
  }

  renderPropertySelect = () => {
    return (
      <SelectProperty
        properties={this.getNonVisibleProperties()}
        onSelected={this.onAddColumn}
        buttonProps={{minimal: true, intent: Intent.PRIMARY }}
      />
    )
  }

  renderCheckbox = ({ entity, isSelected }: {entity: Entity, isSelected: boolean}) => {
    return (
      <Checkbox checked={isSelected} onChange={() => this.props.updateSelection(entity)} />
    );
  }

  renderEntityLinkButton = ({ entity }: {entity: Entity}) => {
    return (
      <Button minimal small icon="fullscreen" onClick={() => this.props.visitEntity(entity)} />
    );
  }

  renderSkeleton = () => {
    const skeletonLength = 15;
    return (
      <span className={Classes.SKELETON}>{'-'.repeat(skeletonLength)}</span>
    );
  }

  // Change handlers

  handleNewRow = async (row: number, changes: any) => {
    const { intl, schema } = this.props;
    const visibleProps = this.getVisibleProperties();
    const entityData = { schema, properties: {} };

    changes.forEach(({ cell, value, col }: any) => {
      const property = cell?.data?.property || visibleProps[col-1];
      const error = validate({ schema, property, values: value });
      if (error) {
        showErrorToast(intl.formatMessage(error));
      } else {
        entityData.properties[property.name] = value;
      }
    })

    const entity = await this.props.entityManager.createEntity(entityData);
    const newRow = this.getEntityRow(entity, visibleProps);

    this.setState(({ tableData }) => {
      if (tableData) {
        const shouldReplacePlaceholder = row === (tableData.length - 1) ? 0 : 1;
        tableData.splice(row, shouldReplacePlaceholder, newRow);
      }
      return { tableData };
    });
  }

  handleExistingRow = (changes: Datasheet.CellsChangedArgs<CellData, any> | Datasheet.CellAdditionsArgs<CellData>) => {
    const { intl, schema } = this.props;

    let changedEntity;
    changes.forEach(({ cell, value, row, col }: any) => {
      const { entity, property } = cell.data;
      const error = validate({ schema: entity.schema, property, values: value});

      if (error) {
        showErrorToast(intl.formatMessage(error));
      } else {
        if (value === "") {
          entity.properties.set(entity.schema.getProperty(property.name), []);
          cell.value = "";
        } else {
          entity.properties.set(entity.schema.getProperty(property.name), value);
          cell.value = value.map((v:Value) => typeof v === 'string' ? v : v.id);
        }
        changedEntity = entity;
      }
    })

    if (changedEntity) {
      this.props.entityManager.updateEntity(changedEntity);
    }
  }

  onCellsChanged = (changeList: Datasheet.CellsChangedArgs<CellData, any>, outOfBounds: Datasheet.CellAdditionsArgs<CellData>) => {
    const { entities, updateFinishedCallback } = this.props;
    const fullChangeList = outOfBounds ? [...changeList, ...outOfBounds] : changeList;
    const changesByRow = _.groupBy(fullChangeList, c => c.row);

    Object.entries(changesByRow).forEach(([rowIndex, changes]: [string, any]) => {
      const isExisting = changes[0]?.cell?.data?.entity != null;
      if (isExisting) {
        this.handleExistingRow(changes);
      } else {
        this.handleNewRow(+rowIndex, changes);
      }
    });

    if (updateFinishedCallback) {
      updateFinishedCallback();
    }
  }

  parsePaste(pastedString: string) {
    const lines = pastedString.split(/[\r\n]+/g)
    return lines.map(line => (
      line.split('\t').map(val => val.split(','))
    ));
  }

  onAddColumn(newColumn: FTMProperty) {
    this.setState(({addedProps}) => ({
      addedProps: [...addedProps, newColumn],
    }));
  }

  onShowTopAddRow() {
    const visibleProps = this.getVisibleProperties();
    const newRow = this.getAddRow(visibleProps);

    this.setState(({ tableData }) => {
      if (tableData) {
        tableData.splice(1, 0, newRow);
      }
      return { tableData };
    });
  }

  render() {
    const { tableData } = this.state

    if (!tableData) return null;

    return (
      <div className="TableEditor">
        <Datasheet
          data={tableData}
          valueRenderer={cell => cell.value}
          valueViewer={this.renderValue}
          dataEditor={this.renderEditor}
          onCellsChanged={this.onCellsChanged as Datasheet.CellsChangedHandler<CellData, CellData>}
          parsePaste={this.parsePaste as any}
        />
      </div>
    )
  }
}

export const TableEditor = injectIntl(TableEditorBase);
