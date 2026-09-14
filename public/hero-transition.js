(() => {
  const duration = 2200;
  const travelRatio = 0.82;
  let transitionFrame = 0;

  function createTransition() {
    const transition = document.createElement('div');
    transition.className = 'hero-return-transition';
    transition.setAttribute('aria-hidden', 'true');
    transition.innerHTML = `
      <div class="hero-return-panel hero-return-panel-left"></div>
      <div class="hero-return-panel hero-return-panel-right"></div>
      <p class="hero-return-name">
        <span class="hero-return-word hero-return-word-left">ZAIR<span class="hero-return-terminal-a">A</span></span>
        <span class="hero-return-word hero-return-word-right"><span class="hero-return-initial-c">C</span>HRISTA</span>
      </p>`;
    document.body.append(transition);
    return transition;
  }

  const transition = createTransition();
  const leftPanel = transition.querySelector('.hero-return-panel-left');
  const rightPanel = transition.querySelector('.hero-return-panel-right');
  const leftWord = transition.querySelector('.hero-return-word-left');
  const rightWord = transition.querySelector('.hero-return-word-right');
  const terminalA = transition.querySelector('.hero-return-terminal-a');
  const initialC = transition.querySelector('.hero-return-initial-c');
  const measureContext = document.createElement('canvas').getContext('2d');

  function smoothstep(value) {
    return value * value * (3 - 2 * value);
  }

  function measureSeam() {
    const source = document.querySelector('.page-home');
    if (source) {
      const sourceStyle = getComputedStyle(source);
      const seamBottom = sourceStyle.getPropertyValue('--seam-bottom').trim();
      const seamSlant = sourceStyle.getPropertyValue('--seam-slant').trim();
      if (seamBottom) transition.style.setProperty('--return-seam-bottom', seamBottom);
      if (seamSlant) transition.style.setProperty('--return-seam', seamSlant);
      return;
    }

    const verticalScale = window.innerWidth <= 600 ? 3.2 : 2.25;
    leftWord.style.transform = `translate3d(0, 0, 0) scaleY(${verticalScale})`;
    rightWord.style.transform = `translate3d(0, 0, 0) scaleY(${verticalScale})`;
    const aBox = terminalA.getBoundingClientRect();
    const cBox = initialC.getBoundingClientRect();
    let gapMidpoint = (aBox.right + cBox.left) / 2;
    let inkWidth = aBox.width;

    if (measureContext) {
      const style = getComputedStyle(terminalA);
      measureContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
      const aMetrics = measureContext.measureText('A');
      const cMetrics = measureContext.measureText('C');
      const inkRight = aBox.left + aMetrics.actualBoundingBoxRight;
      const inkLeft = cBox.left - cMetrics.actualBoundingBoxLeft;
      if (Number.isFinite(inkRight) && Number.isFinite(inkLeft)) {
        gapMidpoint = (inkRight + inkLeft) / 2;
      }
      const measuredWidth = aMetrics.actualBoundingBoxLeft + aMetrics.actualBoundingBoxRight;
      if (Number.isFinite(measuredWidth) && measuredWidth > 0) inkWidth = measuredWidth;
    }

    const seamSlant = aBox.height > 0
      ? (inkWidth * 0.5 / aBox.height) * window.innerHeight
      : window.innerWidth * 0.07;
    const seamBottom = gapMidpoint + seamSlant * (1 - aBox.bottom / window.innerHeight);
    transition.style.setProperty('--return-seam', `${seamSlant.toFixed(2)}px`);
    transition.style.setProperty('--return-seam-bottom', `${seamBottom.toFixed(2)}px`);
  }

  function render(progress) {
    const edge = 0.07;
    let travelProgress = progress;
    if (progress < edge) {
      travelProgress = edge * smoothstep(progress / edge);
    } else if (progress > 1 - edge) {
      travelProgress = 1 - edge + edge * smoothstep((progress - (1 - edge)) / edge);
    }
    const eased = smoothstep(travelProgress);
    const offset = window.innerWidth * travelRatio * (1 - eased);
    const verticalScale = window.innerWidth <= 600 ? 3.2 : 2.25;
    const wordOpacity = Math.min(travelProgress / 0.18, 1);
    leftPanel.style.transform = `translate3d(${(-offset).toFixed(2)}px, 0, 0)`;
    rightPanel.style.transform = `translate3d(${offset.toFixed(2)}px, 0, 0)`;
    leftWord.style.transform = `translate3d(${(-offset).toFixed(2)}px, 0, 0) scaleY(${verticalScale})`;
    rightWord.style.transform = `translate3d(${offset.toFixed(2)}px, 0, 0) scaleY(${verticalScale})`;
    leftWord.style.opacity = wordOpacity.toFixed(3);
    rightWord.style.opacity = wordOpacity.toFixed(3);
  }

  function play(onCovered) {
    if (transitionFrame) window.cancelAnimationFrame(transitionFrame);
    transition.classList.add('is-active');
    measureSeam();
    render(0);
    const startTime = performance.now();

    function close(timestamp) {
      const progress = Math.min((timestamp - startTime) / duration, 1);
      render(progress);
      if (progress < 1) {
        transitionFrame = window.requestAnimationFrame(close);
        return;
      }

      transitionFrame = 0;
      if (onCovered) onCovered();
      window.requestAnimationFrame(() => {
        transition.classList.remove('is-active');
        render(0);
      });
    }

    transitionFrame = window.requestAnimationFrame(close);
  }

  window.HeroReturnTransition = { play };

  if (!document.body.classList.contains('page-home')) {
    document.querySelectorAll('[data-hero-return-link]').forEach((link) => {
      link.addEventListener('click', (event) => {
        event.preventDefault();
        play(() => window.location.assign(link.href));
      });
    });
  }
})();
