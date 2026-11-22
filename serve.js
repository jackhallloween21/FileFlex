// Zero-dependency offline launcher: node serve.js  -> open http://localhost:5000
const http=require('http'),fs=require('fs'),path=require('path');
const ROOT=path.join(__dirname,'out');
const T={'.html':'text/html','.js':'text/javascript','.css':'text/css','.wasm':'application/wasm','.png':'image/png','.ico':'image/x-icon','.svg':'image/svg+xml','.json':'application/json'};
http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]);if(p.endsWith('/'))p+='index.html';
let f=path.join(ROOT,p);if(!f.startsWith(ROOT)){r.writeHead(403);return r.end();}
fs.readFile(f,(e,d)=>{if(e){r.writeHead(404);return r.end('Not found');}r.writeHead(200,{'Content-Type':T[path.extname(f)]||'application/octet-stream'});r.end(d);});
}).listen(5000,'127.0.0.1',()=>console.log('FileFlex running at http://localhost:5000'));
