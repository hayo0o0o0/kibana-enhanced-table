import _ from 'lodash';
import { getSearchService } from '../services';
import { handleCourierRequest } from './kibana_cloned_code/courier';

export async function enhancedTableRequestHandler ({
  partialRows,
  metricsAtAllLevels,
  visParams,
  timeRange,
  query,
  filters,
  inspectorAdapters,
  forceFetch,
  aggs,
  queryFilter,
  searchSessionId
}) {

  const filterManager = queryFilter;
  const MAX_HITS_SIZE = 10000;

  // create search source with query parameters
  const searchService = getSearchService();
  const searchSource = await searchService.searchSource.create();
  searchSource.setField('index', aggs.indexPattern);
  let hitsSize = (visParams.hitsSize !== undefined ? Math.min(visParams.hitsSize, MAX_HITS_SIZE) : 0);
  searchSource.setField('size', hitsSize);

  // specific request params for "field columns"
  if (visParams.fieldColumns !== undefined) {
    if (!visParams.fieldColumns.some(fieldColumn => fieldColumn.field.name === '_source')) {
      searchSource.setField('_source', visParams.fieldColumns.map(fieldColumn => fieldColumn.field.name));
    }
    searchSource.setField('docvalue_fields', visParams.fieldColumns.filter(fieldColumn => fieldColumn.field.readFromDocValues).map(fieldColumn => fieldColumn.field.name));
    const scriptFields = {};
    visParams.fieldColumns.filter(fieldColumn => fieldColumn.field.scripted).forEach(fieldColumn => {
      scriptFields[fieldColumn.field.name] = {
        script: {
          source: fieldColumn.field.script
        }
      };
    });
    searchSource.setField('script_fields', scriptFields);
  }

  // set search sort
  if (visParams.sortField !== undefined) {
    searchSource.setField('sort', [{
      [visParams.sortField.name]: {
        order: visParams.sortOrder
      }
    }]);
    if ((visParams.hitsSize !== undefined && visParams.hitsSize > MAX_HITS_SIZE) || visParams.csvFullExport) {
      searchSource.getField('sort').push({'_id': {'order': 'asc','unmapped_type': 'keyword'}});
    }
  }

  // add 'count' metric if there is no input column
  if (aggs.aggs.length === 0) {
    aggs.createAggConfig({
      id: '1',
      enabled: true,
      type: 'count',
      schema: 'metric',
      params: {}
    });
  }

  // execute elasticsearch query
  const request = {
    searchSource: searchSource,
    aggs: aggs,
    indexPattern: aggs.indexPattern,
    timeRange: timeRange,
    query: query,
    filters: filters,
    forceFetch: forceFetch,
    metricsAtAllLevels: metricsAtAllLevels,
    partialRows: partialRows,
    inspectorAdapters: inspectorAdapters,
    filterManager: filterManager,
    searchSessionId: searchSessionId
  };
  const response = await handleCourierRequest(request);

  // set 'split tables' direction
  const splitAggs = aggs.bySchemaName('split');
  if (splitAggs.length > 0) {
    splitAggs[0].params.row = visParams.row;
  }

  // enrich response: total & aggs
  response.totalHits = _.get(searchSource, 'finalResponse.hits.total', -1);
  response.aggs = aggs;

  // enrich columns: aggConfig
  response.columns.forEach( column => {
    column.aggConfig = aggs.byId(column.meta.sourceParams.id);
  });

  // enrich response: hits
  if (visParams.fieldColumns !== undefined) {
    response.fieldColumns = visParams.fieldColumns;
    response.hits = _.get(searchSource, 'finalResponse.hits.hits', []);

    // continue requests until expected hits size is reached
    if (visParams.hitsSize !== undefined && visParams.hitsSize > MAX_HITS_SIZE && response.totalHits > MAX_HITS_SIZE) {
      let remainingSize = visParams.hitsSize;
      do {
        remainingSize -= hitsSize;
        const searchAfter = response.hits[response.hits.length - 1].sort;
        hitsSize = Math.min(remainingSize, MAX_HITS_SIZE);
        searchSource.setField('size', hitsSize);
        searchSource.setField('search_after', searchAfter);
        await handleCourierRequest(request);
        const nextResponseHits = _.get(searchSource, 'finalResponse.hits.hits', []);
        for (let i = 0; i < nextResponseHits.length; i++) {
          response.hits.push(nextResponseHits[i]);
        }
      } while (remainingSize > hitsSize);
    }

    // put request on response, if full csv download is enabled
    if (visParams.csvFullExport) {
      response.request = request;
    }
  }

  // return elasticsearch response
  return response;
}