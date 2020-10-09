import React from 'react';
import { defineMessages, injectIntl, WrappedComponentProps } from 'react-intl';
import Datasheet from 'react-datasheet';
import _ from 'lodash';
import { Button, Checkbox, Classes, Icon, Intent, Tooltip } from "@blueprintjs/core";
import { Entity, Property as FTMProperty, Schema, Value } from "@alephdata/followthemoney";
import { PropertyEditor, PropertySelect } from 'editors';
import { Property } from 'types';
import { EntityManager } from 'components/common/EntityManager';
import { SortType } from 'components/common/types/SortType';
import { showErrorToast, validate } from 'utils';

import "./TableEditor.scss"

const messages = defineMessages({
  add: {
    id: 'table_editor.add_row',
    defaultMessage: 'Add a new {schema} row',
  },
  remove: {
    id: 'table_editor.remove_row',
    defaultMessage: 'Remove new {schema} row',
  },
});

const ESC_KEY = 27;

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
  component?: any
}

interface ITableEditorProps extends WrappedComponentProps {
  schema: Schema
  sort: SortType | null
  sortColumn: (field: string) => void
  selection: Array<string>
  updateSelection: (entityId: string) => void
  entityManager: EntityManager
  writeable: boolean
  isPending?: boolean
  updateFinishedCallback?: () => void
  visitEntity?: (entity: Entity | string) => void
}

interface ITableEditorState {
  addedColumns: Array<FTMProperty>
  headerRow: CellData[]
  showTopAddRow: boolean
  entityRows: CellData[][]
  createdEntityIds: string[]
}

class TableEditorBase extends React.Component<ITableEditorProps, ITableEditorState> {
  private keyDownListener: any;

  constructor(props:ITableEditorProps) {
    super(props);

    this.state = {
      addedColumns: [],
      headerRow: [],
      showTopAddRow: false,
      entityRows: [],
      createdEntityIds: [],
    }

    this.toggleTopAddRow = this.toggleTopAddRow.bind(this);
    this.onAddColumn = this.onAddColumn.bind(this);
    this.getVisibleProperties = this.getVisibleProperties.bind(this);
    this.getNonVisibleProperties = this.getNonVisibleProperties.bind(this);
  }

  componentDidMount() {
    this.regenerateTable();
  }

  componentDidUpdate(prevProps: ITableEditorProps, prevState: ITableEditorState) {
    const { entityManager, selection, sort, writeable } = this.props;
    const { addedColumns, showTopAddRow } = this.state;

    const entitiesLength = entityManager.entities.size;
    const prevEntitiesLength = prevProps.entityManager.entities.size;

    const entitiesDeleted = prevEntitiesLength > entitiesLength;
    const entitiesAdded = prevEntitiesLength < entitiesLength;
    const sortChanged = prevProps.sort?.field !== sort?.field || prevProps.sort?.direction !== sort?.direction;
    const selectionChanged = prevProps.selection !== selection;
    const topAddRowToggled = prevState.showTopAddRow !== showTopAddRow;

    if (prevState.addedColumns !== addedColumns || sortChanged || entitiesDeleted) {
      this.regenerateTable();
      return;
    } else if (entitiesAdded) {
      this.appendAdditionalEntities(prevProps.entityManager.getEntities());
    } else if (writeable && selectionChanged) {
      this.reflectUpdatedSelection();
    }
    if (topAddRowToggled) {
      this.regenerateHeader();
    }
  }

  regenerateTable = () => {
    this.setState({
      showTopAddRow: false,
      headerRow: this.getHeaderRow(),
      entityRows: this.getEntityRows(),
      createdEntityIds: [],
    });
  }

  regenerateHeader = () => {
    this.setState({
      headerRow: this.getHeaderRow(),
    });
  }

  appendAdditionalEntities(prevEntities: Array<Entity>) {
    const { entityManager } = this.props;
    const { createdEntityIds } = this.state;
    const entities = entityManager.getEntities();
    let newEntities = _.differenceBy(entities, prevEntities, e => e.id);
    if (createdEntityIds.length) {
      newEntities = newEntities.filter(e => (createdEntityIds.indexOf(e.id) < 0));
    }

    if (newEntities.length) {
      const visibleProps = this.getVisibleProperties();

      this.setState(({ entityRows }) => ({
        headerRow: this.getHeaderRow(),
        entityRows: [...entityRows, ...newEntities.map(e => this.getEntityRow(e, visibleProps))]
      }));
    }
  }

