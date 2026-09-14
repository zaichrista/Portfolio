(() => {
  const page = document.querySelector('.page-home');
  if (!page) return;

  const hero = page.querySelector('.home-hero');
  const leftWord = page.querySelector('.hero-word-left');
  const rightWord = page.querySelector('.hero-word-right');
  const terminalA = page.querySelector('.hero-terminal-a');
  const initialC = page.querySelector('.hero-initial-c');
  const revealCopy = page.querySelector('.reveal-copy');
  const breakawayCopy = page.querySelector('.breakaway-copy');
  const inlineQuestion = page.querySelector('.inline-question');
  const nextSection = page.querySelector('.next-section');
  const archiveKicker = page.querySelector('.archive-kicker');
  const archiveWord = page.querySelector('.archive-word');
  const archiveLetters = Array.from(page.querySelectorAll('.archive-letter'));
  const disciplineSection = page.querySelector('.discipline-section');
  const disciplineLabels = Array.from(page.querySelectorAll('.discipline-label'));
  const portfolioBoard = page.querySelector('.portfolio-board');
  const closingSection = page.querySelector('.closing-section');
  const closingPlaceholder = page.querySelector('.closing-placeholder');
  const closingFooter = page.querySelector('.closing-footer');
  const timelineLinks = Array.from(page.querySelectorAll('[data-scroll-section]'));
  const studioLink = page.querySelector('[data-studio-link]');
  const pageLoader = page.querySelector('.page-loader');
  const pageLoaderValue = page.querySelector('.page-loader-value');
  const sectionTransition = page.querySelector('.section-transition');
  const measureContext = document.createElement('canvas').getContext('2d');
  const splitScrollDistance = 5.46;
  const deconstructionTriggerDistance = 6.76;
  const fallDuration = 1550;
  const reconstructionDuration = 760;
  const questionMorphDistance = 1.1;
  const questionHoldDistance = 3;
  const sectionScrollDistance = 1.35;
  const archiveSectionRiseDistance = 0.55;
  const archiveWordHoldDistance = 1;
  const archiveZoomDistance = 3.25;
  const archiveLetterZoomDuration = 0.58;
  const archiveFrameFillProgress = 0.94;
  const archiveBlackProgress = 0.30 + archiveLetterZoomDuration * archiveFrameFillProgress;
  const disciplineHoldDistance = 2;
  const disciplineMoveDistance = 2;
  const archiveDisplayHoldDistance = 1.25;
  const archiveExitDistance = 1.35;
  const closingPlaceholderHoldDistance = 0.75;
  const footerRiseDistance = 1.35;
  const paragraphScaleY = 1.14;

  let frame = 0;
  let lastFrameTime = 0;
  let seamDirty = true;
  let questionDirty = true;
  let deconstructionProgress = 0;
  let deconstructionTarget = 0;
  let morphAnchorY = null;
  let morphProgress = 0;
  let questionMorphs = [];
  let questionExitLift = window.innerHeight * 0.78;
  let questionExitProgress = 0.72;
  let archiveLetterMotions = [];
  let navigationFrame = 0;
  let navigationTimer = 0;

  function clamp(value, minimum = 0, maximum = 1) {
    return Math.min(Math.max(value, minimum), maximum);
  }

  function smoothstep(value) {
    return value * value * (3 - 2 * value);
  }

  function noise(seed) {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
  }

  function appendQuestionWords(container, text) {
    const words = [];
    const fragment = document.createDocumentFragment();

    text.split(/(\s+)/).forEach((token) => {
      if (/^\s+$/.test(token)) {
        fragment.append(document.createTextNode(token));
        return;
      }

      const word = document.createElement('span');
      word.className = 'question-word';
      word.textContent = token;
      words.push(word);
      fragment.append(word);
    });

    container.replaceChildren(fragment);
    return words;
  }

  if (breakawayCopy) {
    const fragment = document.createDocumentFragment();

    breakawayCopy.textContent.split(/(\s+)/).forEach((token) => {
      if (/^\s+$/.test(token)) {
        fragment.append(document.createTextNode(token));
        return;
      }

      const word = document.createElement('span');
      word.className = 'break-word';

      Array.from(token).forEach((character) => {
        const letter = document.createElement('span');
        letter.className = 'break-letter';
        letter.textContent = character;
        word.append(letter);
      });

      fragment.append(word);
    });

    breakawayCopy.replaceChildren(fragment);
  }

  const questionText = inlineQuestion?.textContent || '';
  const questionWords = inlineQuestion ? appendQuestionWords(inlineQuestion, questionText) : [];
  const breakLetters = Array.from(page.querySelectorAll('.break-letter'));
  const randomizedLetterOrder = breakLetters
    .map((_, index) => index)
    .sort((first, second) => noise(first + 211) - noise(second + 211));
  const fallOrder = new Map(randomizedLetterOrder.map((letterIndex, order) => [letterIndex, order]));
  const fallPhysics = breakLetters.map((_, index) => ({
    delay: breakLetters.length > 1
      ? (fallOrder.get(index) / (breakLetters.length - 1)) * 0.24
      : 0,
    horizontalDrift: noise(index + 307) - 0.5,
    dropVariation: noise(index + 401),
    rotation: (noise(index + 503) - 0.5) * 150
  }));
  const randomizedArchiveOrder = archiveLetters
    .map((_, index) => index)
    .sort((first, second) => noise(first + 607) - noise(second + 607));
  const archiveOrder = new Map(
    randomizedArchiveOrder.map((letterIndex, order) => [letterIndex, order])
  );

  function measureSeam() {
    if (!leftWord || !rightWord || !terminalA || !initialC) return;

    const leftEdge = leftWord.offsetLeft + leftWord.offsetWidth;
    const rightEdge = rightWord.offsetLeft;
    const letterBox = terminalA.getBoundingClientRect();
    let gapMidpoint = (leftEdge + rightEdge) / 2;
    let terminalInkWidth = letterBox.width;

    if (measureContext) {
      const letterStyle = window.getComputedStyle(terminalA);
      measureContext.font = `${letterStyle.fontStyle} ${letterStyle.fontWeight} ${letterStyle.fontSize} ${letterStyle.fontFamily}`;

      const aMetrics = measureContext.measureText('A');
      const cMetrics = measureContext.measureText('C');
      const cBox = initialC.getBoundingClientRect();
      const currentOffset = Number.parseFloat(
        window.getComputedStyle(page).getPropertyValue('--split-offset')
      ) || 0;
      const aInkRight = letterBox.left + aMetrics.actualBoundingBoxRight + currentOffset;
      const cInkLeft = cBox.left - cMetrics.actualBoundingBoxLeft - currentOffset;

      if (Number.isFinite(aInkRight) && Number.isFinite(cInkLeft)) {
        gapMidpoint = (aInkRight + cInkLeft) / 2;
      }

      const measuredInkWidth = aMetrics.actualBoundingBoxLeft + aMetrics.actualBoundingBoxRight;
      if (Number.isFinite(measuredInkWidth) && measuredInkWidth > 0) {
        terminalInkWidth = measuredInkWidth;
      }
    }

    const seamSlant = letterBox.height > 0
      ? (terminalInkWidth * 0.5 / letterBox.height) * window.innerHeight
      : window.innerWidth * 0.07;
    const seamBottom = gapMidpoint + seamSlant * (1 - letterBox.bottom / window.innerHeight);

    page.style.setProperty('--seam-slant', `${seamSlant.toFixed(2)}px`);
    page.style.setProperty('--seam-bottom', `${seamBottom.toFixed(2)}px`);
  }

  function measureQuestionMorph() {
    if (!inlineQuestion || questionWords.length === 0) return;

    questionWords.forEach((word) => {
      word.style.transform = 'none';
    });

    const originBoxes = questionWords.map((word) => word.getBoundingClientRect());
    const measure = document.createElement('p');
    measure.className = 'question-measure';
    measure.setAttribute('aria-hidden', 'true');
    const targetWords = appendQuestionWords(measure, questionText);
    (hero || page).append(measure);
    const targetBoxes = targetWords.map((word) => word.getBoundingClientRect());

    const naturalExitLift = Math.max(...targetBoxes.map((box) => box.bottom))
      + window.innerHeight * 0.12;
    questionExitLift = Math.max(
      naturalExitLift,
      window.innerHeight * 1.2
    );
    questionExitProgress = clamp(naturalExitLift / questionExitLift);

    questionMorphs = originBoxes.map((origin, index) => {
      const target = targetBoxes[index];
      return {
        x: target.left + target.width / 2 - (origin.left + origin.width / 2),
        y: (target.top + target.height / 2 - (origin.top + origin.height / 2)) / paragraphScaleY,
        scale: origin.width > 0 ? target.width / origin.width : 1
      };
    });

    measure.remove();
  }

  function measureArchiveLetterMotions() {
    if (!archiveWord || archiveLetters.length === 0) return;

    archiveWord.style.width = '';
    archiveWord.style.height = '';
    archiveLetters.forEach((letter) => {
      letter.style.position = '';
      letter.style.left = '';
      letter.style.top = '';
      letter.style.fontSize = '';
      letter.style.transform = 'scaleY(1.14)';
    });

    const baseFontSize = Number.parseFloat(window.getComputedStyle(archiveWord).fontSize);
    const wordWidth = archiveWord.offsetWidth;
    const wordHeight = archiveWord.offsetHeight;
    const letterBoxes = archiveLetters.map((letter) => ({
      left: letter.offsetLeft,
      top: letter.offsetTop,
      width: letter.offsetWidth,
      height: letter.offsetHeight
    }));

    if (archiveKicker && letterBoxes.length >= 5) {
      const rangeStart = letterBoxes[2].left;
      const rangeEnd = letterBoxes[4].left + letterBoxes[4].width;
      const rangeWidth = rangeEnd - rangeStart;
      const rangeCentreOffset = (rangeStart + rangeEnd) / 2 - wordWidth / 2;
      archiveKicker.style.width = `${rangeWidth.toFixed(2)}px`;
      archiveKicker.style.marginLeft = `${rangeCentreOffset.toFixed(2)}px`;
    }

    archiveWord.style.width = `${wordWidth}px`;
    archiveWord.style.height = `${wordHeight}px`;

    archiveLetterMotions = archiveLetters.map((letter, index) => {
      const letterBox = letterBoxes[index];
      letter.style.position = 'absolute';
      letter.style.left = `${letterBox.left}px`;
      letter.style.top = `${letterBox.top}px`;

      return {
        left: letterBox.left,
        top: letterBox.top,
        width: letterBox.width,
        height: letterBox.height,
        fontSize: baseFontSize,
        x: wordWidth / 2 - (letterBox.left + letterBox.width / 2),
        delay: archiveLetters.length > 1
          ? (archiveOrder.get(index) / (archiveLetters.length - 1)) * 0.30
          : 0,
        scale: 42 + noise(index + 701) * 24
      };
    });
  }

  function ensureScrollRunway(anchorY) {
    const requiredScrollEnd = anchorY + window.innerHeight * (
      questionMorphDistance + questionHoldDistance + sectionScrollDistance
      + archiveWordHoldDistance + archiveZoomDistance
      + disciplineHoldDistance + disciplineMoveDistance + archiveDisplayHoldDistance
      + archiveExitDistance + closingPlaceholderHoldDistance
      + footerRiseDistance
    );
    const requiredDocumentHeight = requiredScrollEnd + window.innerHeight;

    if (document.documentElement.scrollHeight < requiredDocumentHeight) {
      page.style.minHeight = `${Math.ceil(requiredDocumentHeight)}px`;
    }
  }

  function timelineTargets() {
    const viewport = window.innerHeight;
    const triggerY = viewport * deconstructionTriggerDistance;
    const morphEndY = triggerY + viewport * questionMorphDistance;
    const questionHoldEndY = morphEndY + viewport * questionHoldDistance;
    const archiveCentreY = questionHoldEndY + viewport * sectionScrollDistance;
    const archiveZoomStartY = archiveCentreY + viewport * archiveWordHoldDistance;
    const blackStartY = archiveZoomStartY
      + viewport * archiveZoomDistance * archiveBlackProgress;
    const disciplineMoveEndY = blackStartY
      + viewport * (disciplineHoldDistance + disciplineMoveDistance);
    const archiveExitEndY = disciplineMoveEndY
      + viewport * (archiveDisplayHoldDistance + archiveExitDistance);

    return {
      home: 0,
      about: viewport * splitScrollDistance,
      archiveIntro: archiveCentreY,
      archive: disciplineMoveEndY,
      substack: archiveExitEndY
    };
  }

  function setActiveTimelineLink(sectionName) {
    timelineLinks.forEach((link) => {
      if (link.dataset.scrollSection === sectionName) {
        link.setAttribute('aria-current', 'page');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  function activeTimelineSection() {
    const targets = timelineTargets();
    const scrollPosition = window.scrollY;
    if (scrollPosition >= targets.substack - window.innerHeight * 0.35) return 'substack';
    if (scrollPosition >= targets.archive - window.innerHeight * 0.75) return 'archive';
    if (scrollPosition >= targets.about - window.innerHeight * 0.35) return 'about';
    return 'home';
  }

  function stopTimelineNavigation() {
    if (navigationFrame) window.cancelAnimationFrame(navigationFrame);
    if (navigationTimer) window.clearTimeout(navigationTimer);
    navigationFrame = 0;
    navigationTimer = 0;
    sectionTransition?.classList.remove('is-visible');
    pageLoader?.classList.remove('is-visible');
  }

  function resetNarrativeState() {
    deconstructionProgress = 0;
    deconstructionTarget = 0;
    morphAnchorY = null;
    morphProgress = 0;
    lastFrameTime = 0;
  }

  function completeNarrativeState() {
    deconstructionProgress = 1;
    deconstructionTarget = 1;
    morphAnchorY = window.innerHeight * deconstructionTriggerDistance;
    morphProgress = 1;
    lastFrameTime = 0;
    ensureScrollRunway(morphAnchorY);
  }

  function updateLocation(sectionName, updateHash) {
    if (!updateHash) return;
    history.replaceState(null, '', `#${sectionName}`);
  }

  function animateScrollTo(target, duration, onComplete) {
    const start = window.scrollY;
    const distance = target - start;
    const startTime = performance.now();

    function step(timestamp) {
      const progress = clamp((timestamp - startTime) / duration);
      const edge = 0.07;
      let eased = progress;
      if (progress < edge) {
        eased = edge * smoothstep(progress / edge);
      } else if (progress > 1 - edge) {
        eased = 1 - edge + edge * smoothstep((progress - (1 - edge)) / edge);
      }
      window.scrollTo(0, start + distance * eased);

      if (progress < 1) {
        navigationFrame = window.requestAnimationFrame(step);
        return;
      }

      navigationFrame = 0;
      if (onComplete) onComplete();
    }

    navigationFrame = window.requestAnimationFrame(step);
  }

  function jumpToSection(sectionName) {
    const targets = timelineTargets();
    if (sectionName === 'home') {
      resetNarrativeState();
      window.scrollTo(0, targets.home);
    } else if (sectionName === 'about') {
      resetNarrativeState();
      window.scrollTo(0, targets.about);
    } else {
      completeNarrativeState();
      window.scrollTo(0, targets[sectionName] ?? targets.home);
    }
    setActiveTimelineLink(sectionName);
    requestUpdate();
  }

  function navigateTimeline(sectionName, updateHash = true) {
    const targets = timelineTargets();
    stopTimelineNavigation();
    ensureScrollRunway(window.innerHeight * deconstructionTriggerDistance);
    setActiveTimelineLink(sectionName);

    if (sectionName === 'home') {
      const finishAtHero = () => {
        resetNarrativeState();
        window.scrollTo(0, targets.home);
        updateScene(performance.now());
        setActiveTimelineLink('home');
        updateLocation('home', updateHash);
      };

      if (window.HeroReturnTransition) {
        window.HeroReturnTransition.play(finishAtHero);
      } else {
        finishAtHero();
      }
      return;
    }

    if (sectionName === 'about') {
      resetNarrativeState();
      window.scrollTo(0, targets.home);
      requestUpdate();
      navigationFrame = window.requestAnimationFrame(() => {
        navigationFrame = 0;
        animateScrollTo(targets.about, 2200, () => updateLocation('about', updateHash));
      });
      return;
    }

    if (sectionName === 'archive') {
      completeNarrativeState();
      window.scrollTo(0, targets.archiveIntro);
      requestUpdate();
      navigationFrame = window.requestAnimationFrame(() => {
        navigationFrame = 0;
        animateScrollTo(targets.archive, 3600, () => updateLocation('archive', updateHash));
      });
      return;
    }

    if (sectionName === 'substack') {
      if (sectionTransition) sectionTransition.classList.add('is-visible');
      navigationTimer = window.setTimeout(() => {
        navigationTimer = 0;
        jumpToSection('substack');
        updateLocation('substack', updateHash);
        window.requestAnimationFrame(() => sectionTransition?.classList.remove('is-visible'));
      }, 430);
    }
  }

  function runStudioLoader(sectionName) {
    stopTimelineNavigation();
    if (sectionName === 'home') {
      navigateTimeline('home', false);
      history.replaceState(null, '', '#home');
      return;
    }

    if (!pageLoader || !pageLoaderValue) {
      jumpToSection(sectionName);
      return;
    }

    pageLoader.classList.add('is-visible');
    const startTime = performance.now();
    const duration = 1050;

    function load(timestamp) {
      const progress = clamp((timestamp - startTime) / duration);
      pageLoaderValue.textContent = `${Math.round(progress * 100)}%`;
      if (progress < 1) {
        navigationFrame = window.requestAnimationFrame(load);
        return;
      }

      navigationFrame = 0;
      jumpToSection(sectionName);
      history.replaceState(null, '', `#${sectionName}`);
      window.requestAnimationFrame(() => pageLoader.classList.remove('is-visible'));
    }

    navigationFrame = window.requestAnimationFrame(load);
  }

  function loadStudio() {
    if (!studioLink || !pageLoader || !pageLoaderValue) {
      window.location.assign('/studio.html');
      return;
    }

    stopTimelineNavigation();
    pageLoaderValue.textContent = '0%';
    pageLoader.classList.add('is-visible');
    const startTime = performance.now();
    const duration = 900;

    function load(timestamp) {
      const progress = clamp((timestamp - startTime) / duration);
      pageLoaderValue.textContent = `${Math.round(progress * 100)}%`;
      if (progress < 1) {
        navigationFrame = window.requestAnimationFrame(load);
        return;
      }
      navigationFrame = 0;
      window.location.assign(studioLink.href);
    }

    navigationFrame = window.requestAnimationFrame(load);
  }

  function updateScene(timestamp) {
    frame = 0;

    const elapsed = lastFrameTime ? Math.min(timestamp - lastFrameTime, 64) : 0;
    lastFrameTime = timestamp;

    const splitProgress = clamp(
      window.scrollY / (window.innerHeight * splitScrollDistance)
    );
    const easedSplit = smoothstep(splitProgress);
    const splitOffset = easedSplit * window.innerWidth * 0.82;
    const wordFade = splitProgress < 0.82 ? 1 : Math.max(0, (1 - splitProgress) / 0.18);

    const triggerY = window.innerHeight * deconstructionTriggerDistance;
    const isPastTrigger = window.scrollY > triggerY;

    // Anchor the question as soon as the fall begins so the two movements can
    // overlap. The fall itself remains autonomous once triggered.
    if (isPastTrigger && morphAnchorY === null) {
      morphAnchorY = triggerY;
      ensureScrollRunway(morphAnchorY);
    }

    const scrollMorphProgress = morphAnchorY === null
      ? 0
      : clamp((window.scrollY - morphAnchorY) / (window.innerHeight * questionMorphDistance));
    const fallMorphAllowance = clamp((deconstructionProgress - 0.08) / 0.92);
    morphProgress = Math.min(scrollMorphProgress, fallMorphAllowance);

    // The paragraph cannot rebuild until the question has returned to its
    // original position. This keeps the reverse animation in the same order.
    deconstructionTarget = isPastTrigger || morphProgress > 0 ? 1 : 0;

    if (deconstructionProgress !== deconstructionTarget) {
      const direction = deconstructionTarget > deconstructionProgress ? 1 : -1;
      const activeDuration = direction > 0 ? fallDuration : reconstructionDuration;
      deconstructionProgress = clamp(
        deconstructionProgress + direction * elapsed / activeDuration
      );

      if (Math.abs(deconstructionProgress - deconstructionTarget) < 0.0005) {
        deconstructionProgress = deconstructionTarget;
      }

      if (deconstructionProgress === 0) {
        morphAnchorY = null;
        morphProgress = 0;
      }
    }

    if (seamDirty) {
      measureSeam();
      seamDirty = false;
    }

    if (questionDirty) {
      measureQuestionMorph();
      measureArchiveLetterMotions();
      questionDirty = false;
    }

    page.style.setProperty('--split-offset', `${splitOffset.toFixed(2)}px`);
    page.style.setProperty('--split-offset-left', `${(-splitOffset).toFixed(2)}px`);
    page.style.setProperty('--word-opacity', wordFade.toFixed(3));
    page.style.setProperty('--header-opacity', '1');
    page.style.setProperty('--header-pointer-events', 'auto');

    breakLetters.forEach((letter, index) => {
      const physics = fallPhysics[index];
      const letterProgress = clamp(
        (deconstructionProgress - physics.delay) / (1 - physics.delay)
      );
      const gravityProgress = letterProgress * letterProgress;
      const horizontalDistance = window.innerWidth * physics.horizontalDrift * 0.12;
      const verticalDistance = window.innerHeight * (1.25 + physics.dropVariation * 0.55);
      const x = horizontalDistance * letterProgress;
      const y = verticalDistance * gravityProgress;
      const rotation = physics.rotation * letterProgress;

      letter.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${rotation.toFixed(2)}deg)`;
    });

    const rawMorph = morphProgress;
    const easedMorph = smoothstep(rawMorph);
    const goldProgress = smoothstep(clamp((rawMorph - 0.08) / 0.62));
    const morphEndY = morphAnchorY === null
      ? Number.POSITIVE_INFINITY
      : morphAnchorY + window.innerHeight * questionMorphDistance;
    const questionHoldEndY = morphEndY + window.innerHeight * questionHoldDistance;
    const sectionProgress = clamp(
      (window.scrollY - questionHoldEndY) / (window.innerHeight * sectionScrollDistance)
    );
    const questionSectionLift = questionExitLift * sectionProgress;
    const archiveSectionLift = window.innerHeight * archiveSectionRiseDistance * sectionProgress;
    const archiveZoomStartY = questionHoldEndY
      + window.innerHeight * (sectionScrollDistance + archiveWordHoldDistance);
    const archiveZoomProgress = clamp(
      (window.scrollY - archiveZoomStartY) / (window.innerHeight * archiveZoomDistance)
    );
    const blackStartY = archiveZoomStartY
      + window.innerHeight * archiveZoomDistance * archiveBlackProgress;
    const disciplineMoveStartY = blackStartY + window.innerHeight * disciplineHoldDistance;
    const disciplineMoveEndY = disciplineMoveStartY + window.innerHeight * disciplineMoveDistance;
    const disciplineMoveProgress = smoothstep(clamp(
      (window.scrollY - disciplineMoveStartY)
      / (window.innerHeight * disciplineMoveDistance)
    ));
    const archiveExitStartY = disciplineMoveEndY
      + window.innerHeight * archiveDisplayHoldDistance;
    const archiveExitProgress = morphAnchorY === null ? 0 : smoothstep(clamp(
      (window.scrollY - archiveExitStartY) / (window.innerHeight * archiveExitDistance)
    ));
    const archiveExitEndY = archiveExitStartY + window.innerHeight * archiveExitDistance;
    const footerRiseStartY = archiveExitEndY
      + window.innerHeight * closingPlaceholderHoldDistance;
    const footerProgress = morphAnchorY === null ? 0 : smoothstep(clamp(
      (window.scrollY - footerRiseStartY) / (window.innerHeight * footerRiseDistance)
    ));
    let archiveCoversFrame = archiveLetters.length > 0
      && archiveLetterMotions.length === archiveLetters.length;

    questionWords.forEach((word, index) => {
      const morph = questionMorphs[index];
      if (!morph) return;

      const scale = 1 + (morph.scale - 1) * easedMorph;
      const y = morph.y * easedMorph - questionSectionLift / paragraphScaleY;
      word.style.transform = `translate3d(${(morph.x * easedMorph).toFixed(2)}px, ${y.toFixed(2)}px, 0) scale(${scale.toFixed(4)})`;
    });

    if (revealCopy) {
      revealCopy.style.visibility = sectionProgress >= questionExitProgress
        ? 'hidden'
        : 'visible';
    }

    if (nextSection) {
      nextSection.style.top = `calc(105% - ${archiveSectionLift.toFixed(2)}px)`;
      nextSection.style.color = 'rgb(16, 18, 24)';
    }

    if (archiveWord) {
      archiveWord.style.transform = 'none';
    }

    archiveLetters.forEach((letter, index) => {
      const motion = archiveLetterMotions[index];
      if (!motion) return;

      const letterProgress = clamp(
        (archiveZoomProgress - motion.delay) / archiveLetterZoomDuration
      );
      if (letterProgress < archiveFrameFillProgress) archiveCoversFrame = false;
      const travelProgress = smoothstep(letterProgress);
      const letterZoomProgress = clamp(
        (archiveZoomProgress - motion.delay) / (archiveBlackProgress - motion.delay)
      );
      const letterScale = 1 + (motion.scale - 1) * Math.pow(letterZoomProgress, 1.15);
      const width = motion.width * letterScale;
      const height = motion.height * letterScale;
      const centreX = motion.left + motion.width / 2 + motion.x * travelProgress;
      const centreY = motion.top + motion.height / 2;

      letter.style.left = `${(centreX - width / 2).toFixed(2)}px`;
      letter.style.top = `${(centreY - height / 2).toFixed(2)}px`;
      letter.style.fontSize = `${(motion.fontSize * letterScale).toFixed(2)}px`;
      letter.style.transform = 'scaleY(1.14)';
      letter.style.zIndex = `${Math.round(travelProgress * 100) + index}`;
    });

    const closingHasCoveredFrame = archiveCoversFrame && archiveExitProgress >= 0.999;
    const backgroundChannel = archiveCoversFrame
      ? (closingHasCoveredFrame ? 255 : 16)
      : 224;
    const backgroundGreen = archiveCoversFrame
      ? (closingHasCoveredFrame ? 241 : 18)
      : 225;
    const backgroundBlue = archiveCoversFrame
      ? (closingHasCoveredFrame ? 242 : 24)
      : 221;
    const backgroundColour = `rgb(${backgroundChannel}, ${backgroundGreen}, ${backgroundBlue})`;
    const headerColour = archiveCoversFrame
      ? (archiveExitProgress >= 0.9 ? 'rgb(16, 18, 24)' : 'rgb(255, 255, 255)')
      : 'rgb(16, 18, 24)';
    page.style.backgroundColor = backgroundColour;
    if (hero) hero.style.backgroundColor = backgroundColour;
    page.style.setProperty('--header-color', headerColour);
    if (archiveWord) archiveWord.style.visibility = archiveCoversFrame ? 'hidden' : 'visible';
    if (archiveKicker) archiveKicker.style.visibility = archiveCoversFrame ? 'hidden' : 'visible';

    if (disciplineSection) {
      const disciplineVisible = archiveCoversFrame && archiveExitProgress < 0.999;
      disciplineSection.style.visibility = disciplineVisible ? 'visible' : 'hidden';
      disciplineSection.style.transform = `translate3d(0, ${(-100 * archiveExitProgress).toFixed(3)}vh, 0)`;
    }

    if (closingSection) {
      const closingVisible = archiveCoversFrame && archiveExitProgress > 0.001;
      const closingEntryOffset = 100 * (1 - archiveExitProgress);
      closingSection.style.visibility = closingVisible ? 'visible' : 'hidden';
      closingSection.style.transform = `translate3d(0, ${(closingEntryOffset - 59.5 * footerProgress).toFixed(3)}vh, 0)`;
      if (closingPlaceholder) closingPlaceholder.style.opacity = '1';
      if (closingFooter) {
        const footerReady = footerProgress > 0.72;
        closingFooter.inert = !footerReady;
        closingFooter.setAttribute('aria-hidden', footerReady ? 'false' : 'true');
      }
    }

    const disciplineTop = Math.min(Math.max(window.innerHeight * 0.125, 120), 136);
    const labelContents = disciplineLabels.map((label) => label.firstElementChild || label);
    const finalFontSize = parseFloat(getComputedStyle(disciplineLabels[0]).fontSize || 48);
    const disciplineLineGap = Math.max(finalFontSize * 0.72, 38);
    const labelScale = 0.42 + disciplineMoveProgress * 0.58;

    disciplineLabels.forEach((label, index) => {
      const content = labelContents[index];
      const labelStyle = getComputedStyle(label);
      const targetLeft = window.innerWidth * index / 3 + parseFloat(labelStyle.paddingLeft || 0);
      let visualWidth = content.offsetWidth;
      let visualHeight = content.offsetHeight;

      if (index === 0) {
        const firstWord = content.querySelector('.discipline-brand-first');
        const secondWord = content.querySelector('.discipline-brand-second');
        if (firstWord && secondWord) {
          const lineHeight = parseFloat(labelStyle.lineHeight || finalFontSize * 0.84);
          const inlineGap = finalFontSize * 0.2;
          const secondX = (firstWord.offsetWidth + inlineGap) * (1 - disciplineMoveProgress);
          const secondY = -lineHeight * (1 - disciplineMoveProgress);
          secondWord.style.transform = `translate3d(${secondX.toFixed(2)}px, ${secondY.toFixed(2)}px, 0)`;
          visualWidth = Math.max(firstWord.offsetWidth, secondX + secondWord.offsetWidth);
          visualHeight = lineHeight * (1 + disciplineMoveProgress);
        }
      }

      content.style.transform = `scale(${labelScale.toFixed(4)})`;
      const stackedX = window.innerWidth / 2;
      const stackedY = window.innerHeight / 2 + (index - 1) * disciplineLineGap;
      const inverseProgress = 1 - disciplineMoveProgress;
      const currentX = targetLeft + visualWidth * labelScale / 2;
      const currentY = disciplineTop + visualHeight * labelScale / 2;
      const x = (stackedX - currentX) * inverseProgress;
      const y = (stackedY - currentY) * inverseProgress;
      label.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
    });

    if (portfolioBoard) {
      const boardProgress = smoothstep(clamp((disciplineMoveProgress - 0.78) / 0.22));
      const boardVisible = archiveCoversFrame && boardProgress > 0;
      const boardReady = archiveCoversFrame && boardProgress >= 0.98 && archiveExitProgress === 0;
      portfolioBoard.style.visibility = boardVisible ? 'visible' : 'hidden';
      portfolioBoard.style.opacity = boardProgress.toFixed(3);
      portfolioBoard.style.transform = `translate3d(0, ${((1 - boardProgress) * 11).toFixed(3)}vh, 0)`;
      portfolioBoard.inert = !boardReady;
      portfolioBoard.setAttribute('aria-hidden', boardVisible ? 'false' : 'true');
    }

    if (inlineQuestion) {
      const red = Math.round(16 + (178 - 16) * goldProgress);
      const green = Math.round(18 + (134 - 18) * goldProgress);
      const blue = Math.round(24 + (34 - 24) * goldProgress);
      inlineQuestion.style.color = `rgb(${red}, ${green}, ${blue})`;
    }

    if (!navigationFrame && !navigationTimer) setActiveTimelineLink(activeTimelineSection());

    if (deconstructionProgress !== deconstructionTarget) {
      requestUpdate();
    } else {
      lastFrameTime = 0;
    }
  }

  function requestUpdate() {
    if (frame) return;
    frame = window.requestAnimationFrame(updateScene);
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  timelineLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      navigateTimeline(link.dataset.scrollSection);
    });
  });
  studioLink?.addEventListener('click', (event) => {
    event.preventDefault();
    loadStudio();
  });
  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) {
      stopTimelineNavigation();
    }
  });
  window.addEventListener('resize', () => {
    stopTimelineNavigation();
    seamDirty = true;
    questionDirty = true;
    if (morphAnchorY !== null) ensureScrollRunway(morphAnchorY);
    requestUpdate();
  });

  if (document.fonts) {
    document.fonts.ready.then(() => {
      seamDirty = true;
      questionDirty = true;
      requestUpdate();
    });
  }

  requestUpdate();

  const parameters = new URLSearchParams(window.location.search);
  const initialSection = parameters.get('section') || window.location.hash.replace(/^#/, '');
  const validInitialSection = timelineLinks.some(
    (link) => link.dataset.scrollSection === initialSection
  );

  if (parameters.get('from') === 'studio' && validInitialSection) {
    window.requestAnimationFrame(() => runStudioLoader(initialSection));
  } else if (validInitialSection && initialSection !== 'home') {
    window.requestAnimationFrame(() => navigateTimeline(initialSection, false));
  }
})();

(() => {
  const modal = document.querySelector('.project-modal');
  if (!modal) return;

  const panel = modal.querySelector('.project-modal-panel');
  const identity = modal.querySelector('.project-modal-identity');
  const closeButton = modal.querySelector('.project-modal-close');
  const previousButton = modal.querySelector('.project-previous');
  const nextButton = modal.querySelector('.project-next');
  const scrollbar = modal.querySelector('.project-scrollbar');
  const scrollTrack = modal.querySelector('.project-scroll-track');
  const scrollThumb = modal.querySelector('.project-scroll-thumb');
  const scrollUp = modal.querySelector('.project-scroll-up');
  const scrollDown = modal.querySelector('.project-scroll-down');
  const projectLinks = Array.from(document.querySelectorAll('.project-copy a'));
  const backgroundRegions = [
    document.querySelector('.home-header'),
    document.querySelector('.home-hero')
  ].filter(Boolean);
  const projects = [
    ['brand-strategy-1', 'BRAND STRATEGY', '01'],
    ['brand-strategy-2', 'BRAND STRATEGY', '02'],
    ['brand-strategy-3', 'BRAND STRATEGY', '03'],
    ['design-1', 'DESIGN', '01'],
    ['design-2', 'DESIGN', '02'],
    ['design-3', 'DESIGN', '03'],
    ['research-1', 'RESEARCH', '01'],
    ['research-2', 'RESEARCH', '02'],
    ['research-3', 'RESEARCH', '03']
  ];
  let currentProject = 0;
  let returnFocus = null;
  let dragStartY = 0;
  let dragStartScroll = 0;

  function updateScrollbar() {
    if (!scrollTrack || !scrollThumb || !scrollbar) return;
    const maximumScroll = Math.max(panel.scrollHeight - panel.clientHeight, 0);
    const trackHeight = scrollTrack.clientHeight;
    const thumbHeight = maximumScroll === 0
      ? trackHeight
      : Math.max(trackHeight * panel.clientHeight / panel.scrollHeight, trackHeight * 0.08);
    const thumbTravel = Math.max(trackHeight - thumbHeight, 0);
    const scrollProgress = maximumScroll === 0 ? 0 : panel.scrollTop / maximumScroll;
    scrollThumb.style.height = `${thumbHeight.toFixed(2)}px`;
    scrollThumb.style.top = `${(thumbTravel * scrollProgress).toFixed(2)}px`;
    scrollbar.setAttribute('aria-valuenow', `${Math.round(scrollProgress * 100)}`);
  }

  function showProject(index, resetScroll = true) {
    currentProject = Math.min(Math.max(index, 0), projects.length - 1);
    const [, category, number] = projects[currentProject];
    identity.textContent = `${category} ${number}`;
    previousButton.disabled = currentProject === 0;
    nextButton.disabled = currentProject === projects.length - 1;
    previousButton.setAttribute('aria-label', currentProject === 0
      ? 'No previous project'
      : `View ${projects[currentProject - 1][1]} ${projects[currentProject - 1][2]}`);
    nextButton.setAttribute('aria-label', currentProject === projects.length - 1
      ? 'No next project'
      : `View ${projects[currentProject + 1][1]} ${projects[currentProject + 1][2]}`);
    if (resetScroll) panel.scrollTop = 0;
    window.requestAnimationFrame(updateScrollbar);
  }

  function openProject(index, trigger) {
    returnFocus = trigger;
    showProject(index, true);
    modal.hidden = false;
    document.body.classList.add('project-modal-open');
    backgroundRegions.forEach((region) => { region.inert = true; });
    window.requestAnimationFrame(updateScrollbar);
    closeButton.focus({ preventScroll: true });
  }

  function closeProject() {
    modal.hidden = true;
    document.body.classList.remove('project-modal-open');
    backgroundRegions.forEach((region) => { region.inert = false; });
    if (returnFocus) returnFocus.focus({ preventScroll: true });
  }

  projectLinks.forEach((link) => {
    const projectId = link.getAttribute('href')?.replace(/^#/, '');
    const index = projects.findIndex(([id]) => id === projectId);
    if (index < 0) return;
    link.addEventListener('click', (event) => {
      event.preventDefault();
      openProject(index, link);
    });
  });

  closeButton.addEventListener('click', closeProject);
  previousButton.addEventListener('click', () => showProject(currentProject - 1));
  nextButton.addEventListener('click', () => showProject(currentProject + 1));
  panel.addEventListener('scroll', updateScrollbar, { passive: true });
  scrollUp?.addEventListener('click', () => panel.scrollBy({ top: -panel.clientHeight * 0.24, behavior: 'smooth' }));
  scrollDown?.addEventListener('click', () => panel.scrollBy({ top: panel.clientHeight * 0.24, behavior: 'smooth' }));
  scrollTrack?.addEventListener('click', (event) => {
    if (event.target === scrollThumb) return;
    const trackBox = scrollTrack.getBoundingClientRect();
    const ratio = Math.min(Math.max((event.clientY - trackBox.top) / trackBox.height, 0), 1);
    panel.scrollTo({ top: ratio * (panel.scrollHeight - panel.clientHeight), behavior: 'smooth' });
  });
  scrollThumb?.addEventListener('pointerdown', (event) => {
    dragStartY = event.clientY;
    dragStartScroll = panel.scrollTop;
    scrollThumb.setPointerCapture(event.pointerId);
  });
  scrollThumb?.addEventListener('pointermove', (event) => {
    if (!scrollThumb.hasPointerCapture(event.pointerId)) return;
    const maximumScroll = Math.max(panel.scrollHeight - panel.clientHeight, 0);
    const thumbTravel = Math.max(scrollTrack.clientHeight - scrollThumb.offsetHeight, 1);
    panel.scrollTop = dragStartScroll + (event.clientY - dragStartY) / thumbTravel * maximumScroll;
  });
  window.addEventListener('resize', updateScrollbar);
  modal.addEventListener('click', (event) => {
    if (event.target === modal) closeProject();
  });
  document.addEventListener('keydown', (event) => {
    if (modal.hidden) return;
    if (event.key === 'Escape') closeProject();
    if (event.key === 'ArrowLeft' && !previousButton.disabled) showProject(currentProject - 1);
    if (event.key === 'ArrowRight' && !nextButton.disabled) showProject(currentProject + 1);
    if (event.key === 'Tab') {
      const controls = [closeButton, previousButton, nextButton].filter((button) => !button.disabled);
      const firstControl = controls[0];
      const lastControl = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === firstControl) {
        event.preventDefault();
        lastControl.focus();
      } else if (!event.shiftKey && document.activeElement === lastControl) {
        event.preventDefault();
        firstControl.focus();
      }
    }
  });
})();
