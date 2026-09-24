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

  function createJourneyStage(){
    if(document.getElementById('journeyStage')) return;
    const composer=document.querySelector('.decision-composer');
    if(!composer) return;
    composer.insertAdjacentHTML('afterend','<section id="journeyStage" class="journey-stage" aria-live="polite"><div class="journey-stage-inner"><div class="journey-stage-kicker">VIDIK IS BUILDING THE DECISION</div><h2 id="journeyStageTitle">Understanding the decision</h2><p id="journeyStageText">We are turning the question into a structured decision object.</p><div class="journey-stage-track"><span class="journey-stage-progress"></span></div><div class="journey-stage-steps"><span data-step="0" class="current">Understand</span><span data-step="1">Discover</span><span data-step="2">Evidence</span><span data-step="3">Uncertainty</span><span data-step="4">Decision</span></div></div></section>');
  }

  function setJourneyStep(step){
    const stage=document.getElementById('journeyStage');
    if(!stage) return;
    const titles=[
      ['Understanding the decision','We are turning the question into a structured decision object.'],
      ['Finding possible interventions','We are opening the intervention universe instead of assuming a shortlist.'],
      ['Checking the evidence','We are separating evidence from discovery leads and testing what can actually support a decision.'],
      ['Testing uncertainty','We are identifying what could change the answer, including missing evidence and trade-offs.'],
      ['Building the decision','The decision view is ready. Start with the answer, then open the reasoning when you need it.']
    ];
    const item=titles[step]||titles[0];
    document.getElementById('journeyStageTitle').textContent=item[0];
    document.getElementById('journeyStageText').textContent=item[1];
    stage.style.setProperty('--journey-progress', ((step+1)/5*100)+'%');
    stage.querySelectorAll('[data-step]').forEach(el=>el.classList.toggle('current',Number(el.dataset.step)===step));
    stage.dataset.step=String(step);
  }

  function startJourney(){
    createJourneyStage();
    document.body.dataset.interfaceJourney='active';
    document.body.dataset.journeyState='building';
    document.querySelector('.decision-composer')?.classList.add('journey-running');
    const stage=document.getElementById('journeyStage');
    stage?.classList.add('visible');
    const quickbar=document.querySelector('.interface-quickbar');
    const switcher=document.querySelector('.interface-switcher');
    const nav=document.querySelector('.decision-nav');
    [quickbar,switcher,nav].forEach(el=>el?.classList.add('journey-hidden'));
    setJourneyStep(0);
    const timings=[700,1700,2900,4100];
    timings.forEach((delay,index)=>window.setTimeout(()=>setJourneyStep(index+1),delay));
    window.setTimeout(()=>{
      document.body.dataset.journeyState='decision';
      stage?.classList.add('complete');
      [quickbar,switcher,nav].forEach(el=>el?.classList.remove('journey-hidden'));
      document.getElementById('answerFirst')?.classList.add('journey-answer-arrival');
      document.getElementById('answerFirst')?.scrollIntoView({behavior:'smooth',block:'start'});
      decorateCandidates();
    },5000);
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