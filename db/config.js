const config = require('../config.json');
const rethinkDBAdaptor = require('./rethink');

const getDBAdaptor = () => {
  switch (config.DB_TYPE) {
    case "RETHINK":
      return rethinkDBAdaptor
    default:
      break;
  }
}

module.exports = { getDBAdaptor };