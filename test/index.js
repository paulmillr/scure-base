const { should } = require('micro-should');

require('./bases.test.js');
require('./rfc4648.test.js');
require('./base58.test.js');
require('./bech32.test.js');

should.run();
