'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(process.env.CI_SITE_DIR||path.join(__dirname,'../..'));let js=0,inline=0,handlers=0;
for(const name of fs.readdirSync(root))if(name.endsWith('.js')){new vm.Script(fs.readFileSync(path.join(root,name),'utf8'),{filename:name});js++;}
const records=JSON.parse(fs.readFileSync(path.join(process.env.CI_REPORT_DIR||path.join(__dirname,'../../reports'),'scripts.json'),'utf8'));
for(const item of records){
 for(const source of item.scripts){new vm.Script(source,{filename:item.path});inline++;}
 for(const handler of item.handlers){new vm.Script('(function(event){'+handler+'\n})',{filename:item.path});handlers++;}
}
fs.writeFileSync(path.join(process.env.CI_REPORT_DIR||path.join(__dirname,'../../reports'),'syntax.json'),JSON.stringify({checksPassed:js+inline+handlers,externalJs:js,inlineScripts:inline,eventHandlers:handlers},null,2));
console.log(JSON.stringify({externalJs:js,inlineScripts:inline,eventHandlers:handlers}));
