import React, { useEffect } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiButtonEmpty, EuiDragDropContext, euiDragDropReorder, EuiDroppable, EuiFlexGroup, EuiFlexItem, EuiFormErrorText, EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';

import { VisEditorOptionsProps } from '../../../../src/plugins/visualizations/public';
import { NumberInputOption, SelectOption } from '../../../../src/plugins/vis_default_editor/public';
import { FieldColumnEditor } from './field_column';
import { FieldParamEditor } from './field';
import { EnhancedTableVisParams } from './enhanced_table_vis_options';

export interface DocumentTableVisDataParams extends EnhancedTableVisParams {
  type: 'table';

  fieldColumns?: any[];

  hitsSize: number | '';
  sortField: any;
  sortOrder: string;
}

function sortOrderOptions() {
  return [
    {
      value: 'desc',
      text: i18n.translate('visTypeDocumentTable.params.sortOrderOptions.desc', {
        defaultMessage: 'Descending',
      }),
    },
    {
      value: 'asc',
      text: i18n.translate('visTypeDocumentTable.params.sortOrderOptions.asc', {
        defaultMessage: 'Ascending',
      }),
    }
  ];
}

function addFieldColumn(fieldColumns, setFieldColumns) {
  const newFieldColumn = {
    label: '',
    field: undefined,
    enabled: true,
    brandNew: true
  };

  setFieldColumns(fieldColumns.concat(newFieldColumn));
}

function onDragEnd(source, destination, fieldColumns, setFieldColumns) {
  if (source && destination) {
    const newFieldColumns = euiDragDropReorder(fieldColumns, source.index, destination.index);
    setFieldColumns(newFieldColumns);
  }
}

function getSortableFields(aggs) {
  return aggs.indexPattern.fields.filter(field => field.sortable);
}


function DocumentTableData({
  aggs,
  stateParams,
  setValidity,
  setValue,
}: VisEditorOptionsProps<DocumentTableVisDataParams>) {

  const isHitsSizeValid = stateParams.hitsSize > 0;
  const fieldColumnsError = undefined;
  const setFieldColumns = (newFieldColumns) => setValue('fieldColumns', newFieldColumns);

  useEffect(() => {
    setValidity(isHitsSizeValid);
  }, [isHitsSizeValid, setValidity]);

  return (
    <div className="enhanced-table-vis-params">

      {/* FIELD COLUMNS SECTION */}
      <EuiDragDropContext onDragEnd={ ({source, destination}) => onDragEnd(source, destination, stateParams.fieldColumns, setFieldColumns) }>
        <EuiPanel paddingSize="s">
          <EuiTitle size="xs">
            <h3>
              <FormattedMessage
                id="visTypeDocumentTable.params.fieldColumnsSection"
                defaultMessage="Columns"
              />
            </h3>
          </EuiTitle>
          <EuiSpacer size="s" />
          {fieldColumnsError && (
            <>
              <EuiFormErrorText>{fieldColumnsError}</EuiFormErrorText>
              <EuiSpacer size="s" />
            </>
          )}
          <EuiDroppable droppableId="document_table_field_columns">
            <>
              {stateParams.fieldColumns.map( (fieldColumn, index) => (
                <FieldColumnEditor
                  key={index}
                  fieldColumns={stateParams.fieldColumns}
                  fieldColumn={fieldColumn}
                  index={index}
                  setFieldColumns={setFieldColumns}
                  aggs={aggs}
                  setValidity={setValidity}
                />
              ))}
            </>
          </EuiDroppable>

          <EuiFlexGroup justifyContent="center" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType="plusInCircleFilled"
                onClick={ () => addFieldColumn(stateParams.fieldColumns, setFieldColumns)}
              >
                <FormattedMessage id="visTypeDocumentTable.params.fieldColumns.addFieldColumnLabel" defaultMessage="Add field column" />
              </EuiButtonEmpty>
            </EuiFlexItem>
          </EuiFlexGroup>

        </EuiPanel>
      </EuiDragDropContext>
      {/* /FIELD COLUMNS SECTION */}

      <EuiSpacer size="m" />

      {/* QUERY PARAMETERS SECTION */}
      <EuiPanel paddingSize="s">
        <EuiTitle size="xs">
          <h3>
            <FormattedMessage
              id="visTypeDocumentTable.params.queryParametersSection"
              defaultMessage="Query Parameters"
            />
          </h3>
        </EuiTitle>
        <EuiSpacer size="m" />

        <NumberInputOption
          label={i18n.translate('visTypeDocumentTable.params.hitsSize', {
            defaultMessage: 'Hits size',
          })}
          isInvalid={!isHitsSizeValid}
          min={1}
          paramName="hitsSize"
          value={stateParams.hitsSize}
          setValue={setValue}
        />

        <FieldParamEditor
          indexPatternFields = {getSortableFields(aggs)}
          showValidation = { true }
          value={stateParams.sortField}
          setValue={ value => setValue('sortField', value)}
        />

        <SelectOption
          label={i18n.translate('visTypeDocumentTable.params.sortOrder', {
            defaultMessage: 'Sort Order',
          })}
          options={sortOrderOptions()}
          paramName="sortOrder"
          value={stateParams.sortOrder}
          setValue={setValue}
        />

      </EuiPanel>
      {/* /QUERY PARAMETERS SECTION */}

    </div>
  );
}

export { DocumentTableData };
