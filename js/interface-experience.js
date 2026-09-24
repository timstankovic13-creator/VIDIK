'use strict';

(function(){
  const contexts = {
    municipal:{label:'Municipal',title:'Decisions for a city and the people in it.',subtitle:'Place-aware intelligence for public resources, services and outcomes.',image:'https://commons.wikimedia.org/wiki/Special:FilePath/Montreal%20Skyline.jpg',imageAlt:'Montreal skyline from Mount Royal',city:'Ottawa',scene:'City context'},
    business:{label:'Business',title:'Decisions that move the business forward.',subtitle:'Resources, operations, customers and growth — examined as one decision.',image:'https://commons.wikimedia.org/wiki/Special:FilePath/Montreal%20Skyline%20from%20Mount%20Royal%20(8391103775).jpg',imageAlt:'Montreal skyline',city:'Organization',scene:'Operating context'},
    community:{label:'Community',title:'Decisions grounded in people and place.',subtitle:'Make impact, access, equity and implementation visible before acting.',image:'https://commons.wikimedia.org/wiki/Special:FilePath/Centre%20culturel%20et%20communautaire%20Henri-Lemieux.JPG',imageAlt:'Community centre in Montreal',city:'Community',scene:'Community context'},
    research:{label:'Research',title:'Turn a difficult question into a testable decision.',subtitle:'Trace assumptions, evidence, uncertainty and what the next useful observation would be.',image:'https://commons.wikimedia.org/wiki/Special:FilePath/Montreal%20Skyline%20from%20Mount%20Royal%20(8391103775).jpg',imageAlt:'Montreal skyline',city:'Research workspace',scene:'Research context'},
    enterprise:{label:'Enterprise',title:'Make consequential resource decisions defensible.',subtitle:'Compare alternatives, constraints, risk and evidence without losing the audit trail.',image:'https://commons.wikimedia.org/wiki/Special:FilePath/Montreal%20Skyline%20from%20Mount%20Royal%20(8392171010).jpg',imageAlt:'Montreal skyline',city:'Enterprise',scene:'Operating context'}
  };

  function workspace(){ return document.getElementById('audienceSelect')?.value || 'municipal'; }

  function renderContext(kind){
    const data=contexts[kind]||contexts.municipal;
    document.body.dataset.workspace=kind;
    const img=document.getElementById('experienceContextImage');
    const title=document.getElementById('experienceContextTitle');
    const sub=document.getElementById('experienceContextSubtitle');
    const city=document.getElementById('experienceContextCity');
    const scene=document.getElementById('experienceContextScene');
    const identity=document.getElementById('workspaceIdentity');
    const heroEyebrow=document.querySelector('.hero-copy > .eyebrow');
    if(img){img.src=data.image;img.alt=data.imageAlt}
    if(title) title.textContent=data.title;
    if(sub) sub.textContent=data.subtitle;
    if(city) city.textContent=data.city;
    if(scene) scene.textContent=data.scene;
    if(identity) identity.innerHTML='<i></i><strong>'+data.label+'</strong> experience';
    if(heroEyebrow) heroEyebrow.textContent='START WITH THE '+data.label.toUpperCase()+' DECISION';
  }

  function imageForCandidate(name,kind){
    const text=String(name||'').toLowerCase();
    if(/transit|bus|rail|metro|traffic|road|pedestrian|cycling|mobility/.test(text)) return {src:'https://commons.wikimedia.org/wiki/Special:FilePath/Montreal-metro.jpg',alt:'Montreal Metro'};
    if(/community|housing|homeless|youth|violence|outreach|shelter|food|health/.test(text)) return {src:'https://commons.wikimedia.org/wiki/Special:FilePath/Centre%20culturel%20et%20communautaire%20Henri-Lemieux.JPG',alt:'Montreal community centre'};
    return {src:(contexts[kind]||contexts.municipal).image,alt:(contexts[kind]||contexts.municipal).imageAlt};
  }

  function decorateCandidates(){
    const grid=document.getElementById('candidates');
    if(!grid) return;
    const kind=workspace();
    grid.querySelectorAll('.candidate').forEach((card,index)=>{
      if(card.querySelector('.intervention-visual')) return;
      const title=card.querySelector('b')?.textContent || card.textContent;
      const image=imageForCandidate(title,kind);
      const visual=document.createElement('div');
      visual.className='intervention-visual';
      const img=document.createElement('img');
      img.src=image.src;img.alt=image.alt;img.loading='lazy';
      const caption=document.createElement('span');
      caption.textContent=index===0?'Context + intervention':'Relevant context';
      visual.append(img,caption);card.prepend(visual);
    });
  }

  function applyWorkspaceDefault(kind){
    const defaults={municipal:'cockpit',business:'brief',community:'cockpit',research:'workbench',enterprise:'brief'};
    const mode=defaults[kind]||'cockpit';
    document.querySelector('.quick-mode[data-interface="'+mode+'"]')?.click();
  }

  function startJourney(){
    document.body.dataset.interfaceJourney='active';
    document.querySelector('.decision-composer')?.classList.add('journey-running');
    const shell=document.getElementById('experienceContext');
    shell?.classList.add('hidden-context');
    window.setTimeout(()=>document.getElementById('answerFirst')?.scrollIntoView({behavior:'smooth',block:'start'}),220);
    window.setTimeout(decorateCandidates,1400);
  }

  function bind(){
    const audience=document.getElementById('audienceSelect');
    if(!audience) return;
    renderContext(workspace());
    applyWorkspaceDefault(workspace());
    audience.addEventListener('change',()=>{renderContext(workspace());applyWorkspaceDefault(workspace());});
    document.getElementById('experienceContextChange')?.addEventListener('click',()=>{audience.focus();audience.scrollIntoView({behavior:'smooth',block:'center'});});
    document.getElementById('runDecision')?.addEventListener('click',startJourney);

    const title=document.querySelector('.hero-copy h1');
    if(title && !document.getElementById('journeyProgress')) title.insertAdjacentHTML('beforebegin','<div class="journey-progress" id="journeyProgress" aria-label="Decision journey"><span class="active"></span><i></i><span></span><i></i><span></span><i></i><span></span></div>');

    const footer=document.querySelector('.composer-footer');
    if(footer && !document.getElementById('workspaceIdentity')){
      const identity=document.createElement('div');identity.id='workspaceIdentity';identity.className='workspace-identity';
      footer.parentElement.insertBefore(identity,footer);renderContext(workspace());
    }
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind); else bind();
})();