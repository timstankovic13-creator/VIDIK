const http = require('http');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const port = Number(process.env.PORT || 8080);
let ready = true;
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8'};
const server = http.createServer((req,res)=>{
  if(req.url === '/health'){res.writeHead(ready?200:503,{'content-type':'application/json'});return res.end(JSON.stringify({status:ready?'ok':'degraded',service:'vidik',version:'9.3-prep'}));}
  if(req.url === '/ready'){res.writeHead(ready?200:503);return res.end(ready?'ready':'not-ready');}
  const clean = decodeURIComponent((req.url||'/').split('?')[0]);
  const rel = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '');
  const target = path.resolve(root, rel);
  if(!target.startsWith(root + path.sep)){res.writeHead(400);return res.end('bad path');}
  fs.readFile(target,(err,data)=>{if(err){res.writeHead(err.code==='ENOENT'?404:500);return res.end('not found');}res.writeHead(200,{'content-type':mime[path.extname(target)]||'application/octet-stream'});res.end(data);});
});
function shutdown(){ready=false;server.close(()=>process.exit(0));setTimeout(()=>process.exit(1),5000).unref();}
process.on('SIGTERM',shutdown); process.on('SIGINT',shutdown);
server.listen(port,'0.0.0.0',()=>console.log(`VIDIK staging listening on ${port}`));
