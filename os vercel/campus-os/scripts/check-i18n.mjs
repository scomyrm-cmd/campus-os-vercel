import fs from 'node:fs';
const read = l => JSON.parse(fs.readFileSync(new URL(`../src/locales/${l}.json`,import.meta.url),'utf8'));
const en=read('en'); let errors=[];
for(const l of ['fr','ar']) { const other=read(l); for(const k of Object.keys(en)) if(!other[k]) errors.push(`${l}: ${k}`); for(const k of Object.keys(other)) if(!en[k]) errors.push(`Extra ${l}: ${k}`); }
const files=[]; function scan(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=`${dir}/${e.name}`;if(e.isDirectory())scan(p);else if(/\.tsx?$/.test(p))files.push(p);}}
scan('src');
for(const f of files){const text=fs.readFileSync(f,'utf8');for(const match of text.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)){if(!en[match[1]])errors.push(`${f}: missing ${match[1]}`);}}
if(errors.length){console.error(errors.join('\n'));process.exit(1);} console.log(`Translation audit passed: ${Object.keys(en).length} keys × 3 languages.`);
