import { expect } from 'chai';
import { createElement } from 'react';
import { create } from 'react-test-renderer';
import { delay } from '../index.js';

import {
  progressiveState,
  useProgressiveState,
} from '../index.js';