  reflectUpdatedSelection() {
    const { visitEntity } = this.props;
    const checkboxCellIndex = visitEntity ? 1 : 0;
    this.setState(({ entityRows }) => ({
      entityRows: entityRows?.map(row => {
        const checkboxCell = row[checkboxCellIndex];
        const newCheckboxCell = checkboxCell?.data?.entity ? this.getCheckboxCell(checkboxCell.data.entity) : checkboxCell;
        row.splice(checkboxCellIndex, 1, newCheckboxCell);
        return row;
      })
    }));
  }

  getVisibleProperties() {
    const { entityManager, schema } = this.props;
    const { addedColumns } = this.state;

    const requiredProps = schema.required.map(name => schema.getProperty(name));
    const featuredProps = schema.getFeaturedProperties();
    const filledProps = entityManager.getEntities()
      .reduce((acc, entity: Entity) => [...acc, ...entity.getProperties()], [] as FTMProperty[]);

    const fullList = _.uniqBy([...requiredProps, ...featuredProps, ...filledProps, ...addedColumns], 'name');

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

  getHeaderRow = () => {
    const { visitEntity, writeable } = this.props;
    const visibleProps = this.getVisibleProperties();

    const headerCells = visibleProps.map(property => this.getHeaderCell(property));
    const entityLinkPlaceholder = visitEntity != undefined ? [this.getEntityLinkCell()] : [];

    if (writeable) {
      const addEntityCell = this.getAddEntityCell();
      const propSelectCell = this.getPropSelectCell();
      return [...entityLinkPlaceholder, addEntityCell, ...headerCells, propSelectCell];
    } else {
      return [...entityLinkPlaceholder, ...headerCells];
    }
  }

  getEntityRows = () => {
    const { entityManager } = this.props;
    const visibleProps = this.getVisibleProperties();

    return entityManager.getEntities().map(e => this.getEntityRow(e, visibleProps));
  }

  getEntityRow = (entity: Entity, visibleProps: Array<FTMProperty>) => {
    const { visitEntity, writeable } = this.props;

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

    const entityLinkCell = visitEntity != undefined ? [this.getEntityLinkCell(entity)] : [];

    if (!writeable) {
      return [...entityLinkCell, ...propCells];
    } else {
      const checkbox = this.getCheckboxCell(entity);
      return [...entityLinkCell, checkbox, ...propCells];
    }
  }

  getCheckboxCell = (entity: Entity) => {
    const { selection } = this.props;
    const isSelected = selection.indexOf(entity.id) > -1;
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

  getSkeletonRows = () => {
    const { visitEntity, writeable } = this.props;
    const visibleProps = this.getVisibleProperties();
    const skeletonRowCount = 8;
    const entityLinkPlaceholder = visitEntity != undefined ? [this.getEntityLinkCell()] : [];
    const actionCellPlaceholder = writeable ? [{...getCellBase('checkbox')}] : [];
    const skeletonRow = [
      ...entityLinkPlaceholder,
      ...actionCellPlaceholder,
      ...(visibleProps.map(() => ({ ...getCellBase('skeleton'), component: this.renderSkeleton() })))
    ];

    return (Array.from(Array(skeletonRowCount).keys())).map(() => skeletonRow);
  }

  getAddRow = () => {
    const { visitEntity } = this.props;
    const entityLinkPlaceholder = visitEntity != undefined ? [this.getEntityLinkCell()] : [];
    const visibleProps = this.getVisibleProperties();

    const addRowCells = visibleProps.map(property => ({
      ...getCellBase('property'),
      data: { entity: null, property }
    }));

    return [...entityLinkPlaceholder, {...getCellBase('checkbox')}, ...addRowCells]
  }

  // Table renderers

  renderValue = ({ cell }: Datasheet.ValueViewerProps<CellData, any>) => {
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

  renderPropValue = ({entity, property}: {entity: Entity, property: FTMProperty}) => {
    const { entityManager, visitEntity } = this.props;

    const values = entity.getProperty(property.name);
    const cellContents = (
      <Property.Values
        values={values}
        prop={property}
        resolveEntityReference={entityManager.resolveEntityReference}
      />
    );
    const showVisitLink = visitEntity && property.type.name === 'entity' && values.length;
    if (showVisitLink) {
      return (
        <div className="TableEditor__overflow-container">
          <Button
            minimal
            small
            rightIcon={<Icon icon="fullscreen" iconSize={12} className="TableEditor__link-cell__icon" />}
            className="TableEditor__link-cell"
            onClick={() => visitEntity && visitEntity(values[0])}
          >
            {cellContents}
          </Button>
        </div>
      );
    }
    return (
      <div className="TableEditor__overflow-container">
        {cellContents}
      </div>
    );
  }

  renderEditor = ({ cell, onCommit, onChange, onRevert }: Datasheet.DataEditorProps<CellData, any>) => {
    const { entityManager, schema } = this.props;
    const { entity, property } = cell.data;

    if (!property) return null;

    if (!this.keyDownListener) {
      this.keyDownListener = (e:any) => { if (e.which === ESC_KEY) onRevert() };
      document.addEventListener('keydown', this.keyDownListener);
    }

    return (
      <PropertyEditor
        entity={entity || new Entity(entityManager.model, { schema, id: `${Math.random()}` })}
        property={property}
        onChange={onChange}
        onSubmit={(entity:Entity) => {
          if (this.keyDownListener) {
            document.removeEventListener('keydown', this.keyDownListener);
            this.keyDownListener = null;
          }
          onCommit(entity.getProperty(property));
        }}
        popoverProps={{ usePortal: false }}
        fetchEntitySuggestions={(queryText: string, schemata?: Array<Schema>) => entityManager.getEntitySuggestions(false, queryText, schemata)}
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
    const { showTopAddRow } = this.state;
    return (
      <Tooltip content={intl.formatMessage(messages[showTopAddRow ? 'remove' : 'add'], { schema: schema.label })}>
        <Button icon={showTopAddRow ? 'remove' : 'add'} onClick={this.toggleTopAddRow} intent={Intent.PRIMARY} minimal />
      </Tooltip>
    );
  }

  renderPropertySelect = () => {
    return (
      <PropertySelect
        properties={this.getNonVisibleProperties()}
        onSelected={this.onAddColumn}
        buttonProps={{minimal: true, intent: Intent.PRIMARY }}
      />
    )
  }

  renderCheckbox = ({ entity, isSelected }: {entity: Entity, isSelected: boolean}) => {
    return (
      <Checkbox checked={isSelected} onChange={() => this.props.updateSelection(entity.id)} />
    );
  }

  renderEntityLinkButton = ({ entity }: {entity: Entity}) => {
    const { visitEntity } = this.props;
    if (visitEntity == undefined) return null;

    return (
      <Button minimal small icon="fullscreen" onClick={() => visitEntity(entity)} />
    );
  }

  renderSkeleton = () => {
    const skeletonLength = 15;
    return (
      <span className={Classes.SKELETON}>{'-'.repeat(skeletonLength)}</span>
    );
  }

  // Change handlers

  handleNewRow = (row: number, changes: any) => {
    const { intl, schema } = this.props;
    const { entityRows, showTopAddRow } = this.state;
    const visibleProps = this.getVisibleProperties();
    const entityData = { schema, properties: {} };
    const shouldPrepend = showTopAddRow && row === 1;

    changes.forEach(({ cell, value, col }: any) => {
      const property = cell?.data?.property || entityRows[0][col]?.data?.property;
      const error = validate({ schema, property, values: value });

      if (error) {
        showErrorToast(intl.formatMessage(error));
      } else {
        entityData.properties[property.name] = value;
      }
    })

    const entity = this.props.entityManager.createEntity(entityData);
    const newEntityRow = this.getEntityRow(entity, visibleProps);

    this.setState(({ entityRows, createdEntityIds, showTopAddRow }) => {
      return ({
        entityRows: shouldPrepend ? [newEntityRow, ...entityRows] : [...entityRows, newEntityRow],
        createdEntityIds: [...createdEntityIds, entity.id],
        showTopAddRow: shouldPrepend ? false : showTopAddRow,
      })
    });
  }

  handleExistingRow = (changes: Datasheet.CellsChangedArgs<CellData, any> | Datasheet.CellAdditionsArgs<CellData>) => {
    const { intl } = this.props;

    let changedEntity;
    changes.forEach(({ cell, value }: any) => {
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
    const { updateFinishedCallback } = this.props;
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
    this.setState(({addedColumns}) => ({
      addedColumns: [...addedColumns, newColumn],
    }));
  }

  toggleTopAddRow() {
    this.setState(({ showTopAddRow }) => ({
      showTopAddRow: !showTopAddRow,
    }));
  }

  render() {
    const { isPending, writeable } = this.props;
    const { headerRow, showTopAddRow, entityRows } = this.state
    const bottomAddRow = writeable ? [this.getAddRow()] : [];
    const skeletonRows = isPending ? this.getSkeletonRows() : [];
    const topAddRow = showTopAddRow ? [this.getAddRow()] : [];
    const tableData = [headerRow, ...topAddRow, ...entityRows, ...skeletonRows, ...bottomAddRow]

    return (
      <div className="TableEditor">
        <Datasheet
          data={tableData}
          valueRenderer={(cell: CellData) => cell.value}
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