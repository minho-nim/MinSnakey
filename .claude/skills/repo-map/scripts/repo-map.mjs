import{execFileSync as x}from'node:child_process';import{readFileSync as r}from'node:fs';
const S=/\.(m?[jt]sx?|py|go)$/,K=/(^|\/)(node_modules|dist|build|vendor|tests?|__tests__|migrations|fixtures|\.agents|\.claude)\/|\.(test|spec|d|min)\.\w+$/,
E=/^export\s+(?:default\s+)?(?:async\s+)?(?:function\*?|class|const|let|interface|type|enum)\s+([\w$]+)/gm,P=/^(?:async\s+)?def\s+([a-zA-Z]\w*)|^class\s+(\w+)/gm,G=/^func\s+(?:\([^)]*\)\s*)?([A-Z]\w*)/gm,m=new Map();
for(const f of x('git',['ls-files'],{encoding:'utf8',maxBuffer:1<<26}).split('\n').filter(f=>S.test(f)&&!K.test(f)).slice(0,3000)){
let t;try{t=r(f,'utf8')}catch{continue}const re=f.endsWith('.py')?P:f.endsWith('.go')?G:E,d=f.includes('/')?f.slice(0,f.lastIndexOf('/')+1):'./',a=m.get(d)??[];
for(const k of t.matchAll(re))a.push(k[1]??k[2]);if(a.length)m.set(d,a)}
let o='저장소 지도(이미 있는 것. 다시 만들지 말고 쓴다. 자세한 건 그 파일만 읽는다):';
for(const[d,a]of m){const u=[...new Set(a)],l=`\n${d}: ${u.slice(0,25).join(', ')}${u.length>25?` 외 ${u.length-25}개`:''}`;if(o.length+l.length<=Number(process.argv[2]||2500))o+=l}
console.log(o);
