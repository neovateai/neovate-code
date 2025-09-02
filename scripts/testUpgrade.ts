import path from 'path';
import { Upgrade } from '../src/next/upgrade';

async function upgradeTest() {
  const upgrade = new Upgrade({
    registryBase: 'https://registry.npmjs.org',
    name: 'takumi',
    version: '0.8.0',
    installDir: path.join(process.cwd(), 'tmp/test-upgrade'),
    files: ['vendor', 'dist', 'package.json'],
  });
  const result = await upgrade.check();
  console.log(result);
  if (result.tarballUrl) {
    upgrade.on('status', (status) => {
      console.log(status);
    });
    await upgrade.upgrade({ tarballUrl: result.tarballUrl });
    console.log('upgrade success');
  }
}

upgradeTest().catch(console.error);
