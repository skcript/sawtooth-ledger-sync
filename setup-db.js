var r = require('rethinkdb');
const config = require('./config');
var connection = null;

module.exports = () => {
  return r.connect({ host: config.DB_HOST, port: config.DB_PORT }).then((conn) => {
    connection = conn;
    return r.dbList().run(connection)
  }).then((dbs) => {
    if (dbs.includes(config.DB_NAME)) {
      return r.dbDrop(config.DB_NAME).run(connection)
    } else {
      return true;
    }
  }).then(() => {
    return r.dbCreate(config.DB_NAME).run(connection)
  }).then(() => {
    var dbCreatePromises = [];
    var dbIndexPromises = [];
    for (let i = 0; i < config.DATABASES.length; i++) {
      const db = config.DATABASES[i];
      console.log(`${db.name} Created`)
      dbCreatePromises.push(r.db(config.DB_NAME).tableCreate(db.name).run(connection))
    }
    return Promise.all(dbCreatePromises).then(() => {
      for (let i = 0; i < config.DATABASES.length; i++) {
        const db = config.DATABASES[i];
        console.log(`Added ${db.index} to the database ${db.name}`)
        dbIndexPromises.push(r.db(config.DB_NAME).table(db.name).indexCreate(db.index).run(connection))
      }
      return Promise.all(dbIndexPromises)
    })
  }).catch((error) => {
    console.log("error", error)
  }) 
}
