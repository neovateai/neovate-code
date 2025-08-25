import { models, providers } from './model';

function testModelReferences() {
  const errors: string[] = [];

  for (const [providerId, provider] of Object.entries(providers)) {
    console.log(`Checking provider: ${providerId}`);

    for (const [modelKey, modelRef] of Object.entries(provider.models)) {
      // Find which model from the models object this references
      let foundModel = null;

      for (const [globalModelId, globalModel] of Object.entries(models)) {
        if (modelRef === globalModel) {
          foundModel = globalModelId;
          break;
        }
      }

      if (!foundModel) {
        errors.push(
          `Provider "${providerId}" references undefined model at key "${modelKey}"`,
        );
      } else {
        console.log(`  ✓ ${modelKey} -> ${foundModel}`);
      }
    }
  }

  if (errors.length > 0) {
    console.error('\n❌ Found errors:');
    errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  } else {
    console.log('\n✅ All model references are valid!');
  }
}

testModelReferences();
