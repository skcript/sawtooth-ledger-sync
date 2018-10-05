'use strict'

const path = require('path')
const _ = require('lodash')
const protobuf = require('protobufjs')
const config = require('./config.json')

const protos = {}

const loadProtos = (filename, protoNames) => {
  const protoPath = path.resolve(__dirname, './protos', filename)
  return protobuf.load(protoPath)
    .then(root => {
      protoNames.forEach(name => {
        protos[name] = root.lookupType(name)
      })
    })
}

const compile = () => {
  var promises = [];
  for (let i = 0; i < config.DATABASES.length; i++) {
    const db = config.DATABASES[i];
    if (!db.proto_file)
      continue;
    var promise = loadProtos(db.proto_file, [
      db.proto_message_name,
      `${db.proto_message_name}Container`
    ])
    promises.push(promise)
  }
  return Promise.all(promises)
}

module.exports = _.assign(protos, { compile });
