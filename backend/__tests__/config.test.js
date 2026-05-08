import { readFileSync } from 'fs';
import { join } from 'path';

// refs #00-001 #11-004
describe('deployment configuration', () => {
  test('#00-001 nixpacks.toml specifies Node 20 not Node 18', () => {
    const content = readFileSync(join(process.cwd(), 'nixpacks.toml'), 'utf8');
    expect(content).toContain('nodejs_20');
    expect(content).not.toMatch(/nodejs[-_]1[0-9]/);
  });

  test('#11-004 Node.js runtime is version 20 or higher', () => {
    const major = parseInt(process.versions.node.split('.')[0]);
    expect(major).toBeGreaterThanOrEqual(20);
  });
});
