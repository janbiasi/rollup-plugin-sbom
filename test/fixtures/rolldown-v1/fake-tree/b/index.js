import a from 'a';
// the contained side-effect is not marked as pure
// so this side-effect will be included in the final bundle
import 'side-effect';

console.log('Module B@1 loaded - imports %s', a);

export default 'Local Package B - V1'
