(() => {
  const page = document.querySelector('.page-home');
  if (!page) return;

  const hero = page.querySelector('.home-hero');
  const leftWord = page.querySelector('.hero-word-left');
  const rightWord = page.querySelector('.hero-word-right');
  const terminalA = page.querySelector('.hero-terminal-a');
  const initialC = page.querySelector('.hero-initial-c');
  const heroLetters = Array.from(page.querySelectorAll('.hero-letter'));
  const heroScrollCue = page.querySelector('.hero-scroll-cue');
  const closingLetters = Array.from(page.querySelectorAll('.closing-letter'));
  const revealCopy = page.querySelector('.reveal-copy');
  const breakawayCopy = page.querySelector('.breakaway-copy');
  const inlineQuestion = page.querySelector('.inline-question');
  const nextSection = page.querySelector('.next-section');
  const archiveKicker = page.querySelector('.archive-kicker');
  const archiveWord = page.querySelector('.archive-word');
  const archiveLetters = Array.from(page.querySelectorAll('.archive-letter'));
  const disciplineSection = page.querySelector('.discipline-section');
  const archiveEdition = page.querySelector('.archive-edition');
  const archiveHeadingRule = page.querySelector('.archive-heading-rule');
  const disciplineLabels = Array.from(page.querySelectorAll('.discipline-label'));
  const portfolioBoard = page.querySelector('.portfolio-board');
  const projectCards = Array.from(page.querySelectorAll('.portfolio-board .project-card'));
  const archiveProgress = page.querySelector('.archive-progress');
  const closingSection = page.querySelector('.closing-section');
  const closingPlaceholder = page.querySelector('.closing-placeholder');
  const closingFooter = page.querySelector('.closing-footer');
  const timelineLinks = Array.from(page.querySelectorAll('[data-scroll-section]'));
  const studioLink = page.querySelector('[data-studio-link]');
  const pageLoader = page.querySelector('.page-loader');
  const pageLoaderValue = page.querySelector('.page-loader-value');
  const sectionTransition = page.querySelector('.section-transition');
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const measureContext = document.createElement('canvas').getContext('2d');
  const splitScrollDistance = 2.3;
  const deconstructionTriggerDistance = 3.25;
  const fallDuration = 1150;
  const reconstructionDuration = 720;
  const questionMorphDistance = 0.8;
  const questionHoldDistance = 1.05;
  const sectionScrollDistance = 0.8;
  const archiveSectionRiseDistance = 0.55;
  const archiveWordHoldDistance = 0.4;
  const archiveZoomDistance = 1.5;
  const archiveLetterZoomDuration = 0.58;
  const archiveScaleCompleteProgress = 0.88;
  const archiveLetterFillProgress = 0.94;
  const archiveBlackProgress = 1;
  const disciplineHoldDistance = 0.5;
  const disciplineMoveDistance = 0.95;
  const archiveDisplayHoldDistance = 0.2;
  const projectScrollDistance = 1.7;
  const projectSequenceDistance = projectCards.length * projectScrollDistance;
  const archiveExitDistance = 1.2;
  const closingPlaceholderHoldDistance = 1.65;
  const footerRiseDistance = 1.4;
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
  let disciplineMetrics = [];
  let disciplineBandCenter = 0;
  let disciplineLineGap = 38;
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

  function scheduleLetterFlash(letters) {
    if (motionPreference.matches) return;
    const delay = 4200 + Math.random() * 1800;
    window.setTimeout(() => showLetterFlash(letters), delay);
  }

  function showLetterFlash(letters) {
    const regionVisible = letters === heroLetters
      ? window.scrollY < window.innerHeight * splitScrollDistance * 0.8
      : window.scrollY > timelineTargets().substack
        + window.innerHeight * (closingPlaceholderHoldDistance + footerRiseDistance * 0.7);
    if (document.hidden || !regionVisible || letters.length === 0) {
      scheduleLetterFlash(letters);
      return;
    }

    const letter = letters[Math.floor(Math.random() * letters.length)];
    letter.style.setProperty('--flash-hue', `${Math.floor(Math.random() * 360)}`);
    letter.classList.add('is-calligraphic-flash');

    window.setTimeout(() => {
      letter.classList.remove('is-calligraphic-flash');
      letter.style.removeProperty('--flash-hue');
      scheduleLetterFlash(letters);
    }, 240);
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
        scale: Math.max(
          120 + noise(index + 701) * 30,
          window.innerWidth / Math.max(letterBox.width, 1) * 1.3,
          window.innerHeight / Math.max(letterBox.height, 1) * 1.3
        )
      };
    });
  }

  function measureDisciplineLabels() {
    disciplineBandCenter = archiveEdition && archiveHeadingRule
      ? (archiveEdition.offsetTop + archiveEdition.offsetHeight + archiveHeadingRule.offsetTop) / 2
      : window.innerHeight * 0.16;
    const fontSizes = disciplineLabels.map((label) =>
      Number.parseFloat(window.getComputedStyle(label).fontSize) || 48);
    disciplineLineGap = Math.max(Math.max(...fontSizes) * 0.72, 38);
    disciplineMetrics = disciplineLabels.map((label, index) => {
      const content = label.firstElementChild || label;
      const labelStyle = window.getComputedStyle(label);
      return {
        width: content.offsetWidth,
        height: content.offsetHeight,
        left: window.innerWidth * index / 3 + Number.parseFloat(labelStyle.paddingLeft || 0)
      };
    });
  }

  function ensureScrollRunway(anchorY) {
    const requiredScrollEnd = anchorY + window.innerHeight * (
      questionMorphDistance + questionHoldDistance + sectionScrollDistance
      + archiveWordHoldDistance + archiveZoomDistance
      + disciplineHoldDistance + disciplineMoveDistance + archiveDisplayHoldDistance
      + projectSequenceDistance
      + archiveExitDistance + closingPlaceholderHoldDistance
      + footerRiseDistance
    );
    const requiredDocumentHeight = requiredScrollEnd + window.innerHeight;

    page.style.minHeight = `${Math.ceil(requiredDocumentHeight)}px`;
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
      + viewport * (archiveDisplayHoldDistance + projectSequenceDistance
        - projectScrollDistance * 0.12 + archiveExitDistance);

    return {
      home: 0,
      about: viewport * splitScrollDistance,
      archiveIntro: archiveCentreY,
      archive: disciplineMoveEndY + viewport * (archiveDisplayHoldDistance + projectScrollDistance * 0.3),
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
    sectionTransition?.classList.remove('is-visible', 'is-fast-jump');
    sectionTransition?.style.removeProperty('background-color');
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

  function navigateToProject(index, updateHash = true, hashName = projectCards[index].id) {
    stopTimelineNavigation();
    completeNarrativeState();
    const target = timelineTargets().archive
      + index * window.innerHeight * projectScrollDistance;
    const finish = () => {
      setActiveTimelineLink('archive');
      if (updateHash) history.replaceState(null, '', `#${hashName}`);
      requestUpdate();
    };
    const distance = Math.abs(target - window.scrollY) / window.innerHeight;
    if (!updateHash || motionPreference.matches) {
      window.scrollTo(0, target);
      finish();
    } else if (distance > 3) {
      const colour = index < 3 ? '#101218' : index < 7 ? '#0A141F' : '#151613';
      crossfadeJumpTo(target, colour, finish);
    } else {
      animateScrollTo(target, 450 + distance * 140, finish);
    }
  }

  function crossfadeJumpTo(target, colour, onComplete) {
    if (!sectionTransition || motionPreference.matches) {
      window.scrollTo(0, target);
      updateScene(performance.now());
      onComplete?.();
      return;
    }

    sectionTransition.style.backgroundColor = colour;
    sectionTransition.classList.add('is-fast-jump', 'is-visible');
    navigationTimer = window.setTimeout(() => {
      navigationTimer = 0;
      window.scrollTo(0, target);
      updateScene(performance.now());
      onComplete?.();
      window.requestAnimationFrame(() => {
        sectionTransition.classList.remove('is-visible');
        navigationTimer = window.setTimeout(() => {
          navigationTimer = 0;
          sectionTransition.classList.remove('is-fast-jump');
          sectionTransition.style.removeProperty('background-color');
        }, 220);
      });
    }, 220);
  }

  function animateScrollTo(target, duration, onComplete) {
    if (motionPreference.matches) {
      window.scrollTo(0, target);
      onComplete?.();
      return;
    }
    const start = window.scrollY;
    const distance = target - start;
    const startTime = performance.now();

    function step(timestamp) {
      const progress = clamp((timestamp - startTime) / duration);
      const eased = smoothstep(progress);
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
      const distance = Math.abs(targets.about - window.scrollY) / window.innerHeight;
      if (distance > 3) {
        crossfadeJumpTo(targets.about, '#E4F1E7', () => updateLocation('about', updateHash));
      } else {
        animateScrollTo(targets.about, 350 + Math.min(distance, 2.3) * 320,
          () => updateLocation('about', updateHash));
      }
      return;
    }

    if (sectionName === 'archive') {
      navigateToProject(0, updateHash, 'archive');
      return;
    }

    if (sectionName === 'substack') {
      completeNarrativeState();
      crossfadeJumpTo(targets.substack, '#fff1f2', () => updateLocation('substack', updateHash));
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
    const duration = 480;

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
    const duration = 480;

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
    if (heroScrollCue) {
      const cueOpacity = clamp((0.5 - splitProgress) / 0.5);
      heroScrollCue.style.opacity = cueOpacity.toFixed(3);
      heroScrollCue.style.visibility = cueOpacity > 0.01 ? 'visible' : 'hidden';
    }

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
    morphProgress = motionPreference.matches
      ? scrollMorphProgress
      : Math.min(scrollMorphProgress, fallMorphAllowance);

    // The paragraph cannot rebuild until the question has returned to its
    // original position. This keeps the reverse animation in the same order.
    deconstructionTarget = isPastTrigger || morphProgress > 0 ? 1 : 0;

    if (motionPreference.matches) {
      deconstructionProgress = deconstructionTarget;
    } else if (deconstructionProgress !== deconstructionTarget) {
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
      measureDisciplineLabels();
      questionDirty = false;
    }

    page.style.setProperty('--split-offset', `${splitOffset.toFixed(2)}px`);
    page.style.setProperty('--split-offset-left', `${(-splitOffset).toFixed(2)}px`);
    page.style.setProperty('--word-opacity', wordFade.toFixed(3));
    page.style.setProperty('--header-opacity', '1');
    page.style.setProperty('--header-pointer-events', 'auto');
    if (breakawayCopy) {
      const copyFade = motionPreference.matches
        ? smoothstep(clamp((window.scrollY - triggerY) / (window.innerHeight * 0.2)))
        : 0;
      breakawayCopy.style.opacity = (1 - copyFade).toFixed(3);
    }

    breakLetters.forEach((letter, index) => {
      const physics = fallPhysics[index];
      const letterProgress = motionPreference.matches ? 0 : clamp(
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
    const reducedArchiveFade = motionPreference.matches ? smoothstep(clamp(
      (window.scrollY - (blackStartY - window.innerHeight * 0.35))
      / (window.innerHeight * 0.35)
    )) : 0;
    const disciplineMoveStartY = blackStartY + window.innerHeight * disciplineHoldDistance;
    const disciplineMoveEndY = disciplineMoveStartY + window.innerHeight * disciplineMoveDistance;
    const disciplineMoveProgress = smoothstep(clamp(
      (window.scrollY - disciplineMoveStartY)
      / (window.innerHeight * disciplineMoveDistance)
    ));
    const projectSequenceStartY = disciplineMoveEndY
      + window.innerHeight * archiveDisplayHoldDistance;
    const archiveExitStartY = projectSequenceStartY
      + window.innerHeight * (projectSequenceDistance - projectScrollDistance * 0.12);
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
      if (motionPreference.matches) {
        letter.style.transform = 'scaleY(1.14)';
        letter.style.backgroundColor = 'transparent';
        return;
      }

      const letterProgress = clamp(
        (archiveZoomProgress - motion.delay) / archiveLetterZoomDuration
      );
      if (letterProgress < 1 || archiveZoomProgress < archiveBlackProgress) {
        archiveCoversFrame = false;
      }
      const travelProgress = smoothstep(letterProgress);
      const letterZoomProgress = clamp(
        (archiveZoomProgress - motion.delay) / (archiveScaleCompleteProgress - motion.delay)
      );
      const letterScale = 1 + (motion.scale - 1) * Math.pow(letterZoomProgress, 1.15);
      letter.style.transform = `translate3d(${(motion.x * travelProgress).toFixed(2)}px, 0, 0) scale(${letterScale.toFixed(4)}) scaleY(1.14)`;
      letter.style.zIndex = `${Math.round(travelProgress * 100) + index}`;
      // At this point every letter has finished zooming. Its enlarged box
      // covers the frame before the page background makes the black handoff.
      letter.style.backgroundColor = archiveZoomProgress >= archiveLetterFillProgress
        ? '#101218'
        : 'transparent';
    });
    if (motionPreference.matches) archiveCoversFrame = reducedArchiveFade >= 0.999;

    const projectPosition = clamp(
      (window.scrollY - projectSequenceStartY) / (window.innerHeight * projectScrollDistance),
      0, projectCards.length
    );
    const designBlend = smoothstep(clamp((projectPosition - 2.5) / 0.5));
    const researchBlend = smoothstep(clamp((projectPosition - 6.5) / 0.5));
    const archiveColours = [[16, 18, 24], [10, 20, 31], [21, 22, 19]];
    const blendColour = (from, to, amount) => from.map((channel, index) =>
      Math.round(channel + (to[index] - channel) * amount));
    const archiveColour = blendColour(
      blendColour(archiveColours[0], archiveColours[1], designBlend),
      archiveColours[2], researchBlend
    );
    const aboutColour = blendColour([246, 244, 244], [228, 241, 231], easedSplit);
    const preArchiveColour = motionPreference.matches
      ? blendColour(aboutColour, archiveColours[0], reducedArchiveFade)
      : aboutColour;
    const backgroundColour = archiveCoversFrame
      ? `rgb(${archiveColour.join(', ')})`
      : `rgb(${preArchiveColour.join(', ')})`;
    page.style.backgroundColor = backgroundColour;
    if (hero) hero.style.backgroundColor = backgroundColour;
    if (archiveWord) archiveWord.style.visibility = archiveCoversFrame ? 'hidden' : 'visible';
    if (archiveKicker) archiveKicker.style.visibility = archiveCoversFrame ? 'hidden' : 'visible';
    if (archiveWord) archiveWord.style.opacity = (1 - reducedArchiveFade).toFixed(3);
    if (archiveKicker) archiveKicker.style.opacity = (1 - reducedArchiveFade).toFixed(3);

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
        if (closingFooter.inert === footerReady) closingFooter.inert = !footerReady;
        const footerHidden = footerReady ? 'false' : 'true';
        if (closingFooter.getAttribute('aria-hidden') !== footerHidden) {
          closingFooter.setAttribute('aria-hidden', footerHidden);
        }
      }
    }

    const labelScale = 0.42 + disciplineMoveProgress * 0.58;

    const disciplineWeights = [
      1 - designBlend,
      designBlend * (1 - researchBlend),
      researchBlend
    ];
    disciplineLabels.forEach((label, index) => {
      const content = label.firstElementChild || label;
      const metrics = disciplineMetrics[index];
      if (!metrics) return;
      const targetLeft = metrics.left;
      const visualWidth = metrics.width;
      const visualHeight = metrics.height;
      const disciplineTop = disciplineBandCenter - visualHeight / 2;

      label.style.top = `${disciplineTop.toFixed(2)}px`;
      content.style.transform = `scale(${labelScale.toFixed(4)})`;
      const stackedX = window.innerWidth / 2;
      const stackedY = window.innerHeight / 2 + (index - 1) * disciplineLineGap;
      const inverseProgress = 1 - disciplineMoveProgress;
      const currentX = targetLeft + visualWidth * labelScale / 2;
      const currentY = disciplineTop + visualHeight * labelScale / 2;
      const x = (stackedX - currentX) * inverseProgress;
      const y = (stackedY - currentY) * inverseProgress;
      label.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      const focusProgress = smoothstep(clamp((disciplineMoveProgress - 0.72) / 0.28));
      label.style.opacity = (1 - focusProgress * (1 - disciplineWeights[index]) * 0.72).toFixed(3);
    });

    if (portfolioBoard) {
      const boardProgress = smoothstep(clamp((disciplineMoveProgress - 0.78) / 0.22));
      const boardVisible = archiveCoversFrame && boardProgress > 0;
      const boardReady = archiveCoversFrame && boardProgress >= 0.98 && archiveExitProgress === 0;
      portfolioBoard.style.visibility = boardVisible ? 'visible' : 'hidden';
      portfolioBoard.style.opacity = boardProgress.toFixed(3);
      portfolioBoard.style.transform = `translate3d(0, ${((1 - boardProgress) * 11).toFixed(3)}vh, 0)`;
      if (portfolioBoard.inert === boardReady) portfolioBoard.inert = !boardReady;
      const boardHidden = boardVisible ? 'false' : 'true';
      if (portfolioBoard.getAttribute('aria-hidden') !== boardHidden) {
        portfolioBoard.setAttribute('aria-hidden', boardHidden);
      }
      projectCards.forEach((card, index) => {
        const phase = projectPosition - index;
        const entering = smoothstep(clamp((phase + 0.13) / 0.28));
        const lastProject = index === projectCards.length - 1;
        const leaving = lastProject
          ? archiveExitProgress
          : smoothstep(clamp((phase - 0.86) / 0.28));
        const opacity = boardProgress * entering * (1 - leaving)
          * (lastProject ? 1 : 1 - archiveExitProgress);
        const rise = motionPreference.matches ? 0 : (1 - entering) * 8 - leaving * 8;
        card.style.opacity = opacity.toFixed(3);
        card.style.transform = `translate3d(0, ${rise.toFixed(3)}vh, 0)`;
        const cardVisible = opacity > 0.001;
        const cardVisibility = cardVisible ? 'visible' : 'hidden';
        if (card.style.visibility !== cardVisibility) card.style.visibility = cardVisibility;
        const cardReady = boardReady && opacity >= 0.98;
        if (card.inert === cardReady) card.inert = !cardReady;
        const cardHidden = cardVisible ? 'false' : 'true';
        if (card.getAttribute('aria-hidden') !== cardHidden) {
          card.setAttribute('aria-hidden', cardHidden);
        }
      });
      if (archiveProgress) {
        const currentProject = Math.min(projectCards.length - 1, Math.floor(projectPosition));
        const progressText = `PROJECT ${String(currentProject + 1).padStart(2, '0')} / ${String(projectCards.length).padStart(2, '0')}`;
        if (archiveProgress.textContent !== progressText) archiveProgress.textContent = progressText;
        archiveProgress.style.visibility = boardVisible && archiveExitProgress < 0.9 ? 'visible' : 'hidden';
        archiveProgress.style.opacity = (1 - archiveExitProgress).toFixed(3);
      }
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
  window.addEventListener('wheel', stopTimelineNavigation, { passive: true });
  window.addEventListener('touchstart', stopTimelineNavigation, { passive: true });
  timelineLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      navigateTimeline(link.dataset.scrollSection);
    });
  });
  disciplineLabels.forEach((link) => {
    const index = projectCards.findIndex((card) => `#${card.id}` === link.getAttribute('href'));
    if (index < 0) return;
    link.addEventListener('click', (event) => {
      event.preventDefault();
      navigateToProject(index);
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
    ensureScrollRunway(window.innerHeight * deconstructionTriggerDistance);
    requestUpdate();
  });

  if (document.fonts) {
    document.fonts.ready.then(() => {
      seamDirty = true;
      questionDirty = true;
      requestUpdate();
    });
  }

  ensureScrollRunway(window.innerHeight * deconstructionTriggerDistance);
  requestUpdate();
  scheduleLetterFlash(heroLetters);
  scheduleLetterFlash(closingLetters);

  const parameters = new URLSearchParams(window.location.search);
  const initialSection = parameters.get('section') || window.location.hash.replace(/^#/, '');
  const validInitialSection = timelineLinks.some(
    (link) => link.dataset.scrollSection === initialSection
  );

  if (parameters.get('from') === 'studio' && validInitialSection) {
    window.requestAnimationFrame(() => runStudioLoader(initialSection));
  } else if (validInitialSection && initialSection !== 'home') {
    window.requestAnimationFrame(() => jumpToSection(initialSection));
  } else {
    const projectIndex = projectCards.findIndex((card) => card.id === initialSection);
    if (projectIndex >= 0) {
      window.requestAnimationFrame(() => navigateToProject(projectIndex, false));
    }
  }
})();
