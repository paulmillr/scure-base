import { should } from '@paulmillr/jsbt/test.js';

import './base58.test.ts';
import './bases.test.ts';
import './bech32.test.ts';
import './bip173.test.ts';
import './rfc4648.test.ts';
import './utils.test.ts';

should.runWhen(import.meta.url);
