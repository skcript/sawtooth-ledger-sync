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

const r = require('rethinkdb')
const config = require('../../config.json');
const _ = require('lodash')

const HOST = config.DB_HOST
const PORT = config.DB_PORT
const NAME = config.DB_NAME
const RETRY_WAIT = config.RETRY_WAIT
const AWAIT_TABLE = 'blocks'

// Connection to db for query methods, run connect before querying
let connection = null

const promisedTimeout = (fn, wait) => {
  return new Promise(resolve => setTimeout(resolve, wait)).then(fn);
}

const awaitDatabase = () => {
  return r.tableList().run(connection)
    .then(tableNames => {
      if (!tableNames.includes(AWAIT_TABLE)) {
        throw new Error()
      }
      console.log('Successfully connected to database:', NAME)
    })
    .catch(() => {
      console.warn('Database not initialized:', NAME)
      console.warn(`Retrying database in ${RETRY_WAIT / 1000} seconds...`)
      return promisedTimeout(awaitDatabase, RETRY_WAIT)
    })
}

const connect = () => {
  return r.connect({ host: HOST, port: PORT, db: NAME })
    .then(conn => {
      connection = conn
      return awaitDatabase()
    })
    .catch(err => {
      if (err instanceof r.Error.ReqlDriverError) {
        console.warn('Unable to connect to RethinkDB')
        console.warn(`Retrying in ${RETRY_WAIT / 1000} seconds...`)
        return promisedTimeout(connect, RETRY_WAIT)
      }
      throw err
    })
}

// Runs a specified query against a database table
const queryTable = (table, query, removeCursor = true) => {
  return query(r.table(table))
    .run(connection)
    .then(cursor => removeCursor ? cursor.toArray() : cursor)
    .catch(err => {
      console.error(`Unable to query "${table}" table!`)
      console.error(err.message)
      throw new Error(err.message)
    })
}

// Use for queries that modify a table, turns error messages into errors
const modifyTable = (table, query) => {
  return queryTable(table, query, false)
    .then(results => {
      if (!results) {
        throw new Error(`Unknown error while attempting to modify "${table}"`)
      }
      if (results.errors > 0) {
        throw new Error(results.first_error)
      }
      return results
    })
}

// Block Functions
const stateTables = config.DATABASES.map((dbConfig) => dbConfig.name)

const getForkedDocRemover = blockNum => tableName => {
  return modifyTable(tableName, table => {
    return table
      .filter(r.row('startBlockNum').ge(blockNum))
      .delete()
      .do(() => table.filter(doc => doc('endBlockNum').ge(blockNum)))
      .update({ endBlockNum: Number.MAX_SAFE_INTEGER })
  })
}

const resolveFork = block => {
  const defork = getForkedDocRemover(block.blockNum)
  return modifyTable('blocks', blocks => {
    return blocks
      .filter(r.row('blockNum').ge(block.blockNum))
      .delete()
      .do(() => blocks.insert(block))
  })
    .then(() => Promise.all(stateTables.map(tableName => defork(tableName))))
    .then(() => block)
}

const insert = block => {
  return modifyTable('blocks', blocks => {
    return blocks
      .get(block.blockNum)
      .do(foundBlock => {
        return r.branch(foundBlock, foundBlock, blocks.insert(block))
      })
  })
    .then(result => {
      // If the blockNum did not already exist, or had the same id
      // there is no fork, return the block
      if (!result.blockId || result.blockId === block.blockId) {
        return block
      }
      return resolveFork(block)
    })
}

// State Functions
const addBlockState = (tableName, indexName, indexValue, doc, blockNum) => {
  return modifyTable(tableName, table => {
    return table
      .getAll(indexValue, { index: indexName })
      .filter({ endBlockNum: Number.MAX_SAFE_INTEGER })
      .coerceTo('array')
      .do(oldDocs => {
        return oldDocs
          .filter({ startBlockNum: blockNum })
          .coerceTo('array')
          .do(duplicates => {
            return r.branch(
              // If there are duplicates, do nothing
              duplicates.count().gt(0),
              duplicates,

              // Otherwise, update the end block on any old docs,
              // and insert the new one
              table
                .getAll(indexValue, { index: indexName })
                .update({ endBlockNum: blockNum, latest: false })
                .do(() => {
                  return table.insert(_.assign({}, doc, {
                    startBlockNum: blockNum,
                    latest: true,
                    endBlockNum: Number.MAX_SAFE_INTEGER
                  }))
                })
            )
          })
      })
  })
}

const add = (protoName, obj, blockNum) => {
  var db = config.DATABASES.filter((item) => item.proto_message_name === protoName)[0];
  return addBlockState(db.name, db.index, obj[db.index],
    obj, blockNum)
}

module.exports = {
  connect,
  queryTable,
  modifyTable,
  insert,
  add
}
