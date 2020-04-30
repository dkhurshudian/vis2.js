import React from 'react';
import { Schema as FTMSchema, IconRegistry } from '@alephdata/followthemoney';
import { Icon } from '@blueprintjs/core';
import c from 'classnames';
import './Schema.scss';

interface ISchemaCommonProps {
  schema: FTMSchema,
  className?: string,
  size?: number
}

class SchemaIcon extends React.Component<ISchemaCommonProps>{
  render() {
    const { className, schema, size = 16 } = this.props;
    const iconPaths = IconRegistry.getSchemaIcon(schema);
    return (
      <svg className={c("SchemaIcon", className)} viewBox={'0 0 24 24'} height={size} width={size}>
        {iconPaths.map((d, i) => <path key={i} d={d}/>)}/>
      </svg>
    );
  }
}

interface ISchemaLabelProps extends ISchemaCommonProps {
  plural?:boolean
  icon?:boolean
}

class SchemaLabel extends React.Component<ISchemaLabelProps> {
  render() {
    const { schema, plural = false, icon } = this.props;
    const label = plural ? schema.plural : schema.label;
    if (icon) {
      return (
        <span className="SchemaLabel">
          <Schema.Icon schema={schema} className="left-icon" />
          {label}
        </span>
      );
    }
    return label;
  }
}

interface ISchemaLinkProps extends ISchemaCommonProps {
  plural?:boolean
  url:string
}

class Schema extends React.Component {
  static Label = SchemaLabel;

  static Icon = SchemaIcon;
}

export default Schema;
