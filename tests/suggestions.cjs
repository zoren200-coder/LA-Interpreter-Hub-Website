const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const matcher=require('../assets/resource-suggestions.js');
const context={window:{}};vm.runInNewContext(fs.readFileSync(require.resolve('../data/resources.js'),'utf8'),context);
const catalog=context.window.HUB_CATALOG,index=matcher.buildIndex(catalog);
const match=q=>matcher.suggest(index,q);
for(const q of ['I-485 question','I - 485','adjustment of status glossary','Necesito un glosario de ajuste de estatus']){
 const hits=match(q);assert.equal(hits[0].id,'i485-questionnaire-glossary');assert(hits.length<=2);
 for(const hit of hits){const original=catalog.resources.find(r=>r.id===hit.id);assert.equal(hit.title,original.title);assert.equal(hit.url,original.url);}
}
assert.deepEqual(match('adjustment of status glossary'),match('glosario de ajuste de estatus'));
assert.deepEqual(match('confidencialidad comunicaciones privilegiadas'),match('confidentiality privileged'));
for(const q of ['', 'court interpreter', 'tribunal interprete', 'What is the best pizza dough recipe?', 'How do I water tomato plants?', 'I-4850', 'medical terminology toolkit specialty healthcare assignment'])assert.equal(match(q).length,0,q);
assert.equal(match('interpretación en equipo')[0].id,match('team interpreting')[0].id);
assert.equal(match('Finding a study partner for court certification')[0].id,'confident-interpreter');
const fake={categories:[],resources:[
 {id:'specific',title:'Deposition preparation',description:'Witness questioning',category:'knowledge',tags:['deposition'],status:'published',url:'documents/test.pdf'},
 {id:'broad',title:'Court interpreter',description:'General court interpreter resources',status:'published',url:'https://example.org/broad'},
 {id:'review',title:'Deposition',status:'review',url:'https://example.org/private'},
 {id:'unsafe',title:'Deposition',status:'published',url:'javascript:alert(1)'},
 {id:'duplicate',title:'Deposition copy',status:'published',url:'documents/test.pdf'}
]};
assert.deepEqual(matcher.suggest(matcher.buildIndex(fake),'deposición'),matcher.suggest(matcher.buildIndex(fake),'deposition'));
assert.equal(matcher.suggest(matcher.buildIndex(fake),'deposicion')[0].id,'specific');
assert.equal(matcher.buildIndex(fake).entries.length,2);
// New catalog entries, tags and category labels become eligible without an ID-specific rule.
fake.resources.push({id:'new',title:'New reference',description:'New catalog material',tags:['deposition'],status:'published',url:'https://example.org/new'});
assert(matcher.suggest(matcher.buildIndex(fake),'deposición').some(r=>r.id==='new'));
console.log('Catalog titles/links, bilingual accents, I-485 ranking, deposition equivalence, broad/unrelated suppression, publication gates and new tagged resources pass.');
