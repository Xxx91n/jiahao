// gen-docs.cjs - grill-t17 doc generator (D-003 compliant: ROOT derived from __dirname)
const path=require('path'),fs=require('fs');
const ROOT=path.join(__dirname,'..','..');
const SCRATCH=path.join(ROOT,'.scratch','grill-t17');
const w=(rel,s)=>{const p=path.join(ROOT,rel);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,s);console.log('wrote',rel,s.length,'B');};
module.exports={w,ROOT,SCRATCH};
if(require.main===module){console.log('template only - docs already generated');}
