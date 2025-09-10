const { AdapterFactory, AdapterType } = require('./dist/adapters/adapter-factory.js');

console.log('Testing AdapterFactory...');
try {
  const factory = AdapterFactory.getInstance();
  console.log('Factory instance created:', !!factory);
  
  const adapter = factory.createAdapterSimple(AdapterType.REBASED, {
    useProductionAdapter: true
  });
  console.log('Adapter created successfully:', !!adapter);
} catch (error) {
  console.error('AdapterFactory test failed:', error.message);
}
