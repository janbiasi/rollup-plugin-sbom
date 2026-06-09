const a = require('a');
// the contained side-effect is not marked as pure
// so this side-effect will be included in the final bundle
require('side-effect');

console.log('Module B@1 loaded - imports %s', a);

module.exports = 'Local Package B - V1'
