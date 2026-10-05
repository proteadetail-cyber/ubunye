(function(){
  function setText(node, value){
    if(typeof value==='string') node.textContent=value.trim();
  }
  function toTelephoneHref(value){
    var digits=value.replace(/\D/g,'');
    if(digits.charAt(0)==='0') return '+27'+digits.slice(1);
    return '+'+digits;
  }
  function replaceContactNumber(link,value){
    var numberPrefix=link.textContent.match(/^[\d+()\s-]+/);
    if(!numberPrefix) return;
    var suffix=link.textContent.slice(numberPrefix[0].length);
    link.textContent=value.trim()+(suffix?' '+suffix:'');
  }
  function renderContactSettings(settings){
    if(typeof settings.email==='string'&&settings.email.trim()){
      document.querySelectorAll('a[href^="mailto:"]').forEach(function(link){
        link.href='mailto:'+settings.email.trim();
        link.textContent=link.textContent.replace(/^[^—–]+/,settings.email.trim());
      });
    }
    if(typeof settings.phone==='string'&&settings.phone.trim()){
      document.querySelectorAll('a[href^="tel:"]').forEach(function(link){
        link.href='tel:'+toTelephoneHref(settings.phone);
        replaceContactNumber(link,settings.phone);
      });
    }
    if(typeof settings.whatsapp==='string'&&settings.whatsapp.trim()){
      var digits=settings.whatsapp.replace(/\D/g,'');
      if(digits){
        if(digits.charAt(0)==='0') digits='27'+digits.slice(1);
        document.querySelectorAll('a[href*="wa.me/"]').forEach(function(link){
          link.href='https://wa.me/'+digits;
          replaceContactNumber(link,settings.whatsapp);
        });
      }
    }
    if(typeof settings.provinces==='string'&&settings.provinces.trim()){
      document.querySelectorAll('p').forEach(function(paragraph){
        if(paragraph.textContent.indexOf('regional focus on ')!==-1){
          paragraph.textContent=paragraph.textContent.replace(/regional focus on .+\.$/,'regional focus on '+settings.provinces.trim()+'.');
        }
      });
      var location=document.querySelector('#location');
      if(location) location.placeholder='e.g. '+settings.provinces.trim();
    }
  }
  var serviceUrls={
    'sheq consulting':'/services/sheq-consulting','ohs compliance':'/services/ohs-compliance','iso consulting':'/services/iso-consulting',
    'risk assessments':'/services/risk-assessments','safety files':'/services/safety-files','safety training':'/services/safety-training',
    'incident investigation':'/services/incident-investigation'
  };
  function renderManagedServices(services){
    var grid=document.querySelector('.core-service-grid');
    if(!grid) return;
    grid.querySelectorAll('[data-admin-generated]').forEach(function(card){card.remove()});
    var cards=Array.from(grid.querySelectorAll(':scope > article:not(.dark):not([data-admin-generated])'));
    services.slice(0,cards.length).forEach(function(service,index){
      var card=cards[index];
      card.hidden=false;
      setText(card.querySelector('h3'),service.t);
      setText(card.querySelector('p'),service.d);
      var link=card.querySelector('.card-link');
      if(link){
        var url=serviceUrls[String(service.t||'').trim().toLowerCase()];
        link.hidden=!url;
        if(url) link.href=url;
      }
    });
    cards.slice(services.length).forEach(function(card){card.hidden=true});
    var insertionPoint=grid.querySelector(':scope > article.dark')||null;
    services.slice(cards.length).forEach(function(service){
      var card=document.createElement('article');
      card.className='card span2 reveal in';
      card.dataset.adminGenerated='true';
      var title=document.createElement('h3');
      var description=document.createElement('p');
      setText(title,service.t);
      setText(description,service.d);
      card.append(title,description);
      grid.insertBefore(card,insertionPoint);
    });
  }
  function renderManagedFaq(faq){
    var main=document.querySelector('main');
    var footer=document.querySelector('footer');
    if(!main||!footer) return;
    var section=main.querySelector('.cms-faq');
    if(!faq.length){
      if(section) section.remove();
      return;
    }
    if(!section) return;
    if(!section){
      section=document.createElement('section');
      section.className='section-surface cms-faq';
      var head=document.createElement('div');
      head.className='section-head';
      var heading=document.createElement('h2');
      heading.textContent='Frequently asked questions.';
      head.append(heading);
      var list=document.createElement('div');
      list.className='faq';
      section.append(head,list);
      main.insertBefore(section,main.querySelector('.cta'));
    }
    var faqList=section.querySelector('.faq');
    faqList.replaceChildren();
    faq.forEach(function(item){
      if(typeof item.q!=='string'||typeof item.a!=='string') return;
      var details=document.createElement('details');
      var summary=document.createElement('summary');
      var answer=document.createElement('p');
      summary.textContent=item.q;
      answer.textContent=item.a;
      details.append(summary,answer);
      faqList.append(details);
    });
  }
  function renderManagedProof(proof){
    var container=document.querySelector('main .case');
    if(!container) return;
    container.replaceChildren();
    proof.forEach(function(item,index){
      if(typeof item.t!=='string'||typeof item.d!=='string') return;
      var card=document.createElement('article');
      card.className='panel '+(index%2?'mint':'pink');
      var title=document.createElement('h3');
      var details=document.createElement('p');
      title.textContent=item.t;
      details.textContent=item.d;
      card.append(title,details);
      container.append(card);
    });
    container.hidden=proof.length===0;
  }
  function renderAdminContent(data){
    var content=data.content||{};
    var settings=data.settings||{};
    if(document.querySelector('.hero-copy')){
      setText(document.querySelector('.hero-copy .kicker'),content.heroKicker);
      setText(document.querySelector('.hero-copy p'),content.heroText);
      var primaryCta=document.querySelector('.nav-start-text');
      setText(primaryCta,content.ctaPrimary);
      if(primaryCta&&content.ctaPrimary) primaryCta.closest('a').setAttribute('aria-label',content.ctaPrimary+' from UBUNYE');
    }
    renderContactSettings(settings);
    if(Array.isArray(data.services)) renderManagedServices(data.services);
    if(Array.isArray(content.faq)&&document.querySelector('.hero-copy')) renderManagedFaq(content.faq);
    if(Array.isArray(data.proof)) renderManagedProof(data.proof);
  }
  async function loadAdminPublishedContent(){
    try{
      var response=await fetch('/admin/api/public',{headers:{accept:'application/json'}});
      if(!response.ok) throw new Error('Admin content endpoint returned HTTP '+response.status);
      var data=await response.json();
      if(!data||typeof data!=='object') throw new Error('Admin content response was not an object');
      renderAdminContent(data);
    }catch(error){console.error('Could not load published admin content; the page is showing its built-in content.',error)}
  }
  loadAdminPublishedContent();
  try { localStorage.removeItem('ubunye-theme'); } catch(e){}
  (function initPageMenu(){
    var nav=document.querySelector('nav.nav');
    var links=nav&&nav.querySelector('.navlinks');
    if(!nav||!links||nav.querySelector('.nav-pages')) return;
    var pages=[
      ['Home','/'],
      ['Services','/services'],
      ['SHEQ Consulting','/services/sheq-consulting'],
      ['OHS Compliance','/services/ohs-compliance'],
      ['ISO Consulting','/services/iso-consulting'],
      ['Risk Assessments','/services/risk-assessments'],
      ['Safety Files','/services/safety-files'],
      ['Safety Training','/services/safety-training'],
      ['Incident Investigation','/services/incident-investigation'],
      ['SHEQ Retainers','/retainers'],
      ['About','/about'],
      ['FAQs','/faq'],
      ['Get a quote','/quote'],
      ['Contact','/contact']
    ];
    var menu=document.createElement('details');
    menu.className='nav-pages';
    var trigger=document.createElement('summary');
    trigger.textContent='Pages';
    trigger.setAttribute('aria-label','Open page menu');
    var list=document.createElement('div');
    list.className='nav-page-menu';
    var current=location.pathname.replace(/\.html$/,'').replace(/(.)\/$/,'$1')||'/';
    if(current==='/index') current='/';
    pages.forEach(function(page){
      var link=document.createElement('a');
      link.href=page[1];
      link.textContent=page[0];
      if(page[1]===current) link.setAttribute('aria-current','page');
      list.appendChild(link);
    });
    menu.append(trigger,list);
    links.insertAdjacentElement('afterend',menu);
    document.addEventListener('pointerdown',function(event){
      if(!menu.contains(event.target)) menu.open=false;
    });
    document.addEventListener('keydown',function(event){
      if(event.key==='Escape'&&menu.open){
        menu.open=false;
        trigger.focus();
      }
    });
  })();
  if(!document.querySelector('.skip-link')){var s=document.createElement('a');s.className='skip-link';s.href='#main';s.textContent='Skip to content';document.body.prepend(s)}
  var main=document.querySelector('main'); if(main && !main.id) main.id='main';
  var progress=document.querySelector('.progress');
  function update(){var h=document.documentElement.scrollHeight-innerHeight; if(progress) progress.style.transform='scaleX('+(h?scrollY/h:0)+')'}
  addEventListener('scroll',update,{passive:true}); update();
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});
  document.querySelectorAll('.reveal').forEach(function(el){io.observe(el)});
  var highlightObserver=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('is-visible');highlightObserver.unobserve(e.target)}})},{threshold:.25,rootMargin:'0px 0px -12% 0px'});
  document.querySelectorAll('.scroll-highlight').forEach(function(el){highlightObserver.observe(el)});
  (function initStepsProgress(){
    var process=document.querySelector('.process');
    var steps=process&&process.querySelector('.steps');
    var items=steps?Array.from(steps.querySelectorAll('.step')):[];
    if(!steps||!items.length) return;
    var fill=document.createElement('div');
    fill.className='step-progress-fill';
    fill.setAttribute('aria-hidden','true');
    steps.prepend(fill);
    items.forEach(function(item,index){
      var number=item.querySelector('b');
      if(number){
        number.textContent=String(index+1);
        number.setAttribute('aria-hidden','true');
      }
    });
    var ticking=false;
    function update(){
      var rect=steps.getBoundingClientRect();
      var progress=Math.max(0,Math.min(1,(innerHeight*.6-rect.top)/rect.height));
      fill.style.height=(progress*Math.max(0,rect.height-16))+'px';
      items.forEach(function(item){
        item.classList.toggle('step-active',item.getBoundingClientRect().top<innerHeight*.6);
      });
      ticking=false;
    }
    function requestUpdate(){
      if(!ticking){
        ticking=true;
        requestAnimationFrame(update);
      }
    }
    addEventListener('scroll',requestUpdate,{passive:true});
    addEventListener('resize',requestUpdate);
    update();
  })();
  (function initParticleMonogram(){
    var orb=document.querySelector('.orb');
    var canvas=orb&&orb.querySelector('.orb-particles');
    if(!orb||!canvas) return;
    var ctx=canvas.getContext('2d');
    if(!ctx){console.error('The USC particle monogram could not initialize its canvas.');return}

    var particles=[];
    var targets=[];
    var width=0;
    var height=0;
    var frame=0;
    var visible=false;
    var assembled=false;
    var reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
    var colors=['#F0ECE4','#D5D9DE','#FFFFFF','#E7D8C3'];

    function scatter(particle){
      particle.targetX=Math.random()*width;
      particle.targetY=Math.random()*height;
    }

    function setFormation(shouldAssemble){
      if(assembled===shouldAssemble) return;
      assembled=shouldAssemble;
      particles.forEach(function(particle,index){
        if(assembled){
          var target=targets[index];
          particle.targetX=target.x;
          particle.targetY=target.y;
        }else{
          scatter(particle);
        }
        if(reducedMotion){
          particle.x=particle.targetX;
          particle.y=particle.targetY;
        }
      });
      if(reducedMotion) draw();
    }

    function rebuild(){
      var rect=orb.getBoundingClientRect();
      var dpr=Math.min(window.devicePixelRatio||1,2);
      width=Math.max(1,rect.width);
      height=Math.max(1,rect.height);
      canvas.width=Math.round(width*dpr);
      canvas.height=Math.round(height*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);

      var sample=document.createElement('canvas');
      sample.width=Math.ceil(width);
      sample.height=Math.ceil(height);
      var sampleCtx=sample.getContext('2d',{willReadFrequently:true});
      if(!sampleCtx){console.error('The USC particle monogram could not sample its letter shape.');return}
      var fontSize=Math.min(height*.78,width*.29);
      sampleCtx.fillStyle='#fff';
      sampleCtx.textAlign='center';
      sampleCtx.textBaseline='middle';
      sampleCtx.font='800 '+fontSize+'px Syne, sans-serif';
      sampleCtx.fillText('USC',width/2,height/2,width*.94);

      var image=sampleCtx.getImageData(0,0,sample.width,sample.height).data;
      var step=Math.max(4,Math.sqrt(width*height*.22/560));
      targets=[];
      for(var y=0;y<sample.height;y+=step){
        for(var x=0;x<sample.width;x+=step){
          if(image[(Math.floor(y)*sample.width+Math.floor(x))*4+3]>90){
            targets.push({x:x,y:y});
          }
        }
      }
      for(var i=targets.length-1;i>0;i--){
        var swap=Math.floor(Math.random()*(i+1));
        var temp=targets[i];
        targets[i]=targets[swap];
        targets[swap]=temp;
      }

      particles=targets.map(function(target){
        var particle={
          x:Math.random()*width,
          y:Math.random()*height,
          targetX:0,
          targetY:0,
          radius:1.6+Math.random()*.8,
          phase:Math.random()*Math.PI*2,
          drift:0.65+Math.random()*.7,
          color:colors[Math.floor(Math.random()*colors.length)]
        };
        if(assembled){
          particle.targetX=target.x;
          particle.targetY=target.y;
          particle.x=target.x;
          particle.y=target.y;
        }else{
          scatter(particle);
          particle.x=particle.targetX;
          particle.y=particle.targetY;
        }
        return particle;
      });
      draw();
    }

    function draw(){
      ctx.clearRect(0,0,width,height);
      var time=performance.now()*.001;
      particles.forEach(function(particle){
        if(!reducedMotion){
          var driftX=assembled?1.2:Math.min(30,width*.02);
          var driftY=assembled?1.2:Math.min(22,height*.055);
          var targetX=particle.targetX+Math.sin(time*.65+particle.phase)*driftX*particle.drift;
          var targetY=particle.targetY+Math.cos(time*.52+particle.phase*.83)*driftY*particle.drift;
          particle.x+=(targetX-particle.x)*.065;
          particle.y+=(targetY-particle.y)*.065;
        }
        ctx.beginPath();
        ctx.fillStyle=particle.color;
        ctx.arc(particle.x,particle.y,particle.radius,0,Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.fillStyle='rgba(255,255,255,.55)';
        ctx.arc(particle.x-particle.radius*.3,particle.y-particle.radius*.3,particle.radius*.28,0,Math.PI*2);
        ctx.fill();
      });
    }

    function animate(){
      if(!visible||reducedMotion) return;
      draw();
      frame=requestAnimationFrame(animate);
    }

    function start(){
      if(visible) return;
      visible=true;
      if(!reducedMotion) frame=requestAnimationFrame(animate);
    }

    function stop(){
      visible=false;
      if(frame) cancelAnimationFrame(frame);
      frame=0;
    }

    orb.addEventListener('mouseenter',function(){setFormation(true)});
    orb.addEventListener('mouseleave',function(){setFormation(false)});
    orb.addEventListener('focus',function(){setFormation(true)});
    orb.addEventListener('blur',function(){setFormation(false)});
    window.addEventListener('resize',rebuild);
    document.fonts.ready.then(rebuild);
    new IntersectionObserver(function(entries){
      if(entries[0].isIntersecting) start();
      else stop();
    }).observe(orb);
    rebuild();
  })();
  (function initPhotoDrag(){
    var gallery=document.querySelector('.photo-grid');
    if(!gallery) return;
    var originals=Array.from(gallery.children);
    if(!originals.length) return;
    originals.forEach(function(item){
      var copy=item.cloneNode(true);
      copy.setAttribute('aria-hidden','true');
      copy.inert=true;
      copy.classList.add('photo-card-copy');
      gallery.appendChild(copy);
    });

    var dragging=false;
    var startX=0;
    var startScrollLeft=0;
    var loopWidth=0;
    var visible=false;
    var frame=0;
    var previousTime=0;
    var pauseUntil=0;
    var pointerInside=false;
    var focused=false;
    var reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
    var dragHint=document.createElement('div');
    dragHint.className='photo-drag-hint';
    dragHint.textContent='drag';
    dragHint.setAttribute('aria-hidden','true');
    document.body.appendChild(dragHint);

    function moveDragHint(event){
      var bounds=dragHint.getBoundingClientRect();
      dragHint.style.left=Math.min(event.clientX+14,innerWidth-bounds.width-8)+'px';
      dragHint.style.top=Math.min(event.clientY+14,innerHeight-bounds.height-8)+'px';
    }

    function measureLoop(){
      var first=gallery.children[0];
      var firstCopy=gallery.children[originals.length];
      if(!first||!firstCopy) return;
      loopWidth=firstCopy.getBoundingClientRect().left-first.getBoundingClientRect().left;
    }

    function wrapScroll(){
      if(!loopWidth) return;
      if(gallery.scrollLeft>=loopWidth) gallery.scrollLeft-=loopWidth;
      else if(gallery.scrollLeft<0) gallery.scrollLeft+=loopWidth;
    }

    function animate(time){
      frame=0;
      if(!visible) return;
      if(previousTime&& !reducedMotion && !dragging && !pointerInside && !focused && time>=pauseUntil){
        gallery.scrollLeft+=((time-previousTime)/1000)*24;
        wrapScroll();
      }
      previousTime=time;
      frame=requestAnimationFrame(animate);
    }

    function start(){
      if(visible) return;
      visible=true;
      previousTime=0;
      frame=requestAnimationFrame(animate);
    }

    function stop(){
      visible=false;
      if(frame) cancelAnimationFrame(frame);
      frame=0;
      previousTime=0;
    }

    gallery.addEventListener('pointerdown',function(event){
      pauseUntil=performance.now()+1200;
      if(event.pointerType!=='mouse'||event.button!==0) return;
      dragging=true;
      dragHint.classList.remove('visible');
      startX=event.clientX;
      startScrollLeft=gallery.scrollLeft;
      gallery.classList.add('dragging');
      gallery.setPointerCapture(event.pointerId);
    });
    gallery.addEventListener('pointermove',function(event){
      if(!dragging) return;
      gallery.scrollLeft=startScrollLeft-(event.clientX-startX);
      wrapScroll();
    });
    function stopDragging(event){
      var wasDragging=dragging;
      dragging=false;
      gallery.classList.remove('dragging');
      pauseUntil=performance.now()+1200;
      if(wasDragging&&event.type==='pointerup'&&pointerInside){
        moveDragHint(event);
        dragHint.classList.add('visible');
      }
    }
    gallery.addEventListener('pointerup',stopDragging);
    gallery.addEventListener('pointercancel',stopDragging);
    gallery.addEventListener('lostpointercapture',stopDragging);
    gallery.addEventListener('dragstart',function(event){event.preventDefault()});
    gallery.addEventListener('pointerenter',function(event){
      if(event.pointerType!=='mouse') return;
      moveDragHint(event);
      dragHint.classList.add('visible');
    });
    gallery.addEventListener('pointermove',function(event){
      if(event.pointerType==='mouse'&&!dragging) moveDragHint(event);
    });
    gallery.addEventListener('pointerleave',function(event){
      if(event.pointerType==='mouse') dragHint.classList.remove('visible');
    });
    gallery.addEventListener('mouseenter',function(){pointerInside=true});
    gallery.addEventListener('mouseleave',function(){pointerInside=false});
    gallery.addEventListener('focusin',function(){focused=true});
    gallery.addEventListener('focusout',function(event){
      if(!gallery.contains(event.relatedTarget)) focused=false;
    });
    gallery.addEventListener('scroll',wrapScroll,{passive:true});
    window.addEventListener('resize',measureLoop);
    if('ResizeObserver' in window) new ResizeObserver(measureLoop).observe(gallery);
    new IntersectionObserver(function(entries){
      if(entries[0].isIntersecting) start();
      else stop();
    }).observe(gallery);
    requestAnimationFrame(measureLoop);
  })();
  (function preselectService(){
    var select=document.getElementById('service');
    var wanted=new URLSearchParams(location.search).get('service');
    if(select&&wanted&&Array.from(select.options).some(function(o){return o.value===wanted})) select.value=wanted;
  })();
  document.querySelectorAll('form[data-demo]').forEach(function(f){
    var note=document.createElement('div'); note.className='success-note'; note.setAttribute('role','status'); note.textContent='This enquiry was not sent or saved. Please email ubunyesafety@gmail.com or call 083 646 7294 to submit it.'; f.appendChild(note);
    f.addEventListener('submit',function(e){e.preventDefault(); if(!f.reportValidity())return; note.classList.add('show'); note.scrollIntoView({behavior:'smooth',block:'nearest'})});
  });
  (function initIntroScroll(){
    var intro=document.getElementById('intro-screen');
    var word=document.getElementById('intro-word');
    var chars=document.querySelectorAll('.intro-char');
    var prompt=document.getElementById('scroll-prompt');
    var wrapper=document.getElementById('main-wrapper');
    var spacer=document.getElementById('intro-spacer');
    var heroH1=document.querySelector('.hero h1');
    if(!intro||!word||!chars.length||!heroH1) return;

    var totalRange=3600;
    if(spacer) spacer.style.height=totalRange+'px';

    var count=chars.length;
    var targetX=0, targetY=0;
    var charCenters=[];
    var wordH=0;

    function measure(){
      var heroStyle=getComputedStyle(heroH1);
      word.style.fontFamily=heroStyle.fontFamily;
      word.style.fontSize=heroStyle.fontSize;
      word.style.fontWeight=heroStyle.fontWeight;
      word.style.lineHeight=heroStyle.lineHeight;
      word.style.letterSpacing=heroStyle.letterSpacing;
      chars.forEach(function(c){ c.style.transform='scale(1)'; });
      word.style.transform='none';
      var wRect=word.getBoundingClientRect();
      wordH=wRect.height;
      charCenters=[];
      chars.forEach(function(c){
        var cRect=c.getBoundingClientRect();
        charCenters.push((cRect.left-wRect.left)+cRect.width/2);
      });

      var curWrapperTop = wrapper ? wrapper.getBoundingClientRect().top : 0;
      var hRect = (heroH1.querySelector('.hero-brand')||heroH1).getBoundingClientRect();
      targetX = hRect.left;
      targetY = hRect.top - curWrapperTop;
    }

    if(document.fonts && document.fonts.ready){
      document.fonts.ready.then(function(){ measure(); updateIntro(); });
    }
    measure();

    function updateIntro(){
      var y=window.scrollY;

      if(wrapper){
        if(y<totalRange){
          wrapper.style.transform='translate3d(0,'+(y-totalRange)+'px,0)';
        } else {
          wrapper.style.transform='none';
        }
      }

      if(prompt) prompt.style.opacity=y>30?'0':'1';

      if(y>=totalRange){
        intro.classList.add('done');
        intro.style.opacity='0';
        return;
      } else {
        intro.classList.remove('done');
      }

      var p=Math.min(1,Math.max(0,y/totalRange));
      var spotlightEnd=0.72;
      var dockEnd=0.90;

      var screenCenterX=window.innerWidth/2;
      var screenCenterY=(window.innerHeight-wordH)/2;

      if(p<spotlightEnd){
        var step=(p/spotlightEnd)*count;
        var activeIdx=Math.min(count-1,Math.floor(step));
        var charProg=step-activeIdx;

        var activeCenter=charCenters[activeIdx]||0;
        if(activeIdx<count-1 && charCenters[activeIdx+1]!==undefined){
          activeCenter+=(charCenters[activeIdx+1]-charCenters[activeIdx])*charProg;
        }

        var curX=screenCenterX-activeCenter;
        var curY=screenCenterY;
        word.style.transform='translate3d('+curX.toFixed(2)+'px,'+curY.toFixed(2)+'px,0)';
        intro.style.opacity='1';

        chars.forEach(function(c,i){
          if(i===activeIdx){
            var zoom=1+Math.sin(charProg*Math.PI)*0.65;
            c.style.transform='scale('+zoom.toFixed(3)+')';
            c.style.color='var(--sig)';
            c.style.textShadow='0 0 40px rgba(220,38,38,0.85), 0 0 80px rgba(220,38,38,0.4)';
          } else {
            c.style.transform='scale(1)';
            c.style.color='rgba(213,217,222,0.35)';
            c.style.textShadow='none';
          }
        });
      } else if(p<dockEnd){
        var dockProg=(p-spotlightEnd)/(dockEnd-spotlightEnd);
        var ease=dockProg<0.5?4*dockProg*dockProg*dockProg:1-Math.pow(-2*dockProg+2,3)/2;

        var lastCenter=charCenters[count-1]||0;
        var startX=screenCenterX-lastCenter;
        var startY=screenCenterY;

        var curX=startX+(targetX-startX)*ease;
        var curY=startY+(targetY-startY)*ease;
        word.style.transform='translate3d('+curX.toFixed(2)+'px,'+curY.toFixed(2)+'px,0)';
        intro.style.opacity='1';

        var alpha=0.35+0.65*ease;
        chars.forEach(function(c){
          c.style.transform='scale(1)';
          c.style.color='rgba(213,217,222,'+alpha.toFixed(2)+')';
          c.style.textShadow='none';
        });
      } else {
        word.style.transform='translate3d('+targetX.toFixed(2)+'px,'+targetY.toFixed(2)+'px,0)';
        var fadeProg=(p-dockEnd)/(1-dockEnd);
        var r=Math.round(213+(241-213)*fadeProg);
        var g=Math.round(217+(245-217)*fadeProg);
        var b=Math.round(222+(249-222)*fadeProg);
        var clr='rgb('+r+','+g+','+b+')';
        chars.forEach(function(c){
          c.style.transform='scale(1)';
          c.style.color=clr;
          c.style.textShadow='none';
        });
        intro.style.opacity=Math.max(0,1-fadeProg).toFixed(3);
      }
    }

    var ticking=false;
    addEventListener('scroll',function(){
      if(!ticking){
        requestAnimationFrame(function(){ updateIntro(); ticking=false; });
        ticking=true;
      }
    },{passive:true});

    addEventListener('resize',function(){
      measure();
      updateIntro();
    });

    updateIntro();
  })();
  (function initFallingWorker(){
    var charEl = document.getElementById('falling-character');
    var charImg = document.getElementById('falling-char-img');
    var ticker = document.querySelector('.ticker');
    var cushion = document.getElementById('landing-cushion');
    var landingText = document.getElementById('landing-text-box');
    if(!charEl || !charImg || !ticker || !cushion) return;

    // Preload images for seamless switching
    var preSafe = new Image(); preSafe.src = 'worker-safe.png';
    var preFall = new Image(); preFall.src = 'worker-falling.png';

    var totalIntroRange = document.getElementById('intro-spacer') ? 3600 : 0;
    var isSafe = false;

    function updateFalling(){
      var y = window.scrollY;
      var winH = window.innerHeight;
      var winW = window.innerWidth;

      if(y < totalIntroRange){
        charEl.classList.remove('visible', 'landed', 'bracing');
        if(isSafe){
          isSafe = false;
          charImg.src = 'worker-falling.png';
        }
        if(landingText) landingText.classList.remove('show');
        if(cushion) cushion.classList.remove('squished');
        return;
      }

      var tRect = ticker.getBoundingClientRect();
      var cRect = cushion.getBoundingClientRect();

      // Before ticker scrolls into upper view
      if(tRect.bottom > winH * 0.85){
        charEl.classList.remove('visible', 'landed', 'bracing');
        if(isSafe){
          isSafe = false;
          charImg.src = 'worker-falling.png';
        }
        if(landingText) landingText.classList.remove('show');
        if(cushion) cushion.classList.remove('squished');
        return;
      }

      charEl.classList.add('visible');

      var charW = charEl.offsetWidth || 160;
      var charH = charEl.offsetHeight || 150;

      var cushionTargetX = cRect.left + (cRect.width / 2) - (charW / 2);
      var cushionTargetY = cRect.top + (cRect.height * 0.3) - (charH * 0.72);

      var midX = (winW / 2) - (charW / 2);
      var midY = winH * 0.46;

      var tickerDocBottom = tRect.bottom + y;
      var cushionDocTop = cRect.top + y;
      var startFallScroll = tickerDocBottom - winH * 0.85;
      var endFallScroll = cushionDocTop - winH * 0.60;
      var totalRange = Math.max(200, endFallScroll - startFallScroll);
      var p = (y - startFallScroll) / totalRange;

      if(p >= 0.92 || cRect.top <= winH * 0.60){
        // PHASE 5: Landed on cushion!
        charEl.classList.add('landed');
        charEl.classList.remove('bracing');
        charEl.style.transform = 'translate3d(' + cushionTargetX.toFixed(1) + 'px,' + cushionTargetY.toFixed(1) + 'px,0)';
        charImg.style.transform = 'none';

        if(!isSafe){
          isSafe = true;
          charImg.src = 'worker-safe.png';
          if(cushion){
            cushion.classList.remove('squished');
            void cushion.offsetWidth; // trigger reflow
            cushion.classList.add('squished');
          }
          if(landingText) landingText.classList.add('show');
        }
      } else {
        // RESET LANDED STATE WHEN SCROLLING BACK UP
        charEl.classList.remove('landed');
        if(landingText) landingText.classList.remove('show');
        if(cushion) cushion.classList.remove('squished');

        if(isSafe){
          isSafe = false;
          charImg.src = 'worker-falling.png';
        }

        if(p < 0.10){
          // PHASE 1: Emerging from under the ribbon
          charEl.classList.remove('bracing');
          var emergeProg = Math.max(0, p) / 0.10;
          var startY = tRect.bottom;
          var curY = startY + (midY - startY) * emergeProg;
          var curX = midX;
          charEl.style.transform = 'translate3d(' + curX.toFixed(1) + 'px,' + curY.toFixed(1) + 'px,0)';
          charImg.style.transform = 'none';
        } else if(p < 0.66){
          // PHASE 2: Stay on screen floating & tumbling behind all elements
          charEl.classList.remove('bracing');
          var floatProg = (p - 0.10) / 0.56;
          var sway = Math.sin(floatProg * Math.PI * 6) * 35;
          var bob = Math.cos(floatProg * Math.PI * 8) * 15;
          var tilt = Math.sin(floatProg * Math.PI * 7) * 12;

          var curX = midX + sway;
          var curY = midY + bob;

          charEl.style.transform = 'translate3d(' + curX.toFixed(1) + 'px,' + curY.toFixed(1) + 'px,0)';
          charImg.style.transform = 'rotate(' + tilt.toFixed(1) + 'deg)';
        } else if(p < 0.72){
          // PHASE 3: Brace for impact!
          charEl.classList.add('bracing');
          var curX = midX;
          var curY = midY + 14;
          charEl.style.transform = 'translate3d(' + curX.toFixed(1) + 'px,' + curY.toFixed(1) + 'px,0)';
          charImg.style.transform = 'scale(0.96, 1.04)';
        } else {
          // PHASE 4: Zoom down quickly onto cushion!
          charEl.classList.remove('bracing');
          var zoomProg = Math.min(1, (p - 0.72) / 0.20);
          var zoomEase = 1 - Math.pow(1 - zoomProg, 3);

          var curX = midX + (cushionTargetX - midX) * zoomEase;
          var curY = midY + (cushionTargetY - midY) * zoomEase;

          charEl.style.transform = 'translate3d(' + curX.toFixed(1) + 'px,' + curY.toFixed(1) + 'px,0)';
          charImg.style.transform = 'scale(' + (1 - 0.08 * zoomEase).toFixed(2) + ')';
        }
      }
    }

    var ticking = false;
    addEventListener('scroll', function(){
      if(!ticking){
        requestAnimationFrame(function(){ updateFalling(); ticking = false; });
        ticking = true;
      }
    }, {passive:true});

    addEventListener('resize', function(){
      updateFalling();
    });

    updateFalling();
  })();

})();
