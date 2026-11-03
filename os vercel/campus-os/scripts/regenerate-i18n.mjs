import fs from 'node:fs';
const source=new URL('./translations.tsv',import.meta.url);
const [header,...lines]=fs.readFileSync(source,'utf8').trim().split('\n');
const languages=header.split('\t').slice(1);const resources=languages.map(()=>({}));
for(const line of lines){const [key,...values]=line.split('\t');if(values.length!==languages.length||values.some(v=>!v))throw new Error(`Invalid translation row: ${key}`);if(resources.some(r=>key in r))throw new Error(`Duplicate key: ${key}`);values.forEach((value,i)=>resources[i][key]=value);}
languages.forEach((language,i)=>fs.writeFileSync(new URL(`../src/locales/${language}.json`,import.meta.url),JSON.stringify(resources[i],null,2)+'\n'));
console.log(`Generated ${Object.keys(resources[0]).length} keys for ${languages.join(', ')}.`);
