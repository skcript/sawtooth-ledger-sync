# Ledger Sync for Protobuf based Hyperledger Sawtooth Network
This is an open source configurable ledger sync based on Rethink DB for hyperledger sawtooth network.

### Installation

```
npm install 
node index.js
```

### Configuration
All you have to do is just configure the network setup and your protobuff configuration in `config.json` and run the instance. The tables will be created along with the indexes defined.

#### Protobuf
This system is developed for sawtooth applications that are making use of protobuf and the standards of using them in sawtooth. For example, each and every data you want to write to ledger is encoded with a Proto Structure which is encapulated in a container, and the ledger sync uses the same to decode and write to rethink db or other adaptors. 

__Example__

Lets assume a simple blog use case where we have two types of data, one is user accounts and one is articles.

For Account Data (`account.proto`)
```
syntax = "proto3";

enum ROLES {
  AUTHOR = 0;
  EDITOR = 1;
  READER = 2;
}

message Account {
  string public_key = 1; // Index
  string name = 2;
  string username = 3;
  string email = 4;
  ROLES role = 5;
  uint32 created_at = 6;
  uint32 modified_at = 7;
}

message AccountContainer {
  repeated Account entries = 1;
}
```

For Articles (`arctile.proto`)

```
syntax = "proto3";

enum STATUS {
  DRAFT = 0;
  APPROVAL_PENDING = 1;
  PUBLISHED = 2;
  REMOVED = 3;
}

message Article {
  string articleId = 1; // Index
  string title = 2;
  string content = 3;
  string author_id = 4;
  STATUS status = 5;
  uint32 created_at = 6;
  uint32 modified_at = 7;
}

message ArticleContainer {
  repeated Article entries = 1;
}
```

And the corresponding Configuration (`config.json`) for our ledger sync would be like below.

```
{
  "VALIDATOR_URL": "tcp://localhost:4004",
  "DB_HOST" : "localhost",
  "DB_PORT" : 28020,
  "DB_NAME" : "simpleblog",
  "RETRY_WAIT" : 5000,
  "TP_NAMESPACE": "bfe5e2",
  "DATABASES": [
    {
      "name": "accounts",
      "index": "publicKey",
      "proto_file": "account.proto",
      "proto_message_name": "Account",
      "address_prefix": "01"
      
    },
    {
      "name": "articles",
      "index": "articleId",
      "proto_file": "article.proto",
      "proto_message_name": "Article",
      "address_prefix": "02"
    },
    {
      "name": "blocks",
      "index": "blockId"
    }
  ]
}
```

### TODO

- [ ] Add more adaptors like MySQL, CouchDB, Google BigQuery
- [ ] Dockerize the system