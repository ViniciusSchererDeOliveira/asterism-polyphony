import assert from 'node:assert/strict';
import { previewIndexAfterRemoval } from '@guitar-paradigm/web';

export const progressionStateTests = [
  {
    name: 'PROGRESSION_STATE_1: Removing an earlier pin preserves the same previewed voicing',
    fn: () => {
      assert.equal(previewIndexAfterRemoval(3, 1), 2);
      assert.equal(previewIndexAfterRemoval(1, 3), 1);
    }
  },
  {
    name: 'PROGRESSION_STATE_2: Removing the active pin clears preview',
    fn: () => {
      assert.equal(previewIndexAfterRemoval(2, 2), null);
      assert.equal(previewIndexAfterRemoval(null, 2), null);
    }
  }
];
