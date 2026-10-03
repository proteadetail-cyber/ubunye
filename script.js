(function(){
  try { localStorage.removeItem('ubunye-theme'); } catch(e){}
  if(!document.querySelector('.skip-link')){var s=document.createElement('a');s.className='skip-link';s.href='#main';s.textContent='Skip to content';document.body.prepend(s)}
  var main=document.querySelector('main'); if(main && !main.id) main.id='main';
  var progress=document.querySelector('.progress');
  function update(){var h=document.documentElement.scrollHeight-innerHeight; if(progress) progress.style.transform='scaleX('+(h?scrollY/h:0)+')'}
  addEventListener('scroll',update,{passive:true}); update();
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}})},{threshold:.12});
  document.querySelectorAll('.reveal').forEach(function(el){io.observe(el)});
  document.querySelectorAll('form[data-demo]').forEach(function(f){
    var note=document.createElement('div'); note.className='success-note'; note.textContent='Draft form validated. Live submission will be connected during deployment.'; f.appendChild(note);
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
      var hRect = heroH1.getBoundingClientRect();
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

    var totalIntroRange = 3600;
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

      if(p >= 1.0 || cRect.top <= winH * 0.60){
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
        } else if(p < 0.82){
          // PHASE 2: Stay on screen floating & tumbling behind all elements
          charEl.classList.remove('bracing');
          var floatProg = (p - 0.10) / 0.72;
          var sway = Math.sin(floatProg * Math.PI * 6) * 35;
          var bob = Math.cos(floatProg * Math.PI * 8) * 15;
          var tilt = Math.sin(floatProg * Math.PI * 7) * 12;

          var curX = midX + sway;
          var curY = midY + bob;

          charEl.style.transform = 'translate3d(' + curX.toFixed(1) + 'px,' + curY.toFixed(1) + 'px,0)';
          charImg.style.transform = 'rotate(' + tilt.toFixed(1) + 'deg)';
        } else if(p < 0.90){
          // PHASE 3: Brace for impact!
          charEl.classList.add('bracing');
          var curX = midX;
          var curY = midY + 14;
          charEl.style.transform = 'translate3d(' + curX.toFixed(1) + 'px,' + curY.toFixed(1) + 'px,0)';
          charImg.style.transform = 'scale(0.96, 1.04)';
        } else {
          // PHASE 4: Zoom down quickly onto cushion!
          charEl.classList.remove('bracing');
          var zoomProg = (p - 0.90) / 0.10;
          var zoomEase = zoomProg * zoomProg * zoomProg;

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

  if(!document.querySelector('.mobile-cta')){var m=document.createElement('div');m.className='mobile-cta';m.innerHTML='<a href="https://wa.me/27675779148">WhatsApp</a><a href="quote.html">Get a quote</a>';document.body.appendChild(m)}
})();
