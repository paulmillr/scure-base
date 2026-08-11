import { should } from '@paulmillr/jsbt/test.js';

import './base36.test.ts';
import './base58.test.ts';
import './bases.test.ts';
import './bech32.test.ts';
import './bip173.test.ts';
import './native-parity.test.ts';
import './rfc4648.test.ts';
import './slow-parity.test.ts';
import './utf8-env.test.ts';
import './utf8-vectors.test.ts';
import './utils.test.ts';

should.runWhen(import.meta.url);
