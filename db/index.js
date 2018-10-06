/**
 * Copyright 2018 Intel Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ----------------------------------------------------------------------------
 */
'use strict'

const config = require('../config.json');
const rethinkDBAdaptor = require('./rethink');

const connect = () => {
  return rethinkDBAdaptor.connect()
}

// Runs a specified query against a database table
const queryTable = (table, query, removeCursor = true) => {
  return rethinkDBAdaptor.queryTable(table, query, removeCursor)
}

// Use for queries that modify a table, turns error messages into errors
const modifyTable = (table, query) => {
  return rethinkDBAdaptor.modifyTable(table, query);
}

module.exports = {
  connect,
  queryTable,
  modifyTable
}
