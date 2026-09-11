'use strict';
const fixtures={
 ottawa:'<p>In October 2024, 2952 people reported experiencing homelessness in Ottawa.</p>',
 toronto:'<p>An estimated 15400 people were experiencing homelessness in Toronto last fall.</p>',
 melbourne:'<p>As of May 2024, the current number of people recorded as experiencing chronic homelessness and rough sleeping in the City of Melbourne is 147.</p>'
};
global.fetch=async url=>{const u=String(url).toLowerCase();const key=u.includes('ottawa')||u.includes('documents.ottawa.ca')?'ottawa':u.includes('toronto')?'toronto':'melbourne';return{ok:true,status:200,headers:{get:()=> 'text/html'},text:async()=>fixtures[key]};};
