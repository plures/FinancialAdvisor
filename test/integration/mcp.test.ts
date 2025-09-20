import * as assert from 'assert';

describe('Integration Tests', () => {
  it('should validate project structure', () => {
    // Test that key files exist and are accessible
    const fs = require('fs');
    const path = require('path');
    
    const projectRoot = path.resolve(__dirname, '../../..');
    
    // Check package.json exists
    assert.ok(fs.existsSync(path.join(projectRoot, 'package.json')));
    
    // Check TypeScript config exists
    assert.ok(fs.existsSync(path.join(projectRoot, 'tsconfig.json')));
    
    // Check main extension file exists in build output
    assert.ok(fs.existsSync(path.join(projectRoot, 'out/src/extension.js')));
  });
  
  it('should validate shared types module', () => {
    const types = require('../../src/shared/types');
    
    // Types should be available for import (even though they're interfaces)
    // This test validates the module structure
    assert.ok(typeof types === 'object');
  });
});