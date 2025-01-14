import { should } from 'micro-should';

import './bases.test.js';
import './rfc4648.test.js';
import './base58.test.js';
import './bech32.test.js';
import './bip173.test.js';
import './utils.test.js';

should.runWhen(import.meta.url);
