const puppeteer=require('puppeteer-core');
const URL=process.argv[2]||'file:///workspace/heist_game/index.html';
const ONLY=process.argv[3]!=null?+process.argv[3]:null;
(async()=>{
  const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
  const pg=await b.newPage(); const errs=[];
  pg.on('pageerror',e=>errs.push('pageerror '+e.message)); pg.on('console',m=>{if(m.type()==='error')errs.push('console '+m.text())});
  await pg.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await pg.goto(URL,{waitUntil:'load'});
  const res=await pg.evaluate(async(ONLY)=>{
    const H=window.HEIST; H.manual=true; const out=[];
    // static check
    for(let i=0;i<H.LEVELS.length;i++){ const m=H.LEVELS[i].map; if(m.length!==19||m.some(r=>r.length!==13)) out.push('BADMAP '+i); }
    for(let i=0;i<H.LEVELS.length;i++){
      if(ONLY!=null&&i!==ONLY) continue;
      for(const wantGems of [true,false]){
      let result=null;
      for(let attempt=0;attempt<30&&!result;attempt++){
        H.startLevel(i); const G=H.G, L=G.L;
        const goals=[];
        const order=[]; if(wantGems) order.push(...L.gems.map(g=>({o:g,kind:'gem'})));
        // order: gems nearest-first then target, exit
        let waited=0,frames=0,log=[]; let delay=attempt*0.45;
        const dt=1/60;
        const alive=()=>H.mode==='play';
        const nextGoal=()=>{ const p=G.p; const rem=wantGems?L.gems.filter(g=>!g.got):[];
          if(!L.target.got){ // gems before target if closer
            const cand=[L.target,...rem].sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)); return cand[0]; }
          if(rem.length){ rem.sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y)); return rem[0]; }
          return {x:L.exit[0],y:L.exit[1]}; };
        while(alive()&&frames<60*240){
          frames++; if(delay>0){delay-=1/60;H.input.x=0;H.input.y=0;H.step(1/60);continue;}
          const p=G.p, gl=nextGoal();
          const path=H.bfs(L,Math.floor(p.x),Math.floor(p.y),Math.floor(gl.x),Math.floor(gl.y))||[];
          let nx=gl.x,ny=gl.y;
          if(path.length){ nx=path[0][0]+.5; ny=path[0][1]+.5;
            if(Math.hypot(nx-p.x,ny-p.y)<0.12&&path.length>1){ nx=path[1][0]+.5; ny=path[1][1]+.5; } }
          // lookahead points
          const pts=[[nx,ny]]; for(let k=1;k<3&&k<path.length;k++) pts.push([path[k][0]+.5,path[k][1]+.5]);
          const dangerAhead=pts.slice(0,2).some(([x,y])=>H.seenAt(x,y));
          const dangerHere=H.seenAt(p.x,p.y);
          let mx=nx-p.x,my=ny-p.y; const d=Math.hypot(mx,my)||1;
          if(dangerAhead&&!dangerHere){ H.input.x=0;H.input.y=0; waited+=dt;
            if(waited>2.5&&G.tn>0){ if(G.tool==='jam'&&H.viewers().some(v=>v.kind==='c'&&pts.some(([x,y])=>H.canSee(v,x,y)))){G.p.fx=mx/d;G.p.fy=my/d;H.useTool();waited=0;}
              else if(G.tool==='coin'&&waited>3){ G.p.fx=-mx/d; G.p.fy=-my/d; H.useTool(); waited=0; }
              else if(G.tool==='smoke'&&waited>4){ H.useTool(); waited=0; }
              else if(G.tool==='dash'&&waited>3){ H.useTool(); waited=-1; } }
            if(waited<0){ H.input.x=mx/d;H.input.y=my/d; }
          } else { waited=Math.min(waited,0)+0; if(waited<0) waited+=dt; H.input.x=mx/d; H.input.y=my/d; if(dangerHere&&G.tool==='smoke'&&G.tn>0&&G.alert>0.3) H.useTool(); if(dangerHere&&G.tool==='dash'&&G.tn>0&&G.alert>0.2&&G.p.dash<=0) H.useTool(); if(dangerHere&&G.tool==='jam'&&G.tn>0&&G.jam<=0&&H.viewers().some(v=>v.kind==='c'&&H.canSee(v,p.x,p.y))) H.useTool(); }
          H.step(dt);
        }
        const r={lv:i,gems:wantGems,mode:H.mode,t:+G.t.toFixed(1),spotted:G.spotted,maxAlert:0,gemsGot:L.gems.filter(g=>g.got).length+'/'+L.gems.length,tleft:G.tn,pos:[+G.p.x.toFixed(1),+G.p.y.toFixed(1)],hasT:G.hasT,attempt};
        if(H.mode==='clear') result=r; else if(attempt===29) result=r;
        H.input.x=0;H.input.y=0;
      }
      out.push(result);
      }
    }
    return out;
  },ONLY);
  console.log(JSON.stringify(res));
  console.log('errors',errs);
  await b.close();
})();
