const puppeteer=require('puppeteer-core');
const URL=process.argv[2]||'file:///workspace/heist_game/index.html';
const SH='/workspace/heist_game/shots/';
const sl=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  const b=await puppeteer.launch({executablePath:'/usr/bin/google-chrome',headless:'new',args:['--no-sandbox']});
  const pg=await b.newPage(); const errs=[];
  pg.on('pageerror',e=>errs.push('pageerror '+e.message)); pg.on('console',m=>{if(m.type()==='error')errs.push('console '+m.text())});
  await pg.setViewport({width:390,height:844,deviceScaleFactor:2,isMobile:true,hasTouch:true});
  await pg.goto(URL,{waitUntil:'load'});
  await pg.evaluate(()=>{localStorage.clear(); localStorage.setItem('touxin_heist_v1',JSON.stringify({best:{0:{stars:[true,true,false],time:20},1:{stars:[true,false,true],time:30}},unlocked:3,sound:true}));});
  await pg.reload({waitUntil:'load'}); await sl(400);
  await pg.screenshot({path:SH+'1_menu.png'});
  // tap level 3 card via touch
  const box=await (await pg.$('.lv[data-lv="2"]')).boundingBox();
  await pg.touchscreen.tap(box.x+box.width/2,box.y+box.height/2); await sl(300);
  const briefShown=await pg.evaluate(()=>document.getElementById('sBrief').classList.contains('on'));
  await pg.screenshot({path:SH+'2_brief.png'});
  const sb=await (await pg.$('#bStart')).boundingBox(); await pg.touchscreen.tap(sb.x+sb.width/2,sb.y+sb.height/2); await sl(300);
  const mode1=await pg.evaluate(()=>HEIST.mode);
  // touch joystick drag up
  const p0=await pg.evaluate(()=>({x:HEIST.G.p.x,y:HEIST.G.p.y}));
  await pg.touchscreen.touchStart(200,720); await sl(50);
  for(let i=1;i<=6;i++){ await pg.touchscreen.touchMove(200,720-i*10); await sl(30);} 
  await sl(500);
  const pMid=await pg.evaluate(()=>({x:HEIST.G.p.x,y:HEIST.G.p.y,joy:!!HEIST.input.joy}));
  await pg.touchscreen.touchEnd(); await sl(200);
  const joyAfter=await pg.evaluate(()=>!!HEIST.input.joy);
  // tool button tap
  const tn0=await pg.evaluate(()=>HEIST.G.tn);
  const tb=await (await pg.$('#tool')).boundingBox(); await pg.touchscreen.tap(tb.x+tb.width/2,tb.y+tb.height/2); await sl(300);
  const tn1=await pg.evaluate(()=>({tn:HEIST.G.tn,smokes:HEIST.G.smokes.length}));
  await pg.screenshot({path:SH+'3_gameplay.png'});
  // caught: level 1, place player in guard view
  await pg.evaluate(()=>{ HEIST.startLevel(0); const G=HEIST.G; HEIST.manual=true; const g=G.guards[0]; G.p.x=g.x+2.2; G.p.y=g.y+0.5; g.a=Math.atan2(0.5,2.2); for(let i=0;i<120&&HEIST.mode==='play';i++){ HEIST.step(1/60);} HEIST.manual=false; });
  await sl(800);
  const caughtShown=await pg.evaluate(()=>document.getElementById('sCaught').classList.contains('on'));
  // Show caught moment over gameplay too
  await pg.screenshot({path:SH+'4_caught.png'});
  // clear: solve L1 quickly with keyboard-free autopilot using route
  await pg.evaluate(()=>{ HEIST.startLevel(0); const G=HEIST.G,L=G.L; HEIST.manual=true; const goals=[...L.gems,L.target,{x:L.exit[0],y:L.exit[1]}];
    // order nearest
    let f=0; while(HEIST.mode==='play'&&f<60*120){ f++; const p=G.p; const rem=goals.filter(g=>g.got===undefined?true:!g.got); let gl; const gem=L.gems.filter(g=>!g.got).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0]; if(!L.target.got){ gl=[L.target,gem].filter(Boolean).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0]; } else gl=gem||{x:L.exit[0],y:L.exit[1]};
      const path=HEIST.bfs(L,Math.floor(p.x),Math.floor(p.y),Math.floor(gl.x),Math.floor(gl.y))||[]; let nx=gl.x,ny=gl.y; if(path.length){nx=path[0][0]+.5;ny=path[0][1]+.5; if(Math.hypot(nx-p.x,ny-p.y)<.12&&path.length>1){nx=path[1][0]+.5;ny=path[1][1]+.5;}}
      const danger=[[nx,ny]].some(([x,y])=>HEIST.seenAt(x,y))&&!HEIST.seenAt(p.x,p.y); const d=Math.hypot(nx-p.x,ny-p.y)||1; HEIST.input.x=danger?0:(nx-p.x)/d; HEIST.input.y=danger?0:(ny-p.y)/d; HEIST.step(1/60);} HEIST.input.x=0;HEIST.input.y=0; HEIST.manual=false; });
  await sl(700);
  const clearInfo=await pg.evaluate(()=>({mode:HEIST.mode,shown:document.getElementById('sClear').classList.contains('on'),stars:[...document.querySelectorAll('#rStars .star.got')].length,saved:localStorage.getItem('touxin_heist_v1')}));
  await pg.screenshot({path:SH+'5_clear.png'});
  // keyboard check on desktop viewport
  await pg.setViewport({width:1280,height:800,deviceScaleFactor:1});
  await pg.evaluate(()=>HEIST.startLevel(0)); await sl(200);
  const k0=await pg.evaluate(()=>HEIST.G.p.y); await pg.keyboard.down('ArrowUp'); await sl(500); await pg.keyboard.up('ArrowUp');
  const k1=await pg.evaluate(()=>HEIST.G.p.y); await pg.keyboard.press('Space'); await sl(100); const ktn=await pg.evaluate(()=>HEIST.G.tn);
  await pg.screenshot({path:SH+'6_desktop.png'});
  console.log(JSON.stringify({briefShown,mode1,p0,pMid,joyAfter,tn0,tn1,caughtShown,clearInfo,keyboard:{k0,k1,ktn}},null,1));
  console.log('errors',errs);
  await b.close();
})();
