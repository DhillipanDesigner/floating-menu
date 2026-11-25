window.InitUserScripts = function()
{
var player = GetPlayer();
var object = player.object;
var once = player.once;
var addToTimeline = player.addToTimeline;
var setVar = player.SetVar;
var getVar = player.GetVar;
var update = player.update;
var pointerX = player.pointerX;
var pointerY = player.pointerY;
var showPointer = player.showPointer;
var hidePointer = player.hidePointer;
var slideWidth = player.slideWidth;
var slideHeight = player.slideHeight;
var getKeyDown = player.getKeyDown;
var keydown = player.keydown;
var keyup = player.keyup;
window.Script1 = function()
{
  /* FLOATING MENU v31 - Help hover-only + prepaint top-bar guard + Resources/PDF stability.
   Replace your ENTIRE existing Execute JavaScript trigger with this script.
   Do not add a second copy. Republish and reload the course after replacing it.
   Existing Storyline selectors, popups, tooltips, navigation and control actions are retained.
   Adaptive styling is scoped only to #floatingMenu and #fmArrow.
*/
(function injectFloatingMenu() {
  // Hide Storyline's native top bar as soon as this user script is evaluated.
  // In the supplied preview wrapper, the iframe is kept invisible until the
  // same CSS rule has been installed inside the Storyline document, which
  // prevents the native top bar from ever being painted to the learner.
  // This in-player guard remains as a lightweight safety net for direct
  // published launches and for any later Storyline recreation of #top-bar.
  (function installEarlyTopBarGuard() {
    var guardId = 'fmTopBarEarlyGuard';
    if (!document.getElementById(guardId)) {
      var guardStyle = document.createElement('style');
      guardStyle.id = guardId;
      guardStyle.textContent =
        '#top-bar{' +
          'display:none!important;' +
          'visibility:hidden!important;' +
          'opacity:0!important;' +
          'pointer-events:none!important;' +
        '}';
      (document.head || document.documentElement).appendChild(guardStyle);
    }

    function hideTopBarNode(topBar) {
      if (!topBar || topBar.id !== 'top-bar') return;
      topBar.setAttribute('aria-hidden', 'true');
      topBar.setAttribute('data-fm-hidden-top-bar', 'true');
      topBar.style.setProperty('display', 'none', 'important');
      topBar.style.setProperty('visibility', 'hidden', 'important');
      topBar.style.setProperty('opacity', '0', 'important');
      topBar.style.setProperty('pointer-events', 'none', 'important');
    }

    hideTopBarNode(document.getElementById('top-bar'));

    if (!window.__fmTopBarGuardObserver && document.documentElement) {
      window.__fmTopBarGuardObserver = new MutationObserver(function (records) {
        for (var i = 0; i < records.length; i++) {
          var added = records[i].addedNodes;
          if (!added || !added.length) continue;

          for (var j = 0; j < added.length; j++) {
            var node = added[j];
            if (!node || node.nodeType !== 1) continue;

            if (node.id === 'top-bar') {
              hideTopBarNode(node);
              return;
            }

            if (typeof node.querySelector === 'function') {
              var nestedTopBar = node.querySelector('#top-bar');
              if (nestedTopBar) {
                hideTopBarNode(nestedTopBar);
                return;
              }
            }
          }
        }
      });
      window.__fmTopBarGuardObserver.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }
  })();

  var existing = document.getElementById('fmRoot');

  console.log('[Floating Menu] INIT / REBUILD triggered');
  console.trace('[Floating Menu] INIT call stack');
  console.log('[Floating Menu] INIT');
  console.log('[Floating Menu] Initialization/re-initialization', {
    existingFloatingMenu: !!existing,
    location: window.location && window.location.href
  });

  if (existing) {
    console.log('[Floating Menu] Existing Floating Menu found; preserving current UI state.');

    /*
     * The Slide Master trigger can execute again while the first copy is still
     * finishing initialization. In V25, fmRefresh() could run during that small
     * window and reach syncScaledFloatingUi() before PANEL_SELECTOR_MAP /
     * detachedPanelState had been assigned. That produced Object.keys(undefined)
     * and made the menu appear to reset/reload. Never refresh a half-built root.
     */
    if (!existing.__fmInitializationComplete) {
      console.warn('[Floating Menu] Re-entry detected while initialization is still in progress; duplicate initialization ignored.');
      return;
    }

    /* Update the page number first. Each hook is isolated so one optional UI
       refresh can never prevent the page-number refresh or break the menu. */
    if (typeof existing.fmUpdatePageNumber === 'function') {
      try {
        existing.fmUpdatePageNumber('re-initialization');
      } catch (pageError) {
        console.warn('[Floating Menu] Page-number refresh during re-entry failed safely:', pageError);
      }
    }

    /*
     * IMPORTANT: do NOT call fmRefresh() just because the Slide Master trigger
     * executes again. Resources can cause Storyline to re-enter the master JS
     * without replacing #fmRoot. The old re-entry path called fmRefresh(),
     * which scheduled a full position recalculation and produced the visible
     * Resources jerk even though the DOM itself was not rebuilt. Responsive
     * stage/layout observers already handle real geometry changes.
     */
    console.log('[Floating Menu] Re-entry detected; persistent DOM preserved and layout refresh intentionally skipped.');
    return;
  }

  console.log('[Floating Menu] v30-resource-pdf-isolated-fix');

  // Idempotent style writes avoid self-triggering MutationObserver loops.
  function setStyle(el, name, value, priority) {
    if (!el) return;

    priority = priority || '';

    if (
      el.style.getPropertyValue(name) !== value ||
      el.style.getPropertyPriority(name) !== priority
    ) {
      el.style.setProperty(name, value, priority);
    }
  }

  // =========================================================
  // 1. MENU MARKUP - ORIGINAL ICONS AND OPTIONS
  // =========================================================

  var rootHTML = `
  <div id="fmRoot">
    <div id="fmComponent" class="fm-component">
    <button
      class="fm-arrow-btn"
      id="fmArrow"
      aria-label="Floating Menu"
      aria-expanded="false"
      aria-controls="floatingMenu"
    >
      <svg
        class="fm-arrow-icon"
        viewBox="0 0 28 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2.4"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M12 6l-6 6 6 6"></path>
        <path d="M19 6l-6 6 6 6"></path>
      </svg>
      <i class="fm-tooltip fm-arrow-tooltip">Floating Menu</i>
    </button>

    <div
      class="floating-menu fm-collapsed"
      id="floatingMenu"
      aria-hidden="true"
      inert
    >
      <button class="fm-btn" data-panel="menu">
        <svg class="fm-icon" viewBox="0 0 24 24">
          <path d="M4 6h16M4 12h16M4 18h16"></path>
        </svg>
        <span>Menu</span>
        <i class="fm-tooltip">Menu</i>
      </button>

      <button class="fm-btn" data-panel="transcript">
        <svg class="fm-icon" viewBox="0 0 24 24">
          <rect x="4" y="3" width="16" height="18" rx="2"></rect>
          <path d="M8 8h8M8 12h8M8 16h5"></path>
        </svg>
        <span>Transcript</span>
        <i class="fm-tooltip">Transcript</i>
      </button>

      <button class="fm-btn" data-panel="cc">
        <svg class="fm-icon" viewBox="0 0 24 24">
          <rect x="3" y="6" width="18" height="12" rx="3"></rect>
          <path d="M10 10.6a2.3 2.3 0 100 2.8M17 10.6a2.3 2.3 0 100 2.8"></path>
        </svg>
        <span>CC</span>
        <i class="fm-tooltip">Captions</i>
      </button>

      <button class="fm-btn" data-panel="glossary">
        <svg class="fm-icon" viewBox="0 0 24 24">
          <path d="M5 4h11a2 2 0 012 2v14H7a2 2 0 01-2-2z"></path>
          <path d="M5 18a2 2 0 012-2h11"></path>
          <path d="M9 8h6M9 11h4"></path>
        </svg>
        <span>Glossary</span>
        <i class="fm-tooltip">Glossary</i>
      </button>

      <button class="fm-btn" data-panel="resources">
        <svg class="fm-icon" viewBox="0 0 24 24">
          <path d="M13 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V9z"></path>
          <path d="M13 3v6h6M9 13h6M9 16h4"></path>
        </svg>
        <span>Resources</span>
        <i class="fm-tooltip">Resources</i>
      </button>

      <button class="fm-btn" data-panel="help">
        <svg class="fm-icon" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="8.5"></circle>
          <path d="M9.6 9.4a2.4 2.4 0 114.3 1.6c-.7.9-1.9 1.2-1.9 2.4"></path>
          <path d="M12 16.6h.01"></path>
        </svg>
        <span>Help</span>
        <i class="fm-tooltip">Help</i>
      </button>

      <button class="fm-btn" data-panel="speed">
        <svg class="fm-icon" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9"></circle>
          <path d="M12 7v5l3.5 2"></path>
        </svg>
        <span>Speed</span>
        <i class="fm-tooltip">Playback speed</i>
      </button>

      <button class="fm-btn" data-panel="settings">
        <svg class="fm-icon" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 13a7.5 7.5 0 000-2l2-1.5-2-3.4-2.3.9a7.6 7.6 0 00-1.7-1L15 3.5h-4L10.6 6a7.6 7.6 0 00-1.7 1l-2.3-.9-2 3.4L6.6 11a7.5 7.5 0 000 2l-2 1.5 2 3.4 2.3-.9c.5.4 1.1.75 1.7 1L11 21h4l.4-2.5c.6-.25 1.2-.6 1.7-1l2.3.9 2-3.4z"></path>
        </svg>
        <span>Settings</span>
        <i class="fm-tooltip">Settings</i>
      </button>

      <button class="fm-btn" data-panel="volume">
        <span class="fm-icon-vol">
          <svg class="fm-icon" viewBox="0 0 24 24">
            <path d="M4 9.5v5h3.2L12 18.5v-13L7.2 9.5z"></path>
            <path d="M15.8 9a4.2 4.2 0 010 6"></path>
          </svg>
        </span>

        <span class="fm-icon-mute">
          <svg class="fm-icon" viewBox="0 0 24 24">
            <path d="M4 9.5v5h3.2L12 18.5v-13L7.2 9.5z"></path>
            <path d="M16.5 9.5l4 5M20.5 9.5l-4 5"></path>
          </svg>
        </span>

        <span>Vol</span>
        <i class="fm-tooltip">Mute / unmute</i>
      </button>

      <button class="fm-btn" data-panel="fullscreen">
        <svg class="fm-icon" viewBox="0 0 14 14">
          <path d="M1.99 2.3H5.1V0.4H0.1V5.2H1.9L1.9 2.3Z"></path>
          <path d="M5.1 11.8H1.9V8.9H0.1V13.6H5.1L5.1 11.8Z"></path>
          <path d="M11.5 11.8H8.4V13.6H13.3V8.9H11.5L11.5 11.8Z"></path>
          <path d="M8.4 2.3H11.5V5.2H13.3V0.4H8.4L8.4 2.3Z"></path>
        </svg>
        <span>Fullscreen</span>
        <i class="fm-tooltip">Full-screen</i>
      </button>

      <button class="fm-btn" data-panel="exit">
        <svg class="fm-icon" viewBox="0 0 24 24">
          <path d="M14 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3"></path>
          <path d="M9.5 15.5L13 12 9.5 8.5M13 12H4"></path>
        </svg>
        <span>Exit</span>
        <i class="fm-tooltip">Exit course</i>
      </button>

      <button class="fm-btn" data-nav="prev">
        <svg class="fm-icon" viewBox="0 0 24 24">
          <path d="M14.5 6l-6 6 6 6"></path>
        </svg>
        <span>Previous</span>
        <i class="fm-tooltip">Previous</i>
      </button>

      <div class="fm-slide-counter">
        <span class="fm-page-label">Page No:</span>
        <b id="fmSlideNumber">--</b>
      </div>

      <button class="fm-btn" data-nav="next">
        <svg class="fm-icon" viewBox="0 0 24 24">
          <path d="M9.5 6l6 6-6 6"></path>
        </svg>
        <span>Next</span>
        <i class="fm-tooltip">Next</i>
      </button>

      <div class="fm-logo">
        <span
          class="fm-logo-img"
          role="img"
          aria-label="Course logo"
        ></span>
      </div>
    </div>
    </div>
  </div>`;

  var rootWrapper = document.createElement('div');
  rootWrapper.innerHTML = rootHTML;

  var fmRoot = rootWrapper.firstElementChild;
  document.body.appendChild(fmRoot);
  console.warn('[Floating Menu] DOM RECREATED', { root: fmRoot, time: Date.now() });
  console.trace('[Floating Menu] DOM creation call stack');

  var componentEl = document.getElementById('fmComponent');
  var arrowEl = document.getElementById('fmArrow');
  var floatingMenuEl = document.getElementById('floatingMenu');

  // One tooltip element for every floating-menu control.
  // Keeping it outside .floating-menu prevents clipping.
  var globalTooltipEl = document.createElement('div');
  globalTooltipEl.id = 'fmGlobalTooltip';
  globalTooltipEl.className = 'fm-global-tooltip';
  globalTooltipEl.setAttribute('role', 'tooltip');
  globalTooltipEl.setAttribute('aria-hidden', 'true');
  document.body.appendChild(globalTooltipEl);

  // =========================================================
  // 2. STYLES
  // =========================================================

  var css = `
    #fmRoot {
      position: fixed;
      inset: 0;
      z-index: 999999;

      --fm-width: 100px;

      /* Adaptive surface variables. Light-background mode preserves the
         existing dark-teal design exactly. Only #floatingMenu and #fmArrow
         consume these variables. */
      --fm-surface: #092328;
      --fm-surface-hover: #12544F;
      --fm-surface-border: rgba(139, 187, 146, 0.34);
      --fm-surface-border-hover: rgba(139, 187, 146, 0.5);
      --fm-icon-color: #dce9e2;
      --fm-arrow-shadow: 0 8px 20px rgba(9, 35, 40, 0.28);
      --fm-arrow-shadow-hover: 0 10px 24px rgba(9, 35, 40, 0.34);
      --fm-menu-shadow: 0 8px 24px rgba(9, 35, 40, 0.28);

      visibility: hidden;
      pointer-events: none;
      overflow: hidden;

      clip-path: inset(
        0 0 var(--fm-clip-bottom, 100vh) 0
      );
    }

    #fmRoot > * {
      pointer-events: none;
    }

    .fm-component {
      position: absolute;
      width: 100px;
      height: 1040px;
      box-sizing: border-box;
      transform-origin: top right;
      pointer-events: none;
    }

    .fm-component > * {
      pointer-events: auto;
    }

    /* =========================================================
       ADAPTIVE CONTRAST MODES
       These classes only change variables consumed by the arrow and menu.
       Popup, tooltip and Storyline player styling is intentionally untouched.
       ========================================================= */

    #fmRoot.fm-bg-light {
      --fm-surface: #092328;
      --fm-surface-hover: #12544F;
      --fm-surface-border: rgba(139, 187, 146, 0.34);
      --fm-surface-border-hover: rgba(139, 187, 146, 0.5);
      --fm-icon-color: #dce9e2;
      --fm-arrow-shadow: 0 8px 20px rgba(9, 35, 40, 0.28);
      --fm-arrow-shadow-hover: 0 10px 24px rgba(9, 35, 40, 0.34);
      --fm-menu-shadow: 0 8px 24px rgba(9, 35, 40, 0.28);
    }

    #fmRoot.fm-bg-dark {
      /* A slightly brighter branded teal separates the component from a
         dark slide while keeping the same visual language. */
      --fm-surface: rgba(18, 84, 79, 0.97);
      --fm-surface-hover: rgba(26, 108, 98, 0.98);
      --fm-surface-border: rgba(235, 250, 244, 0.84);
      --fm-surface-border-hover: rgba(255, 255, 255, 0.96);
      --fm-icon-color: #ffffff;
      --fm-arrow-shadow:
        0 0 0 1px rgba(255, 255, 255, 0.14),
        0 8px 22px rgba(0, 0, 0, 0.52);
      --fm-arrow-shadow-hover:
        0 0 0 1px rgba(255, 255, 255, 0.22),
        0 10px 26px rgba(0, 0, 0, 0.58);
      --fm-menu-shadow: 0 9px 26px rgba(0, 0, 0, 0.52);
    }

    #fmRoot.fm-bg-complex {
      /* Mixed/image/unknown backgrounds use a contrast-safe treatment:
         branded dark surface + light edge + strong outer shadow. */
      --fm-surface: rgba(9, 35, 40, 0.96);
      --fm-surface-hover: rgba(18, 84, 79, 0.98);
      --fm-surface-border: rgba(255, 255, 255, 0.72);
      --fm-surface-border-hover: rgba(255, 255, 255, 0.94);
      --fm-icon-color: #ffffff;
      --fm-arrow-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.26),
        0 0 0 2px rgba(255, 255, 255, 0.16),
        0 8px 24px rgba(0, 0, 0, 0.50);
      --fm-arrow-shadow-hover:
        0 0 0 1px rgba(0, 0, 0, 0.30),
        0 0 0 2px rgba(255, 255, 255, 0.24),
        0 10px 28px rgba(0, 0, 0, 0.58);
      --fm-menu-shadow: 0 10px 28px rgba(0, 0, 0, 0.50);
    }

    /* =========================================================
       CONSISTENT GLOBAL TOOLTIP
       The inline <i class="fm-tooltip"> labels are used only as
       text sources. A fixed tooltip is rendered outside the menu
       so it cannot be clipped by .floating-menu overflow.
       ========================================================= */

    .fm-tooltip {
      display: none !important;
    }

    .fm-global-tooltip {
      position: fixed;
      z-index: 1000005;

      max-width: 240px;
      box-sizing: border-box;

      padding: 6px 10px;

      background: #092328;
      color: #ffffff;

      border: 1px solid rgba(139, 187, 146, 0.48);
      border-radius: 6px;

      box-shadow: 0 6px 16px rgba(9, 35, 40, 0.22);

      font-family: "Segoe UI", Arial, sans-serif;
      font-size: 16px;
      font-style: normal;
      font-weight: 400;
      line-height: 1.2;

      white-space: nowrap;

      opacity: 0;
      visibility: hidden;
      pointer-events: none;

      --fm-tooltip-scale: 1;
      transform: scale(var(--fm-tooltip-scale));
      transform-origin: top left;

      transition:
        opacity .14s ease,
        visibility .14s ease;
    }

    .fm-global-tooltip.fm-show {
      opacity: 1;
      visibility: visible;
      transform: scale(var(--fm-tooltip-scale));
    }

    /* Arrow toggle */

    .fm-arrow-btn {
      position: absolute;
      top: 0;
      right: 0;

      width: var(--fm-width);
      height: 69px;
      box-sizing: border-box;

      display: flex;
      align-items: center;
      justify-content: center;

      padding: 0;
      margin: 0;
      line-height: 1;

      background: var(--fm-surface);
      border: 1px solid var(--fm-surface-border);
      border-radius: 16px;
      color: var(--fm-icon-color);
      cursor: pointer;

      box-shadow: var(--fm-arrow-shadow);

      /* Keep the toggle physically stationary. */
      transform: none;
      transition:
        background-color .18s ease,
        border-color .18s ease,
        color .18s ease,
        box-shadow .18s ease;
    }

    .fm-arrow-btn:hover {
      background: var(--fm-surface-hover);
      border-color: var(--fm-surface-border-hover);
      box-shadow: var(--fm-arrow-shadow-hover);
      transform: none;
    }

    .fm-arrow-btn:focus-visible {
      outline: 2px solid #8BBB92;
      outline-offset: 2px;
    }

    .fm-arrow-icon {
      display: block;
      width: 40px;
      height: 32px;
      flex: 0 0 40px;
      overflow: visible;

      transform-origin: 50% 50%;
      transform: rotate(0deg);
      transition: transform .28s cubic-bezier(.4, 0, .2, 1);
    }

    .fm-arrow-btn.fm-open .fm-arrow-icon {
      transform: rotate(-90deg);
    }

    /* Main menu */

    .floating-menu {
      position: absolute;
      top: 85px;
      right: 0;
      width: var(--fm-width);

      height: var(--fm-height, 955px);
      min-height: 0;
      max-height: var(--fm-height, 955px);

      box-sizing: border-box;
      overflow: hidden;

      background: var(--fm-surface);

      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-evenly;

      padding: var(--fm-pad, 10px) 0;
      gap: 0;

      font-family: "Segoe UI", Arial, sans-serif;

      border: none;
      border-radius: 16px;

      box-shadow: var(--fm-menu-shadow);

      transform-origin: top center;

      transition:
        height .30s cubic-bezier(.4, 0, .2, 1),
        opacity .22s ease,
        background-color .22s ease,
        border-color .22s ease,
        box-shadow .22s ease;
    }

    .floating-menu.fm-collapsed {
      height: 0;

      padding-top: 0;
      padding-bottom: 0;

      border-top-width: 0;
      border-bottom-width: 0;
      border-color: transparent;

      opacity: 0;

      /* No scale/translate on the menu: this prevents child jitter. */
      transform: none;
      box-shadow: none;
      pointer-events: none;
    }

    /* Child controls never move during expand/collapse. */
    .floating-menu > * {
      opacity: 1;
      transform: none;
      transition: none;
    }

    /* Menu buttons - one stable source of truth for layout */

    .floating-menu .fm-btn {
      position: relative;

      width: var(--fm-button-size, 60px);
      height: var(--fm-button-size, 60px);
      min-width: var(--fm-button-size, 60px);
      min-height: var(--fm-button-size, 60px);
      max-width: var(--fm-button-size, 60px);
      max-height: var(--fm-button-size, 60px);
      flex: 0 0 var(--fm-button-size, 60px);

      box-sizing: border-box;
      padding: 0;
      margin: 0;

      display: flex;
      align-items: center;
      justify-content: center;

      line-height: 1;
      vertical-align: middle;

      background: transparent;
      border: 0;
      border-radius: 8px;
      color: var(--fm-icon-color);
      cursor: pointer;

      /* Never move the button box on hover. */
      transform: none;
      transition:
        background-color .16s ease,
        color .16s ease,
        box-shadow .16s ease;
    }

    .floating-menu .fm-btn:hover {
      background: #12544F;
      color: #fff;
      transform: none;
    }

    /* Fixed icon frame keeps every SVG on exactly the same center line. */
    .floating-menu .fm-btn .fm-icon,
    .floating-menu .fm-btn .fm-icon-vol,
    .floating-menu .fm-btn .fm-icon-mute {
      box-sizing: border-box;
      flex: 0 0 auto;
      margin: 0;
      padding: 0;
      line-height: 0;
      transform-origin: 50% 50%;
      backface-visibility: hidden;
    }

    .floating-menu .fm-btn .fm-icon-vol,
    .floating-menu .fm-btn .fm-icon-mute {
      width: var(--fm-icon-box, 34px);
      height: var(--fm-icon-box, 34px);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* =========================================================
       STABLE ICON MOTION
       Reference-inspired motion is applied only to the SVG transform.
       Button boxes never change size or position, so hover cannot cause
       layout jitter or move neighboring controls.
       ========================================================= */

    .floating-menu .fm-btn .fm-icon {
      transform: translate3d(0, 0, 0) scale(1) rotate(0deg);
      transform-origin: 50% 50%;
      transform-box: view-box;
      will-change: transform;
      transition: transform .22s cubic-bezier(.2,.8,.2,1);
    }

    /* Menu.json: compressed/expanded line motion, without changing layout. */
    .floating-menu [data-panel="menu"]:hover .fm-icon {
      transform: translate3d(0, 0, 0) scaleX(.90) scaleY(1.04);
    }

    /* Transcript reference: controlled scale/settle around the same center. */
    .floating-menu [data-panel="transcript"]:hover .fm-icon {
      transform: translate3d(0, -1px, 0) scale(1.06);
    }

    .floating-menu [data-panel="cc"]:hover .fm-icon {
      transform: translate3d(0, 0, 0) scale(1.06);
    }

    .floating-menu [data-panel="glossary"]:hover .fm-icon {
      transform: translate3d(0, -1px, 0) scale(1.05);
    }

    /* Resources.json: slight vertical folder/document lift. */
    .floating-menu [data-panel="resources"]:hover .fm-icon {
      transform: translate3d(0, -1.5px, 0) scale(1.04);
    }

    /* Help.json: subtle centered pulse. */
    .floating-menu [data-panel="help"]:hover .fm-icon {
      transform: translate3d(0, 0, 0) scale(1.08);
    }

    .floating-menu [data-panel="speed"]:hover .fm-icon {
      transform: translate3d(0, 0, 0) rotate(12deg) scale(1.04);
    }

    /* Setting.json uses rotation. Keep the same visual center and a smaller
       angle so the gear never appears to jump inside its button. */
    .floating-menu [data-panel="settings"]:hover .fm-icon {
      transform: translate3d(0, 0, 0) rotate(48deg) scale(1.03);
    }

    .floating-menu [data-panel="volume"]:hover .fm-icon {
      transform: translate3d(0, 0, 0) scale(1.06);
    }

    .floating-menu [data-panel="fullscreen"]:hover .fm-icon {
      transform: translate3d(0, 0, 0) scale(1.07);
    }

    .floating-menu [data-panel="exit"]:hover .fm-icon {
      transform: translate3d(1px, 0, 0) scale(1.04);
    }

    /* Prev/Next JSON assets move horizontally; mirror that motion without
       changing the actual button position. */
    .floating-menu [data-nav="prev"]:hover .fm-icon {
      transform: translate3d(-2px, 0, 0) scale(1.03);
    }

    .floating-menu [data-nav="next"]:hover .fm-icon {
      transform: translate3d(2px, 0, 0) scale(1.03);
    }

    .floating-menu .fm-btn.fm-disabled:hover .fm-icon {
      transform: none !important;
    }

    @media (prefers-reduced-motion: reduce) {
      .floating-menu .fm-btn .fm-icon {
        transition: none !important;
      }

      .floating-menu .fm-btn:hover .fm-icon {
        transform: none !important;
      }
    }

    .floating-menu .fm-btn:focus-visible {
      outline: 2px solid #8BBB92;
      outline-offset: 1px;
    }

    .floating-menu .fm-btn.fm-active {
      background: #2A835F;
      color: #fff;
    }

    /* Help is hover-only. If a stale fm-active class is ever restored by
       external Storyline state, it must not create a persistent highlight. */
    .floating-menu [data-panel="help"].fm-active:not(:hover) {
      background: transparent !important;
      color: var(--fm-icon-color) !important;
    }

    .floating-menu .fm-btn.fm-disabled {
      opacity: 0.35;
      cursor: default;
      pointer-events: none;
    }

    .floating-menu .fm-icon {
      display: block;
      width: var(--fm-icon-size, 30px);
      height: var(--fm-icon-size, 30px);
      min-width: var(--fm-icon-size, 30px);
      min-height: var(--fm-icon-size, 30px);
      max-width: var(--fm-icon-size, 30px);
      max-height: var(--fm-icon-size, 30px);
      flex: 0 0 var(--fm-icon-size, 30px);

      overflow: visible;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.7;
      stroke-linecap: round;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }

    .floating-menu [data-panel="fullscreen"] .fm-icon {
      width: var(--fm-fullscreen-icon, 24px);
      height: var(--fm-fullscreen-icon, 24px);
      min-width: var(--fm-fullscreen-icon, 24px);
      min-height: var(--fm-fullscreen-icon, 24px);
      max-width: var(--fm-fullscreen-icon, 24px);
      max-height: var(--fm-fullscreen-icon, 24px);
      flex-basis: var(--fm-fullscreen-icon, 24px);

      fill: currentColor;
      stroke: none;
    }

    .floating-menu .fm-btn span:not(.fm-icon-vol):not(.fm-icon-mute) {
      display: none;
    }

    /* Audio: exactly one icon is rendered at a time.
       These selectors intentionally match the specificity of the icon-box rule
       above so the muted icon cannot appear beside the volume icon. */
    .floating-menu .fm-btn .fm-icon-vol {
      display: flex;
    }

    .floating-menu .fm-btn .fm-icon-mute {
      display: none;
    }

    .floating-menu .fm-btn.fm-muted .fm-icon-vol {
      display: none;
    }

    .floating-menu .fm-btn.fm-muted .fm-icon-mute {
      display: flex;
    }

    /* Slide counter and logo */

    .floating-menu .fm-slide-counter {
      color: #8BBB92;
      font-size: var(--fm-counter-small, 14px);
      line-height: 1;
      text-align: center;

      margin: 0;
      height: var(--fm-counter-height, 42px);
      flex: 0 0 var(--fm-counter-height, 42px);

      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
      white-space: nowrap;
    }

    .floating-menu .fm-slide-counter b {
      display: block;
      color: #fff;
      font-size: var(--fm-counter-number, 20px);
    }

    .floating-menu .fm-logo {
      margin: 0;
      flex: 0 0 auto;
    }

    .floating-menu.fm-hide-logo .fm-logo {
      display: none;
    }

    /* Internal scrolling only when compact controls cannot fit */

    .floating-menu.fm-scroll {
      overflow-y: auto;
      overflow-x: hidden;

      justify-content: flex-start;

      scrollbar-width: thin;
      scrollbar-color: #12544F #092328;
      overscroll-behavior: contain;
    }

    .floating-menu.fm-scroll .fm-btn {
      flex: 0 0 var(--fm-button-size, 60px);
    }

    /* Resize updates snap; user toggle animations stay smooth */

    .floating-menu.fm-layout-now {
      transition: none !important;
    }

    #fmRoot > .floating-menu.fm-collapsed {
      pointer-events: none;
    }

    .floating-menu.fm-no-space {
      border: 0;
      padding: 0;
      visibility: hidden;
    }

    /* =========================================================
       SHARED POPUP LAYOUT
       One fixed header + exactly one intended scroll region.
       Menu/Glossary/Resources use the wrapper scrollbar.
       Transcript keeps Storyline's own native inner scrollbar.
       ========================================================= */

    #outline-panel,
    #transcript-panel,
    #glossary-panel,
    #resources-panel,
    .settings-panel,
    .fm-dropdown {
      border-radius: 12px !important;
      box-sizing: border-box !important;
      box-shadow: 0 6px 20px rgba(9, 35, 40, 0.24) !important;
      background-clip: padding-box !important;
    }

    #outline-panel,
    #transcript-panel,
    #glossary-panel,
    #resources-panel,
    .settings-panel {
      overflow: hidden !important;
      flex-direction: column !important;
      min-height: 0 !important;
    }

    .fm-popup-header {
      position: relative;
      z-index: 5;

      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;

      flex: 0 0 60px;
      box-sizing: border-box;
      width: 100%;
      height: 60px;
      min-height: 60px;
      max-height: 60px;

      margin: 0;
      padding: 0 16px;

      background: #092328;
      color: #ffffff !important;

      border-bottom: 1px solid rgba(139, 187, 146, 0.28);
      border-radius: 12px 12px 0 0;

      font-family: "Segoe UI", Arial, sans-serif;
      overflow: hidden;
    }

    .fm-popup-title {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: calc(100% - 120px);
      margin: 0 !important;
      padding: 0 !important;
      color: #ffffff !important;
      font-family: "Segoe UI", Arial, sans-serif !important;
      font-size: 25px !important;
      font-style: normal !important;
      font-weight: 600 !important;
      line-height: 1.2 !important;
      text-align: center !important;
      text-transform: none !important;
      letter-spacing: 0 !important;
      white-space: nowrap;
      pointer-events: none;
    }

    .fm-popup-close {
      flex: 0 0 auto;
      margin: 0 0 0 auto !important;
      align-self: center;
    }

    .fm-native-panel-content,
    .fm-popup-content {
      position: relative;
      flex: 1 1 0;
      min-height: 0;
      width: 100%;
      box-sizing: border-box;
      overflow-x: hidden;
      overscroll-behavior: contain;
    }

    /* V20: the outer native panel is 100px wider, so its fixed Storyline
       inner wrappers must grow with it instead of keeping their old width. */
    #outline-panel > .fm-popup-header,
    #transcript-panel > .fm-popup-header,
    #glossary-panel > .fm-popup-header,
    #resources-panel > .fm-popup-header,
    #outline-panel > .fm-native-panel-content,
    #transcript-panel > .fm-native-panel-content,
    #glossary-panel > .fm-native-panel-content,
    #resources-panel > .fm-native-panel-content {
      width: 100% !important;
      max-width: none !important;
      min-width: 0 !important;
      box-sizing: border-box !important;
    }

    #outline-panel > .fm-native-panel-content > *,
    #transcript-panel > .fm-native-panel-content > *,
    #glossary-panel > .fm-native-panel-content > *,
    #resources-panel > .fm-native-panel-content > * {
      max-width: none !important;
      box-sizing: border-box !important;
    }

    /* V21: readable popup body typography. This changes only text sizing;
       existing font family, weight, color and control behavior remain intact. */
    #outline-panel > .fm-native-panel-content,
    #transcript-panel > .fm-native-panel-content,
    #glossary-panel > .fm-native-panel-content,
    #resources-panel > .fm-native-panel-content,
    #fmSpeedDropdown > .fm-popup-content,
    #fmSettingsDropdown > .fm-popup-content {
      font-size: 18px !important;
    }

    #outline-panel > .fm-native-panel-content :where(div, p, li, a, button, label, span, td, th, [role="button"], [role="menuitem"], [role="option"], [role="listitem"]),
    #transcript-panel > .fm-native-panel-content :where(div, p, li, a, button, label, span, td, th, [role="button"], [role="menuitem"], [role="option"], [role="listitem"]),
    #glossary-panel > .fm-native-panel-content :where(div, p, li, a, button, label, span, td, th, [role="button"], [role="menuitem"], [role="option"], [role="listitem"]),
    #resources-panel > .fm-native-panel-content :where(div, p, li, a, button, label, span, td, th, [role="button"], [role="menuitem"], [role="option"], [role="listitem"]):not(.file-icon):not(.file-icon-text) {
      font-size: 18px !important;
    }

    /* Preserve Storyline's original PDF badge typography. V21's broad body
       font rule was enlarging .file-icon-text and making "pdf" overlap the
       document artwork. The text class is intentionally left to Storyline's
       native stylesheet, while the SVG is pinned to its original dimensions. */
    #resources-panel .file-icon.resource-ext-pdf > svg {
      width: 22px !important;
      height: 27px !important;
      min-width: 22px !important;
      min-height: 27px !important;
      max-width: 22px !important;
      max-height: 27px !important;
      flex: 0 0 22px !important;
    }

    /* Leave .file-icon-text completely to Storyline's native styling.
       V30 intentionally does not override font-size, line-height, dimensions,
       position, margin, padding or transform on the PDF text itself. */

    /* Menu, Glossary and Resources intentionally own the one scrollbar. */
    #outline-panel > .fm-native-panel-content,
    #glossary-panel > .fm-native-panel-content,
    #resources-panel > .fm-native-panel-content {
      overflow-y: auto !important;
      padding: 10px 12px 12px;
      scrollbar-gutter: stable;
      scrollbar-width: thin;
      scrollbar-color: #2A835F transparent;
    }

    /* Transcript: do NOT add a second wrapper scrollbar. The content shell
       clips to the available body height and Storyline's native transcript
       scroller remains responsible for scrolling. */
    #transcript-panel > .fm-native-panel-content {
      overflow: hidden !important;
      padding: 0 !important;
      scrollbar-width: auto;
    }

    /* Custom Playback Speed and Settings use the same header/body system. */
    .fm-popup-content {
      overflow-y: auto;
      padding: 8px;
      scrollbar-gutter: stable;
      scrollbar-width: thin;
      scrollbar-color: #2A835F transparent;
    }

    #outline-panel > .fm-native-panel-content::-webkit-scrollbar,
    #glossary-panel > .fm-native-panel-content::-webkit-scrollbar,
    #resources-panel > .fm-native-panel-content::-webkit-scrollbar,
    .fm-popup-content::-webkit-scrollbar {
      width: 7px;
    }

    #outline-panel > .fm-native-panel-content::-webkit-scrollbar-track,
    #glossary-panel > .fm-native-panel-content::-webkit-scrollbar-track,
    #resources-panel > .fm-native-panel-content::-webkit-scrollbar-track,
    .fm-popup-content::-webkit-scrollbar-track {
      background: transparent;
    }

    #outline-panel > .fm-native-panel-content::-webkit-scrollbar-thumb,
    #glossary-panel > .fm-native-panel-content::-webkit-scrollbar-thumb,
    #resources-panel > .fm-native-panel-content::-webkit-scrollbar-thumb,
    .fm-popup-content::-webkit-scrollbar-thumb {
      background: #2A835F;
      border-radius: 999px;
    }

    /* =========================================================
       DETACHABLE TRANSCRIPT PANEL
       ========================================================= */

    #transcript-panel.fm-panel-detached {
      position: fixed !important;
      z-index: 1000010 !important;
      min-width: 280px !important;
      min-height: 180px !important;
      max-width: none !important;
      max-height: none !important;
      overflow: hidden !important;
      box-sizing: border-box !important;
      resize: none !important;
      transform-origin: top left !important;
      pointer-events: auto !important;
    }

    #transcript-panel.fm-panel-detached > .fm-popup-header {
      cursor: move;
      user-select: none;
      touch-action: none;
    }

    .fm-detached-actions {
      margin-left: auto;
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      flex: 0 0 auto;
    }

    .fm-detach-btn,
    .fm-detached-attach {
      width: 40px;
      height: 40px;
      min-width: 40px;
      min-height: 40px;
      max-width: 40px;
      max-height: 40px;
      padding: 0;
      margin: 0;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: #ffffff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-sizing: border-box;
      line-height: 1;
    }

    .fm-detached-close {
      width: 28px;
      height: 28px;
      min-width: 28px;
      min-height: 28px;
      max-width: 28px;
      max-height: 28px;
      padding: 0;
      margin: 0;
      border: 0;
      border-radius: 6px;
      background: transparent;
      color: #ffffff;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-sizing: border-box;
      line-height: 1;
    }

    .fm-detach-btn:hover,
    .fm-detached-attach:hover,
    .fm-detached-close:hover {
      background: #12544F;
    }

    .fm-detach-btn:focus-visible,
    .fm-detached-attach:focus-visible,
    .fm-detached-close:focus-visible {
      outline: 2px solid #8BBB92;
      outline-offset: 1px;
    }

    .fm-detach-btn svg,
    .fm-detached-attach svg {
      width: 26px;
      height: 26px;
      display: block;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
      pointer-events: none;
    }

    .fm-detached-attach svg {
      stroke-width: 2.2;
    }

    .fm-detached-close svg {
      width: 16px;
      height: 16px;
      display: block;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
      pointer-events: none;
    }

    .fm-detached-attach,
    .fm-detached-close {
      display: none;
    }

    .fm-panel-detached .fm-detach-btn {
      display: none;
    }

    .fm-panel-detached .fm-detached-attach,
    .fm-panel-detached .fm-detached-close {
      display: inline-flex;
    }

    .fm-panel-detached .fm-detached-attach {
      cursor: pointer;
    }

    .fm-panel-detached .fm-popup-close:not(.fm-detached-close) {
      display: none !important;
    }

    .fm-resize-handle {
      display: none;
      position: absolute;
      z-index: 30;
      touch-action: none;
      user-select: none;
      background: transparent;
    }

    .fm-panel-detached > .fm-resize-handle {
      display: block;
    }

    .fm-resize-handle[data-edge="n"],
    .fm-resize-handle[data-edge="s"] {
      left: 10px;
      right: 10px;
      height: 8px;
    }

    .fm-resize-handle[data-edge="n"] { top: -2px; cursor: ns-resize; }
    .fm-resize-handle[data-edge="s"] { bottom: -2px; cursor: ns-resize; }

    .fm-resize-handle[data-edge="e"],
    .fm-resize-handle[data-edge="w"] {
      top: 10px;
      bottom: 10px;
      width: 8px;
    }

    .fm-resize-handle[data-edge="e"] { right: -2px; cursor: ew-resize; }
    .fm-resize-handle[data-edge="w"] { left: -2px; cursor: ew-resize; }

    .fm-resize-handle[data-edge="ne"],
    .fm-resize-handle[data-edge="nw"],
    .fm-resize-handle[data-edge="se"],
    .fm-resize-handle[data-edge="sw"] {
      width: 14px;
      height: 14px;
    }

    .fm-resize-handle[data-edge="ne"] { top: -3px; right: -3px; cursor: nesw-resize; }
    .fm-resize-handle[data-edge="nw"] { top: -3px; left: -3px; cursor: nwse-resize; }
    .fm-resize-handle[data-edge="se"] { bottom: -3px; right: -3px; cursor: nwse-resize; }
    .fm-resize-handle[data-edge="sw"] { bottom: -3px; left: -3px; cursor: nesw-resize; }

    .fm-panel-detached::after {
      content: "";
      position: absolute;
      right: 4px;
      bottom: 4px;
      width: 10px;
      height: 10px;
      border-right: 2px solid rgba(139, 187, 146, 0.85);
      border-bottom: 2px solid rgba(139, 187, 146, 0.85);
      pointer-events: none;
      opacity: .8;
    }

    /* Transcript uses exactly one native Storyline scroller. Force that
       scroller to the right and color its thumb from the live seekbar color. */
    #transcript-panel .fm-transcript-native-scroller {
      direction: ltr !important;
      scrollbar-color: var(--fm-transcript-scrollbar-color, #12544F) transparent !important;
    }

    #transcript-panel .fm-transcript-native-scroller::-webkit-scrollbar-thumb {
      background: var(--fm-transcript-scrollbar-color, #12544F) !important;
      border-radius: 999px;
    }

    #transcript-panel .fm-transcript-native-scroller::-webkit-scrollbar-track {
      background: transparent !important;
    }

    /* Native panel text */

    #outline-panel,
    #outline-panel *,
    #transcript-panel,
    #transcript-panel *,
    #glossary-panel,
    #glossary-panel *,
    #resources-panel,
    #resources-panel *,
    .settings-panel,
    .settings-panel * {
      color: #f5f5f5 !important;
    }

    /* Custom Speed and Settings dropdowns */

    .fm-dropdown {
      position: fixed;
      display: none;
      flex-direction: column;
      width: 300px;
      min-width: 300px;
      min-height: 0;

      background: #092328;
      border: 1px solid rgba(139, 187, 146, 0.34);
      border-radius: 12px;

      padding: 0;
      gap: 0;
      overflow: hidden;

      box-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);

      z-index: 999999;
      font-family: "Segoe UI", Arial, sans-serif;
    }

    .fm-popup-content > .fm-dropdown-item + .fm-dropdown-item {
      margin-top: 2px;
    }

    .fm-dropdown-item {
      width: 100%;
      box-sizing: border-box;
      background: none;
      border: none;
      color: #f5f5f5;
      text-align: left;

      padding: 8px 10px;
      border-radius: 6px;

      cursor: pointer;
      font-size: 18px;

      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .fm-dropdown-item:hover {
      background: #12544F;
    }

    .fm-dropdown-item:focus-visible {
      outline: 2px solid #8BBB92;
      outline-offset: -2px;
    }

    .fm-dropdown-item.fm-selected {
      color: #8BBB92;
      background: rgba(42, 131, 95, 0.25);
    }

    .fm-switch-indicator {
      width: 30px;
      height: 16px;
      border-radius: 8px;

      background: #12544F;

      position: relative;
      flex-shrink: 0;
      margin-left: 12px;
    }

    .fm-switch-indicator::after {
      content: "";

      position: absolute;
      top: 2px;
      left: 2px;

      width: 12px;
      height: 12px;
      border-radius: 50%;

      background: #fff;
      transition: left .15s;
    }

    .fm-dropdown-switch.fm-switch-on .fm-switch-indicator {
      background: #2A835F;
    }

    .fm-dropdown-switch.fm-switch-on .fm-switch-indicator::after {
      left: 16px;
    }

    /* =========================================================
       V10 RETAINED UI - PLAYBACK SPEED + SETTINGS ONLY
       Keep these two custom popups exactly on the previous
       header/body styling while V11 rules remain in effect for
       Menu, Transcript, Glossary and Resources.
       ========================================================= */

    #fmSpeedDropdown .fm-popup-header,
    #fmSettingsDropdown .fm-popup-header {
      position: relative;
      z-index: 4;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      flex: 0 0 60px;
      box-sizing: border-box;
      width: 100%;
      height: 60px;
      min-height: 60px;
      max-height: 60px;
      margin: 0;
      padding: 0 16px;
      background: #092328;
      color: #ffffff !important;
      border-bottom: 1px solid rgba(139, 187, 146, 0.28);
      border-radius: 12px 12px 0 0;
      font-family: "Segoe UI", Arial, sans-serif;
      overflow: visible;
    }

    #fmSpeedDropdown .fm-popup-title,
    #fmSettingsDropdown .fm-popup-title {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      width: calc(100% - 40px);
      margin: 0 !important;
      padding: 0 !important;
      color: #ffffff !important;
      font-family: "Segoe UI", Arial, sans-serif !important;
      font-size: 25px !important;
      font-style: normal !important;
      font-weight: 600 !important;
      line-height: 1.25 !important;
      text-align: center !important;
      text-transform: none !important;
      letter-spacing: 0 !important;
      white-space: normal;
      pointer-events: none;
    }

    #fmSpeedDropdown .fm-popup-content,
    #fmSettingsDropdown .fm-popup-content {
      font-size: 18px !important;
      position: relative;
      flex: 1 1 auto;
      min-height: 0;
      width: 100%;
      box-sizing: border-box;
      overflow-y: auto;
      overflow-x: hidden;
      overscroll-behavior: contain;
      padding: 8px;
      scrollbar-gutter: auto;
      scrollbar-width: thin;
      scrollbar-color: #12544F #092328;
    }

    #fmSpeedDropdown {
      min-height: 400px !important;
      max-height: 400px !important;
      height: 400px !important;
    }

    #fmSpeedDropdown .fm-popup-content {
      display: flex;
      flex-direction: column;
      justify-content: stretch;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
    }

    #fmSpeedDropdown .fm-dropdown-item {
      flex: 1 1 0;
      min-height: 0;
      align-items: center;
    }

    #fmSpeedDropdown .fm-popup-content::-webkit-scrollbar,
    #fmSettingsDropdown .fm-popup-content::-webkit-scrollbar {
      width: auto;
    }

    #fmSpeedDropdown .fm-popup-content::-webkit-scrollbar-track,
    #fmSettingsDropdown .fm-popup-content::-webkit-scrollbar-track {
      background: #092328;
    }

    #fmSpeedDropdown .fm-popup-content::-webkit-scrollbar-thumb,
    #fmSettingsDropdown .fm-popup-content::-webkit-scrollbar-thumb {
      background: #12544F;
      border-radius: 0;
    }

  `;

  /*
   * Capture the native Storyline PDF-label typography BEFORE the Floating Menu
   * stylesheet is attached. This is deliberately done during initial script
   * setup, not on the first Resources click.
   *
   * V22-V29 temporarily disabled #floatingMenuStyle inside
   * restoreResourcePdfIconSizing() to discover these values. Disabling the
   * entire stylesheet changes the geometry/style of the complete Floating Menu
   * and can queue ResizeObserver/layout work. Because that branch ran only on
   * the first Resources open, it matched the first-click-only jerk exactly.
   */
  var nativeResourcePdfTextMetrics = {
    fontSize: '',
    lineHeight: ''
  };

  (function captureNativeResourcePdfTextMetricsBeforeCustomStyle() {
    var text = document.querySelector(
      '#resources-panel .file-icon.resource-ext-pdf .file-icon-text'
    );

    if (!text) {
      console.log('[Floating Menu] Native PDF label not present during initial capture; text will remain under Storyline native CSS.');
      return;
    }

    try {
      var nativeStyle = getComputedStyle(text);
      nativeResourcePdfTextMetrics.fontSize = nativeStyle.fontSize || '';
      nativeResourcePdfTextMetrics.lineHeight = nativeStyle.lineHeight || '';

      console.log('[Floating Menu] Native PDF label metrics captured before Floating Menu CSS:', {
        fontSize: nativeResourcePdfTextMetrics.fontSize,
        lineHeight: nativeResourcePdfTextMetrics.lineHeight
      });
    } catch (error) {
      console.warn('[Floating Menu] Native PDF label metrics could not be captured safely:', error);
    }
  })();

  var styleTag = document.createElement('style');
  styleTag.id = 'floatingMenuStyle';
  styleTag.innerHTML = css;
  document.head.appendChild(styleTag);

  // =========================================================
  // 3. STORYLINE-SCALED UNIFIED COMPONENT GEOMETRY
  // =========================================================

  var MARGIN = 16;
  var BOTTOM_GAP = 12;
  var SHADOW_CLEARANCE = 4;

  var COMPONENT_WIDTH = 100;
  var COMPONENT_TOTAL_HEIGHT = 1040;
  var FM_WIDTH = COMPONENT_WIDTH;
  var ARROW_HEIGHT = 69;
  var ARROW_GAP = 16;
  var MENU_TARGET_HEIGHT = COMPONENT_TOTAL_HEIGHT - ARROW_HEIGHT - ARROW_GAP; // 955px logical menu height

  var BOTTOM_BAR_SELECTOR = '#bottom-bar';

  var STAGE_SELECTORS = [
  '.acc-blocker',             // PRIMARY: actual course stage
  '#slide',
  '#slide-stage',
  '.slide-stage-container',
  '#stage',
  '.player-stage',
  '.acc-shadow-dom'
];

  var menuOpen = false;
  var cachedBottomBarEl = null;

  var layoutFrame = 0;
  var pendingLayoutReason = 'initial';
  var lastGeometry = '';

  var observedStage = null;
  var observedBar = null;
  var observedParent = null;

  var layoutResizeObserver = null;
  var layoutAttributeObserver = null;

  var logoHeight = 0;

  // Shared Storyline-space metrics used by the menu, every popup and tooltip.
  // These values are updated from the rendered .acc-blocker, which is the same
  // reference used by the Floating Menu itself.
  var currentStageScale = 1;
  var currentStageRect = null;
  var currentStageElement = null;

  function snapshotRect(rect) {
    if (!rect) return null;
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height
    };
  }

  function getCurrentStageScale() {
    return isFinite(currentStageScale) && currentStageScale > 0
      ? currentStageScale
      : 1;
  }

  function getCurrentStageRect() {
    if (currentStageElement && currentStageElement.isConnected) {
      return snapshotRect(currentStageElement.getBoundingClientRect());
    }

    var stage = getStageEl();
    return stage ? snapshotRect(stage.getBoundingClientRect()) : currentStageRect;
  }

  setStyle(fmRoot, '--fm-width', FM_WIDTH + 'px');
  setStyle(componentEl, 'width', COMPONENT_WIDTH + 'px');
  setStyle(componentEl, 'height', COMPONENT_TOTAL_HEIGHT + 'px');

  function visibleRect(el) {
    if (!el || !el.isConnected || fmRoot.contains(el)) {
      return null;
    }

    var r = el.getBoundingClientRect();

    if (
      r.width < 1 ||
      r.height < 1 ||
      r.bottom <= 0 ||
      r.right <= 0
    ) {
      return null;
    }

    var cs = getComputedStyle(el);

    if (
      cs.display === 'none' ||
      cs.visibility === 'hidden'
    ) {
      return null;
    }

    return r;
  }

  function getStageEl() {

  /*
   * ==========================================================
   * PRIMARY STAGE = .acc-blocker
   * ==========================================================
   *
   * In this Storyline course, .acc-blocker represents the
   * complete visible course-content stage.
   *
   * Floating menu position + height will therefore follow
   * this element directly.
   */

  var blockers = document.querySelectorAll('.acc-blocker');

  var bestBlocker = null;
  var bestBlockerArea = 0;

  blockers.forEach(function (el) {

    if (!el || !el.isConnected) return;

    var r = el.getBoundingClientRect();

    if (
      r.width <= 0 ||
      r.height <= 0
    ) {
      return;
    }

    var cs = getComputedStyle(el);

    if (
      cs.display === 'none' ||
      cs.visibility === 'hidden'
    ) {
      return;
    }

    var area = r.width * r.height;

    if (area > bestBlockerArea) {
      bestBlockerArea = area;
      bestBlocker = el;
    }

  });

  /*
   * If .acc-blocker exists, ALWAYS use it.
   */
  if (bestBlocker) {
    return bestBlocker;
  }


  /*
   * ==========================================================
   * FALLBACK
   * ==========================================================
   *
   * Only used if Storyline has not created .acc-blocker yet.
   */

  for (var s = 1; s < STAGE_SELECTORS.length; s++) {

    var nodes =
      document.querySelectorAll(
        STAGE_SELECTORS[s]
      );

    var best = null;
    var bestArea = 0;

    nodes.forEach(function (el) {

      var r = visibleRect(el);

      if (
        r &&
        r.width >= 80 &&
        r.height >= 80
      ) {

        var area =
          r.width *
          r.height;

        if (area > bestArea) {
          bestArea = area;
          best = el;
        }

      }

    });

    if (best) {
      return best;
    }

  }

  return null;
}

  function isBottomBarCandidate(el, stageRect) {
    var r = visibleRect(el);

    if (
      !r ||
      el === document.body ||
      el === document.documentElement
    ) {
      return false;
    }

    // Reject a full-height player wrapper masquerading as a footer.
    return (
      r.width >= Math.min(100, stageRect.width * 0.35) &&
      r.height <= Math.max(
        100,
        Math.min(180, stageRect.height * 0.4)
      ) &&
      r.top >= stageRect.top + stageRect.height * 0.45
    );
  }

  function findBottomBarEl() {
    var stage = getStageEl();
    if (!stage) return null;

    var sr = stage.getBoundingClientRect();

    var direct = document.querySelector(BOTTOM_BAR_SELECTOR);

    if (isBottomBarCandidate(direct, sr)) {
      cachedBottomBarEl = direct;
      return direct;
    }

    if (isBottomBarCandidate(cachedBottomBarEl, sr)) {
      return cachedBottomBarEl;
    }

    var ids = [
      'playback-controls',
      'misc-controls',
      'nav-controls'
    ];

    var fallback = null;

    for (var i = 0; i < ids.length; i++) {
      var anchor = document.getElementById(ids[i]);

      if (!visibleRect(anchor)) continue;

      var parent = anchor.parentElement;

      while (
        parent &&
        parent !== document.body &&
        parent !== document.documentElement
      ) {
        if (isBottomBarCandidate(parent, sr)) {
          cachedBottomBarEl = parent;
          return parent;
        }

        parent = parent.parentElement;
      }

      if (!fallback && isBottomBarCandidate(anchor, sr)) {
        fallback = anchor;
      }
    }

    cachedBottomBarEl = fallback;
    return fallback;
  }

  function viewportBottom() {
    var bottom = window.innerHeight;

    if (window.visualViewport) {
      bottom = Math.min(
        bottom,
        window.visualViewport.offsetTop +
          window.visualViewport.height
      );
    }

    return bottom;
  }

  function getUsableFloor(stageRect) {
    return Math.min(
      stageRect.bottom,
      viewportBottom()
    );
  }

  function getFloatingMenuPopupRect() {
    var rect = floatingMenuEl.getBoundingClientRect();

    return {
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
      width: rect.width,
      height: rect.height
    };
  }

  function fitMenuItems() {
    // Fixed logical layout for the unified 100px x 1040px component.
    // No per-viewport shrinking: Storyline stage scaling handles visual size.
    floatingMenuEl.classList.remove('fm-scroll');
    floatingMenuEl.classList.remove('fm-hide-logo');
    floatingMenuEl.classList.remove('fm-no-space');

    setStyle(floatingMenuEl, '--fm-pad', '10px');
    setStyle(floatingMenuEl, '--fm-gap', '0px');
    setStyle(floatingMenuEl, '--fm-button-size', '60px');
    setStyle(floatingMenuEl, '--fm-button-min', '60px');
    setStyle(floatingMenuEl, '--fm-icon-size', '30px');
    setStyle(floatingMenuEl, '--fm-icon-box', '34px');
    setStyle(floatingMenuEl, '--fm-fullscreen-icon', '24px');
    setStyle(floatingMenuEl, '--fm-counter-height', '42px');
    setStyle(floatingMenuEl, '--fm-counter-small', '14px');
    setStyle(floatingMenuEl, '--fm-counter-number', '20px');
  }

  function observeLayout(stage, bar) {
    if (
      observedStage === stage &&
      observedBar === bar &&
      observedParent === stage.parentElement
    ) {
      return;
    }

    observedStage = stage;
    observedBar = bar;
    observedParent = stage.parentElement;

    if (layoutResizeObserver) {
      layoutResizeObserver.disconnect();
      layoutResizeObserver.observe(stage);

      if (bar && bar !== stage) {
        layoutResizeObserver.observe(bar);
      }
    }

    if (layoutAttributeObserver) {
      layoutAttributeObserver.disconnect();

      [stage, bar].forEach(function (node) {
        while (node && node.nodeType === 1) {
          layoutAttributeObserver.observe(node, {
            attributes: true,
            attributeFilter: ['style', 'class']
          });

          node = node.parentElement;
        }
      });
    }
  }

  // =========================================================
  // ADAPTIVE BACKGROUND CONTRAST
  // =========================================================
  // The Storyline stage can contain solid fills, SVG artwork, images,
  // gradients and accessibility overlays. We sample several points behind
  // the arrow/menu, ignoring our own UI. Solid colors are classified by
  // relative luminance. Images/gradients/mixed/unknown areas use the safe
  // "complex" treatment rather than guessing a color.

  var CONTRAST_CHECK_INTERVAL = 450;
  var lastContrastCheck = 0;
  var contrastTimer = 0;
  var currentContrastMode = '';

  function parseRenderedColor(value) {
    if (!value || value === 'transparent') return null;

    var match = String(value).match(
      /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i
    );

    if (!match) return null;

    return {
      r: Math.max(0, Math.min(255, parseFloat(match[1]))),
      g: Math.max(0, Math.min(255, parseFloat(match[2]))),
      b: Math.max(0, Math.min(255, parseFloat(match[3]))),
      a: match[4] === undefined
        ? 1
        : Math.max(0, Math.min(1, parseFloat(match[4])))
    };
  }

  function relativeLuminance(color) {
    function channel(v) {
      v = v / 255;
      return v <= 0.04045
        ? v / 12.92
        : Math.pow((v + 0.055) / 1.055, 2.4);
    }

    return (
      0.2126 * channel(color.r) +
      0.7152 * channel(color.g) +
      0.0722 * channel(color.b)
    );
  }

  function collectPointElements(root, x, y, out, seen, depth) {
    if (!root || depth > 4) return;

    var list = [];

    try {
      if (typeof root.elementsFromPoint === 'function') {
        list = root.elementsFromPoint(x, y) || [];
      } else if (typeof root.elementFromPoint === 'function') {
        var single = root.elementFromPoint(x, y);
        if (single) list = [single];
      }
    } catch (e) {
      list = [];
    }

    for (var i = 0; i < list.length; i++) {
      var el = list[i];
      if (!el || seen.indexOf(el) !== -1) continue;

      seen.push(el);

      /* Descend into open Shadow DOM when available. Storyline builds vary,
         so failure here simply falls back to the host/outer stack. */
      if (
        el.shadowRoot &&
        (
          typeof el.shadowRoot.elementsFromPoint === 'function' ||
          typeof el.shadowRoot.elementFromPoint === 'function'
        )
      ) {
        collectPointElements(el.shadowRoot, x, y, out, seen, depth + 1);
      }

      out.push(el);
    }
  }

  function elementsBehindFloatingUi(x, y) {
    var out = [];
    collectPointElements(document, x, y, out, [], 0);

    return out.filter(function (el) {
      if (!el || !el.isConnected) return false;
      if (el === globalTooltipEl) return false;
      if (fmRoot.contains(el)) return false;
      if (el.closest && el.closest('#fmGlobalTooltip')) return false;
      return true;
    });
  }

  function sampleBackgroundAtPoint(x, y) {
    var stack = elementsBehindFloatingUi(x, y);

    for (var i = 0; i < stack.length; i++) {
      var el = stack[i];
      var tag = (el.tagName || '').toLowerCase();
      var cs;

      try {
        cs = getComputedStyle(el);
      } catch (e) {
        continue;
      }

      if (
        !cs ||
        cs.display === 'none' ||
        cs.visibility === 'hidden' ||
        parseFloat(cs.opacity || '1') <= 0.02
      ) {
        continue;
      }

      /* Raster/video/canvas content and CSS images/gradients are intentionally
         treated as complex. Pixel-perfect sampling is unreliable across
         Storyline player/Shadow DOM builds, so the contrast-safe style wins. */
      if (
        tag === 'img' ||
        tag === 'picture' ||
        tag === 'video' ||
        tag === 'canvas' ||
        tag === 'image'
      ) {
        return { type: 'complex' };
      }

      if (
        cs.backgroundImage &&
        cs.backgroundImage !== 'none'
      ) {
        return { type: 'complex' };
      }

      var background = parseRenderedColor(cs.backgroundColor);

      if (background && background.a >= 0.85) {
        return {
          type: 'solid',
          luminance: relativeLuminance(background)
        };
      }

      if (background && background.a > 0.04) {
        return { type: 'complex' };
      }

      /* Storyline often renders slide shapes as SVG. Read their computed fill
         when there is no usable CSS background. */
      if (
        typeof SVGElement !== 'undefined' &&
        el instanceof SVGElement
      ) {
        var fill = parseRenderedColor(cs.fill);

        if (fill && fill.a >= 0.85) {
          return {
            type: 'solid',
            luminance: relativeLuminance(fill)
          };
        }

        if (fill && fill.a > 0.04) {
          return { type: 'complex' };
        }
      }
    }

    return { type: 'unknown' };
  }

  function getAdaptiveSamplePoints() {
    var points = [];
    var arrowRect = arrowEl.getBoundingClientRect();
    var menuRect = getFloatingMenuPopupRect();

    function pushPoint(x, y) {
      if (!isFinite(x) || !isFinite(y)) return;

      x = Math.max(1, Math.min(window.innerWidth - 2, x));
      y = Math.max(1, Math.min(window.innerHeight - 2, y));

      points.push({ x: x, y: y });
    }

    if (arrowRect.width > 0 && arrowRect.height > 0) {
      pushPoint(
        arrowRect.left + arrowRect.width * 0.5,
        arrowRect.top + arrowRect.height * 0.5
      );
    }

    if (menuRect.width > 0 && menuRect.height > 0) {
      var centerX = menuRect.left + menuRect.width * 0.5;
      var leftX = menuRect.left + Math.min(16, menuRect.width * 0.28);
      var rightX = menuRect.right - Math.min(16, menuRect.width * 0.28);

      [0.08, 0.28, 0.50, 0.72, 0.92].forEach(function (ratio, index) {
        var y = menuRect.top + menuRect.height * ratio;
        pushPoint(index % 2 === 0 ? centerX : leftX, y);
        if (index === 2) pushPoint(rightX, y);
      });
    }

    return points;
  }

  function classifyBackgroundBehindControls() {
    var points = getAdaptiveSamplePoints();
    var luminances = [];
    var complexCount = 0;
    var unknownCount = 0;

    for (var i = 0; i < points.length; i++) {
      var sample = sampleBackgroundAtPoint(points[i].x, points[i].y);

      if (sample.type === 'solid') {
        luminances.push(sample.luminance);
      } else if (sample.type === 'complex') {
        complexCount += 1;
      } else {
        unknownCount += 1;
      }
    }

    /* Any meaningful image/gradient presence receives the safe style. */
    if (
      complexCount >= 2 ||
      (complexCount >= 1 && luminances.length < 4)
    ) {
      return 'complex';
    }

    if (!luminances.length) {
      return 'complex';
    }

    var minLum = Math.min.apply(Math, luminances);
    var maxLum = Math.max.apply(Math, luminances);
    var total = luminances.reduce(function (sum, value) {
      return sum + value;
    }, 0);
    var avgLum = total / luminances.length;

    var darkSamples = luminances.filter(function (value) {
      return value <= 0.40;
    }).length;

    var lightSamples = luminances.filter(function (value) {
      return value >= 0.62;
    }).length;

    /* Strong local variation means the menu is over mixed visual content. */
    if (
      (darkSamples > 0 && lightSamples > 0) ||
      (maxLum - minLum) >= 0.34
    ) {
      return 'complex';
    }

    if (avgLum <= 0.40) return 'dark';
    if (avgLum >= 0.62) return 'light';

    /* Mid-tone surfaces are safer with the mixed-background treatment. */
    return 'complex';
  }

  function applyAdaptiveContrastMode(mode) {
    if (mode !== 'light' && mode !== 'dark' && mode !== 'complex') {
      mode = 'complex';
    }

    if (mode === currentContrastMode) return;

    currentContrastMode = mode;

    fmRoot.classList.remove(
      'fm-bg-light',
      'fm-bg-dark',
      'fm-bg-complex'
    );

    fmRoot.classList.add('fm-bg-' + mode);
    fmRoot.setAttribute('data-fm-background', mode);

    console.log('[FloatingMenu] adaptive background mode:', mode);
  }

  function updateAdaptiveContrast(force) {
    var now = Date.now();

    if (
      !force &&
      now - lastContrastCheck < CONTRAST_CHECK_INTERVAL
    ) {
      return;
    }

    lastContrastCheck = now;

    if (document.hidden) return;

    applyAdaptiveContrastMode(
      classifyBackgroundBehindControls()
    );
  }

  function scheduleAdaptiveContrast(force) {
    if (force) {
      lastContrastCheck = 0;
    }

    if (contrastTimer) return;

    contrastTimer = window.setTimeout(function () {
      contrastTimer = 0;
      updateAdaptiveContrast(!!force);
    }, force ? 0 : 60);
  }

  function positionFloatingMenu(reason) {
    reason = (typeof reason === 'string' && reason) ? reason : 'direct';
    console.log('[Floating Menu] Position recalculated', {
      reason: reason,
      menuOpen: menuOpen,
      currentOpenPanelKey: (typeof currentOpenPanelKey === 'string' ? currentOpenPanelKey : null)
    });

    var stage = getStageEl();

    if (!stage) {
      // Storyline can briefly replace/rebuild stage nodes while opening a
      // native panel. If the menu has already been positioned once, preserve
      // its last geometry instead of hiding it for a frame (which looks like
      // the Floating Menu reloaded/reset). On first load it remains hidden by
      // the base CSS until a real stage is available.
      if (currentStageRect) {
        console.log('[Floating Menu] Stage temporarily unavailable; preserving Floating Menu geometry/state.');
      }
      return;
    }

    var rect = stage.getBoundingClientRect();
    observeLayout(stage, null);

    /*
     * Storyline's own objects are authored in logical slide coordinates and
     * then uniformly scaled by the player. Mirror that behavior here by
     * comparing the rendered .acc-blocker box with its untransformed layout
     * size. The whole 100 x 1040 component receives one uniform scale.
     */
    var logicalStageWidth = stage.offsetWidth || rect.width;
    var logicalStageHeight = stage.offsetHeight || rect.height;

    var scaleX = logicalStageWidth > 0 ? rect.width / logicalStageWidth : 1;
    var scaleY = logicalStageHeight > 0 ? rect.height / logicalStageHeight : scaleX;

    var stageScale = Math.min(scaleX, scaleY);

    if (!isFinite(stageScale) || stageScale <= 0) {
      stageScale = 1;
    }

    currentStageScale = stageScale;
    currentStageRect = snapshotRect(rect);
    currentStageElement = stage;

    /*
     * MARGIN is a logical Storyline-space margin. It is scaled together with
     * the component so the right/top relationship stays identical at every
     * browser zoom level.
     */
    var scaledMargin = MARGIN * stageScale;
    var top = rect.top + scaledMargin;
    var right = window.innerWidth - rect.right + scaledMargin;

    setStyle(componentEl, 'top', top + 'px');
    setStyle(componentEl, 'right', right + 'px');
    setStyle(componentEl, 'transform', 'scale(' + stageScale + ')');
    setStyle(componentEl, 'transform-origin', 'top right');

    /*
     * Arrow and menu are positioned only inside the logical component box.
     * Their own dimensions never change; the parent scale makes them behave
     * exactly like a native Storyline shape.
     */
    setStyle(arrowEl, 'top', '0px');
    setStyle(arrowEl, 'right', '0px');
    setStyle(arrowEl, 'width', FM_WIDTH + 'px');
    setStyle(arrowEl, 'height', ARROW_HEIGHT + 'px');

    setStyle(floatingMenuEl, 'top', (ARROW_HEIGHT + ARROW_GAP) + 'px');
    setStyle(floatingMenuEl, 'right', '0px');
    setStyle(floatingMenuEl, 'width', FM_WIDTH + 'px');
    setStyle(floatingMenuEl, '--fm-height', MENU_TARGET_HEIGHT + 'px');
    setStyle(floatingMenuEl, '--fm-available-height', MENU_TARGET_HEIGHT + 'px');
    setStyle(floatingMenuEl, '--fm-menu-top', (ARROW_HEIGHT + ARROW_GAP) + 'px');
    setStyle(floatingMenuEl, '--fm-bottom-reserve', '0px');

    fitMenuItems();

    /* Clip the helper root at the real stage bottom so shadows/animation
       cannot spill into the Storyline bottom player controls. */
    var clipBottom = Math.max(
      0,
      window.innerHeight - (rect.bottom - SHADOW_CLEARANCE)
    );

    setStyle(fmRoot, '--fm-clip-bottom', clipBottom + 'px');
    setStyle(fmRoot, 'visibility', 'visible');

    scheduleAdaptiveContrast(false);

    // Keep every open popup and the visible tooltip on the exact same
    // Storyline scale as the Floating Menu whenever .acc-blocker changes.
    syncScaledFloatingUi();
  }

  function scheduleLayout(reason) {
    if (typeof reason !== 'string' || !reason) {
      reason = 'scheduled layout';
    }

    pendingLayoutReason = reason;
    if (layoutFrame) return;

    layoutFrame = requestAnimationFrame(function () {
      var runReason = pendingLayoutReason;
      pendingLayoutReason = 'scheduled layout';
      layoutFrame = 0;
      positionFloatingMenu(runReason);
    });
  }

  fmRoot.fmRefresh = function () {
    if (!fmRoot.__fmInitializationComplete) {
      console.log('[Floating Menu] fmRefresh skipped until initialization is complete.');
      return;
    }
    console.log('[Floating Menu] fmRefresh requested');
    scheduleLayout('fmRefresh explicit request');
    scheduleAdaptiveContrast(true);
  };

  // Exclude our own menu buttons when finding a native Storyline control.
  function queryNative(selector) {
    var nodes = document.querySelectorAll(selector);

    for (var i = 0; i < nodes.length; i++) {
      if (
        !fmRoot.contains(nodes[i]) &&
        !nodes[i].closest('.fm-dropdown')
      ) {
        return nodes[i];
      }
    }

    return null;
  }

  function getTooltipLabel(control) {
    var source = control.querySelector('.fm-tooltip');

    if (source && source.textContent.trim()) {
      return source.textContent.trim();
    }

    return control.getAttribute('aria-label') || '';
  }

  var activeTooltipControl = null;

  function positionGlobalTooltip(control) {
    if (!control || !globalTooltipEl.classList.contains('fm-show')) return;

    var rect = control.getBoundingClientRect();
    var scale = getCurrentStageScale();
    var gap = 14 * scale;

    setStyle(globalTooltipEl, '--fm-tooltip-scale', String(scale));

    // offsetWidth/offsetHeight are the logical, unscaled tooltip dimensions.
    // Multiplying by the Storyline stage scale gives the visible dimensions.
    var tooltipWidth = globalTooltipEl.offsetWidth * scale;
    var tooltipHeight = globalTooltipEl.offsetHeight * scale;

    var left = rect.left - gap - tooltipWidth;
    var top = rect.top + (rect.height / 2) - (tooltipHeight / 2);

    if (left < 8) {
      left = rect.right + gap;
    }

    left = Math.max(8, Math.min(left, window.innerWidth - tooltipWidth - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - tooltipHeight - 8));

    setStyle(globalTooltipEl, 'left', Math.round(left) + 'px');
    setStyle(globalTooltipEl, 'top', Math.round(top) + 'px');
    setStyle(globalTooltipEl, 'transform-origin', 'top left');
  }

  function showGlobalTooltip(control) {
    var label = getTooltipLabel(control);
    if (!label) return;

    activeTooltipControl = control;
    globalTooltipEl.textContent = label;
    globalTooltipEl.setAttribute('aria-hidden', 'false');
    globalTooltipEl.classList.add('fm-show');
    positionGlobalTooltip(control);
  }

  function hideGlobalTooltip() {
    activeTooltipControl = null;
    globalTooltipEl.classList.remove('fm-show');
    globalTooltipEl.setAttribute('aria-hidden', 'true');
  }

  var tooltipControls = [arrowEl].concat(
    [].slice.call(floatingMenuEl.querySelectorAll('.fm-btn'))
  );

  tooltipControls.forEach(function (control) {
    var label = getTooltipLabel(control);

    if (label) {
      control.setAttribute('aria-label', label);
    }

    // Remove native browser tooltips so every tooltip uses the same UI.
    control.removeAttribute('title');

    control.addEventListener('mouseenter', function () {
      showGlobalTooltip(control);
    });

    control.addEventListener('mouseleave', hideGlobalTooltip);

    control.addEventListener('focus', function () {
      showGlobalTooltip(control);
    });

    control.addEventListener('blur', hideGlobalTooltip);
  });

  window.addEventListener('resize', function () {
    hideGlobalTooltip();
  });

  document.addEventListener('scroll', hideGlobalTooltip, true);

  // =========================================================
  // 4. ORIGINAL STORYLINE CONTROL ACTIONS
  // =========================================================

  var player = (function () {
    try {
      return window.GetPlayer();
    } catch (e) {
      return null;
    }
  })();

  function clickNative(selector) {
    var el = queryNative(selector);
    if (!el) return;

    if (typeof el.focus === 'function') {
      el.focus();
    }

    ['mousedown', 'mouseup', 'click'].forEach(function (type) {
      el.dispatchEvent(
        new MouseEvent(type, {
          bubbles: true,
          cancelable: true,
          view: window
        })
      );
    });
  }

  // Storyline's top-bar tabs are intentionally invisible/off-screen. Native
  // panel creation still uses their existing Storyline event handlers, but
  // activation must not focus or depend on the tab being visible.
  function activateHiddenPanelProxy(selector) {
    var el = queryNative(selector);

    if (!el) {
      console.warn('[Floating Menu] Native panel proxy not found:', selector);
      return false;
    }

    /*
     * IMPORTANT: Storyline's top-bar entries can be anchors. Dispatching a
     * synthetic click without cancelling the browser's default action can
     * navigate/reload the player in some published builds. That is especially
     * visible on Resources. Cancel ONLY the browser default action; do not stop
     * propagation, so Storyline's own panel handler still receives the event.
     */
    function cancelBrowserDefault(event) {
      event.preventDefault();
    }

    ['mousedown', 'mouseup', 'click'].forEach(function (type) {
      el.addEventListener(type, cancelBrowserDefault, true);

      try {
        el.dispatchEvent(
          new MouseEvent(type, {
            bubbles: true,
            cancelable: true,
            view: window
          })
        );
      } finally {
        el.removeEventListener(type, cancelBrowserDefault, true);
      }
    });

    return true;
  }

  // Hide the native controls that the floating menu replaces.
  // The elements remain available for click forwarding.

  var NATIVE_HIDDEN_IDS = [
    'prev',
    'next',
    'outline-link',
    'transcript-link',
    'glossary-link',
    'resources-link',
    'captions',
    'playback-speed',
    'settings',
    'full-screen-toggle'
  ];

  // Targeted helper for Storyline's hidden native Previous/Next buttons.
  // These elements are kept in the DOM because the floating-menu navigation
  // forwards synthetic clicks to them, but they must have NO real pointer or
  // focus hit-area and must not be able to create native/custom tooltips.
  function disableHiddenNativeNavTooltip(el) {
    if (!el) return;

    var tooltipAttrs = [
      'title',
      'aria-describedby',
      'data-tooltip',
      'data-original-title',
      'data-bs-original-title',
      'data-tippy-content'
    ];

    function stripTooltipAttrs(node) {
      tooltipAttrs.forEach(function (name) {
        if (node.hasAttribute && node.hasAttribute(name)) {
          node.removeAttribute(name);
        }
      });
    }

    stripTooltipAttrs(el);

    el.querySelectorAll('*').forEach(function (node) {
      stripTooltipAttrs(node);
      setStyle(node, 'pointer-events', 'none', 'important');
      setStyle(node, 'visibility', 'hidden', 'important');
    });

    // Remove keyboard focus from the hidden native control only.
    // Programmatic dispatchEvent('click') continues to work.
    el.setAttribute('tabindex', '-1');
    el.setAttribute('aria-hidden', 'true');

    // Install the blocker once. Do NOT block click events because the
    // floating-menu Previous/Next buttons still forward clicks here.
    if (!el.__fmHiddenNavTooltipBlocked) {
      el.__fmHiddenNavTooltipBlocked = true;

      [
        'pointerenter',
        'pointerover',
        'mouseenter',
        'mouseover',
        'focus',
        'focusin'
      ].forEach(function (type) {
        el.addEventListener(type, function (event) {
          event.stopImmediatePropagation();
        }, true);
      });
    }
  }

  function forceHideNativeButtons() {
    NATIVE_HIDDEN_IDS.forEach(function (id) {
      var el = document.getElementById(id);
      if (!el) return;

      setStyle(el, 'position', 'fixed', 'important');
      setStyle(el, 'left', '-9999px', 'important');
      setStyle(el, 'top', '-9999px', 'important');
      setStyle(el, 'pointer-events', 'none', 'important');

      // Previous/Next need a stronger, targeted hide because Storyline can
      // still leave a hover/focus tooltip trigger at their former location.
      // This does NOT touch the floating-menu Previous/Next buttons.
      if (id === 'prev' || id === 'next') {
        disableHiddenNativeNavTooltip(el);
        setStyle(el, 'visibility', 'hidden', 'important');
        setStyle(el, 'opacity', '0', 'important');
        setStyle(el, 'width', '1px', 'important');
        setStyle(el, 'height', '1px', 'important');
        setStyle(el, 'min-width', '0', 'important');
        setStyle(el, 'min-height', '0', 'important');
        setStyle(el, 'overflow', 'hidden', 'important');
        setStyle(el, 'clip-path', 'inset(50%)', 'important');
      }
    });
  }

  forceHideNativeButtons();

  var nativeHideObserver = new MutationObserver(
    forceHideNativeButtons
  );

  NATIVE_HIDDEN_IDS.forEach(function (id) {
    var el = document.getElementById(id);

    if (el) {
      nativeHideObserver.observe(el, {
        attributes: true,
        attributeFilter: ['style', 'class']
      });
    }
  });

  setInterval(forceHideNativeButtons, 500);

  // Previous / Next

  var fmPrevBtn = document.querySelector(
    '.floating-menu [data-nav="prev"]'
  );

  var fmNextBtn = document.querySelector(
    '.floating-menu [data-nav="next"]'
  );

  fmPrevBtn.addEventListener('click', function () {
    clickNative('#prev');
  });

  fmNextBtn.addEventListener('click', function () {
    clickNative('#next');
  });

  function syncPrevNextDisabledState() {
    var nativePrev = document.getElementById('prev');
    var nativeNext = document.getElementById('next');

    if (nativePrev) {
      fmPrevBtn.classList.toggle(
        'fm-disabled',
        nativePrev.classList.contains('cs-disabled')
      );
    }

    if (nativeNext) {
      fmNextBtn.classList.toggle(
        'fm-disabled',
        nativeNext.classList.contains('cs-disabled')
      );
    }
  }

  syncPrevNextDisabledState();
  setInterval(syncPrevNextDisabledState, 500);

  // Page number - current scene slide number.
  // Direct GetVar('Scene.SlideNumber') is NOT used on every poll because this
  // published build proves that resolver path is unavailable and floods the
  // console with "Path did not resolve at: Scene". Instead, read Storyline's
  // own runtime slide-number manager / current-slide metadata (window.DS).
  // No custom Storyline variable is created.
  var lastSceneSlideNumber = null;
  var lastPageNumberSource = '';
  var lastCurrentSlideIdentity = null;
  var didLogDirectBuiltInFailure = false;

  function getCurrentStorylinePlayerForDebug() {
    var storylinePlayer = null;

    try {
      storylinePlayer = window.GetPlayer ? window.GetPlayer() : null;
    } catch (error) {
      console.error('[Floating Menu] GetPlayer() threw an error:', error);
      return null;
    }

    console.log('[Floating Menu] GetPlayer() result:', storylinePlayer);
    console.log(
      '[Floating Menu] GetPlayer API check:',
      storylinePlayer
        ? {
            GetVar: typeof storylinePlayer.GetVar,
            SetVar: typeof storylinePlayer.SetVar,
            hasObject: !!storylinePlayer.object,
            hasDS: !!window.DS,
            hasSlideNumberManager: !!(window.DS && window.DS.slideNumberManager)
          }
        : null
    );

    return storylinePlayer;
  }

  function formatSceneSlideNumber(value) {
    var number = parseInt(value, 10);
    if (!isFinite(number) || number < 1) return null;
    return number < 10 ? '0' + number : String(number);
  }

  function numberCandidate(value) {
    if (value === undefined || value === null || value === '') return null;

    if (typeof value === 'object') {
      var nestedKeys = ['value', 'currentValue', 'val', 'number'];
      for (var n = 0; n < nestedKeys.length; n++) {
        if (Object.prototype.hasOwnProperty.call(value, nestedKeys[n])) {
          var nested = numberCandidate(value[nestedKeys[n]]);
          if (nested !== null) return nested;
        }
      }
      return null;
    }

    var parsed = parseInt(value, 10);
    return isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  function findSceneSlideNumberInObject(root) {
    if (!root || typeof root !== 'object') return null;

    var seen = [];

    function walk(node, depth) {
      if (!node || typeof node !== 'object' || depth > 5) return null;
      if (seen.indexOf(node) !== -1) return null;
      seen.push(node);

      var directNames = [
        'Scene.SlideNumber',
        'scene.SlideNumber',
        'scene.slideNumber',
        'sceneSlideNumber',
        'SceneSlideNumber'
      ];

      for (var i = 0; i < directNames.length; i++) {
        if (Object.prototype.hasOwnProperty.call(node, directNames[i])) {
          var direct = numberCandidate(node[directNames[i]]);
          if (direct !== null) return direct;
        }
      }

      var name = node.name || node.key || node.id || node.path || node.variableName;
      if (String(name || '').toLowerCase() === 'scene.slidenumber') {
        var named = numberCandidate(node);
        if (named !== null) return named;
      }

      var keys;
      try {
        keys = Object.keys(node);
      } catch (e) {
        return null;
      }

      for (var k = 0; k < keys.length; k++) {
        var key = keys[k];
        if (key === 'parent' || key === '_events' || key === 'view') continue;
        var value;
        try {
          value = node[key];
        } catch (e2) {
          continue;
        }
        var found = walk(value, depth + 1);
        if (found !== null) return found;
      }

      return null;
    }

    return walk(root, 0);
  }

  function getCurrentDsSlide() {
    var ds = window.DS;
    if (!ds) return null;

    try {
      if (ds.windowManager && typeof ds.windowManager.getCurrentWindowSlide === 'function') {
        return ds.windowManager.getCurrentWindowSlide();
      }
    } catch (e) {}

    try {
      var wm = ds.appState && ds.appState.windowManager;
      var win = wm && wm.windows && wm.windows[0];
      if (win && typeof win.getCurrentSlide === 'function') {
        return win.getCurrentSlide();
      }
    } catch (e2) {}

    return null;
  }

  function collectionModels(value) {
    if (!value) return null;
    if (Array.isArray(value)) return value;
    if (Array.isArray(value.models)) return value.models;
    if (Array.isArray(value.children)) return value.children;
    return null;
  }

  function sameRuntimeSlide(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;

    var aa = a.attributes || {};
    var ba = b.attributes || {};
    var aId = aa.id || aa.lmsId || aa.g || aa.name;
    var bId = ba.id || ba.lmsId || ba.g || ba.name;
    return !!(aId && bId && String(aId) === String(bId));
  }

  function readSceneSlideNumberFromDs() {
    var ds = window.DS;
    if (!ds) {
      return { value: null, source: 'window.DS unavailable', slide: null };
    }

    // First preference: Storyline's own slide-number manager. This is the
    // internal runtime that supplies the built-in slide-number variables.
    try {
      if (
        ds.slideNumberManager &&
        typeof ds.slideNumberManager.getPlayerVariables === 'function'
      ) {
        var builtInVariables = ds.slideNumberManager.getPlayerVariables();
        var managed = findSceneSlideNumberInObject(builtInVariables);
        if (managed !== null) {
          return {
            value: managed,
            source: 'DS.slideNumberManager.getPlayerVariables()',
            slide: getCurrentDsSlide()
          };
        }
      }
    } catch (managerError) {
      console.warn('[Floating Menu] DS slideNumberManager read failed:', managerError);
    }

    var currentSlide = getCurrentDsSlide();
    if (!currentSlide) {
      return { value: null, source: 'DS current slide unavailable', slide: null };
    }

    var attrs = currentSlide.attributes || {};
    var directKeys = [
      'sceneSlideNumber',
      'SceneSlideNumber',
      'slideNumber',
      'slideNum'
    ];

    for (var i = 0; i < directKeys.length; i++) {
      var direct = numberCandidate(attrs[directKeys[i]]);
      if (direct !== null) {
        return {
          value: direct,
          source: 'DS currentSlide.attributes.' + directKeys[i],
          slide: currentSlide
        };
      }
    }

    // Published Storyline identifiers commonly include SceneX_SlideY. Use the
    // runtime-generated current-slide identifier when available.
    var idCandidates = [attrs.lmsId, attrs.id, attrs.strID, attrs.name];
    for (var idIndex = 0; idIndex < idCandidates.length; idIndex++) {
      var idValue = idCandidates[idIndex];
      if (!idValue) continue;
      var match = String(idValue).match(/(?:^|[_-])Slide(\d+)(?:[_-]|$)/i);
      if (match) {
        var idNumber = numberCandidate(match[1]);
        if (idNumber !== null) {
          return {
            value: idNumber,
            source: 'DS current slide runtime identifier',
            slide: currentSlide
          };
        }
      }
    }

    // Final DS fallback: calculate the slide's 1-based ordinal inside its
    // current scene collection. This is still Storyline runtime metadata, not
    // a hard-coded or separately-maintained page counter.
    var scene = currentSlide.parent || null;
    if (scene) {
      var collections = [
        scene.children,
        scene.slides,
        scene.attributes && scene.attributes.slides,
        scene.attributes && scene.attributes.children
      ];

      if (typeof scene.get === 'function') {
        try { collections.push(scene.get('slides')); } catch (e3) {}
        try { collections.push(scene.get('children')); } catch (e4) {}
      }

      for (var c = 0; c < collections.length; c++) {
        var models = collectionModels(collections[c]);
        if (!models || !models.length) continue;

        for (var m = 0; m < models.length; m++) {
          if (sameRuntimeSlide(models[m], currentSlide)) {
            return {
              value: m + 1,
              source: 'DS current scene slide collection index',
              slide: currentSlide
            };
          }
        }
      }
    }

    return { value: null, source: 'DS slide metadata did not expose a scene ordinal', slide: currentSlide };
  }

  function slideIdentity(slide) {
    if (!slide) return null;
    var attrs = slide.attributes || {};
    return attrs.id || attrs.lmsId || attrs.g || attrs.name || slide;
  }

  function logDirectBuiltInFailureOnce(storylinePlayer) {
    if (didLogDirectBuiltInFailure) return;
    didLogDirectBuiltInFailure = true;

    /* The attached console proves GetVar("Scene.SlideNumber") resolves to
       null and emits a Storyline resolver error in this publish. Do not call
       that failing path again. Page numbering is read from Storyline's live
       DS runtime instead. */
    console.log(
      '[Floating Menu] Scene.SlideNumber direct GetVar lookup skipped; using Storyline DS runtime.'
    );
    console.log('[Floating Menu] GetPlayer() available for user variables:', !!storylinePlayer);
  }

  function updatePageNumber(reason) {
    var counter = document.getElementById('fmSlideNumber');
    if (!counter) {
      console.warn('[Floating Menu] fmSlideNumber element is unavailable.');
      return;
    }

    var storylinePlayer = player || getCurrentStorylinePlayerForDebug();
    logDirectBuiltInFailureOnce(storylinePlayer);

    var result = readSceneSlideNumberFromDs();
    var slideNumber = result.value;

    console.log('[Floating Menu] GetPlayer():', storylinePlayer);
    console.log('[Floating Menu] Scene.SlideNumber:', slideNumber);
    console.log('[Floating Menu] fmSlideNumber:', counter);
    var identity = slideIdentity(result.slide);

    if (slideNumber === null) {
      if (identity !== lastCurrentSlideIdentity || result.source !== lastPageNumberSource) {
        console.warn('[Floating Menu] Scene.SlideNumber could not be read');
        console.warn(
          '[Floating Menu] Scene.SlideNumber runtime value unavailable.',
          { reason: reason || 'unspecified', source: result.source, currentSlide: result.slide }
        );
        lastCurrentSlideIdentity = identity;
        lastPageNumberSource = result.source;
      }
      return;
    }

    var formattedSlideNumber = formatSceneSlideNumber(slideNumber);
    if (formattedSlideNumber === null) return;

    if (
      slideNumber !== lastSceneSlideNumber ||
      counter.textContent !== formattedSlideNumber ||
      identity !== lastCurrentSlideIdentity
    ) {
      console.log('[Floating Menu] Scene.SlideNumber runtime read:', slideNumber);
      console.log('[Floating Menu] Scene.SlideNumber source:', result.source);
      console.log('[Floating Menu] Updating page number to:', formattedSlideNumber);

      lastSceneSlideNumber = slideNumber;
      lastCurrentSlideIdentity = identity;
      lastPageNumberSource = result.source;
      counter.textContent = formattedSlideNumber;
    }
  }

  // Expose a refresh hook on the persistent root. The Slide Master trigger can
  // execute again on a new slide without rebuilding/resetting the Floating Menu.
  fmRoot.fmUpdatePageNumber = updatePageNumber;

  getCurrentStorylinePlayerForDebug();
  updatePageNumber('initialization');

  function schedulePageNumberRefresh(reason) {
    window.setTimeout(function () { updatePageNumber(reason + ':100ms'); }, 100);
    window.setTimeout(function () { updatePageNumber(reason + ':400ms'); }, 400);
    window.setTimeout(function () { updatePageNumber(reason + ':900ms'); }, 900);
  }

  fmPrevBtn.addEventListener('click', function () {
    schedulePageNumberRefresh('Previous clicked');
  });

  fmNextBtn.addEventListener('click', function () {
    schedulePageNumberRefresh('Next clicked');
  });

  // Low-frequency fallback for navigation that does not use our Previous/Next
  // controls (menu jumps, triggers, branching, etc.). This reads window.DS and
  // therefore does not produce resolver errors.
  setInterval(function () {
    updatePageNumber('periodic navigation check');
  }, 1200);

  // Volume / Mute - retains the supplied audio/video implementation.

  var volBtn = document.querySelector(
    '.floating-menu [data-panel="volume"]'
  );

  volBtn.addEventListener('click', function () {
    var muted = volBtn.classList.toggle('fm-muted');

    document.querySelectorAll('audio, video').forEach(function (m) {
      m.muted = muted;
    });
  });

  // Closed Captions - independent of menu expansion/collapse.

  var ccBtn = document.querySelector(
    '.floating-menu [data-panel="cc"]'
  );

  ccBtn.addEventListener('click', function () {
    clickNative('#captions');
  });

  function syncCcActiveState() {
    var nativeCc = document.getElementById('captions');

    if (nativeCc) {
      ccBtn.classList.toggle(
        'fm-active',
        nativeCc.getAttribute('aria-pressed') === 'true'
      );
    }
  }

  syncCcActiveState();
  setInterval(syncCcActiveState, 300);

  // Exit uses the Storyline Boolean variable as the single source of truth.
  var exitBtn = document.querySelector(
    '.floating-menu [data-panel="exit"]'
  );

  if (exitBtn) {
    exitBtn.addEventListener('click', function () {
      var storylinePlayer = window.GetPlayer();
      var beforeExit = storylinePlayer.GetVar('Exit');

      console.log('[Floating Menu] Exit variable before toggle:', beforeExit);

      storylinePlayer.SetVar('Exit', !beforeExit);

      var afterExit = storylinePlayer.GetVar('Exit');
      console.log('[Floating Menu] Exit variable after toggle:', afterExit);
    });
  }

  // Fullscreen

  var fsBtn = document.querySelector(
    '.floating-menu [data-panel="fullscreen"]'
  );

  fsBtn.addEventListener('click', function () {
    clickNative('#full-screen-toggle');
  });

  function syncFullscreenActiveState() {
    fsBtn.classList.toggle(
      'fm-active',
      !!document.fullscreenElement
    );
  }

  syncFullscreenActiveState();

  document.addEventListener(
    'fullscreenchange',
    syncFullscreenActiveState
  );

  setInterval(syncFullscreenActiveState, 500);

  // Help uses the Storyline variable as the single source of truth, but the
  // button itself is intentionally hover-only. Clicking still toggles Help;
  // no persistent fm-active/selected visual state is retained afterward.
  var helpBtn = document.querySelector(
    '.floating-menu [data-panel="help"]'
  );

  if (helpBtn) {
    helpBtn.classList.remove('fm-active');

    helpBtn.addEventListener('click', function () {
      // Clear any stale selected state before reading/toggling Storyline.
      helpBtn.classList.remove('fm-active');

      var storylinePlayer = window.GetPlayer();
      var currentValue = storylinePlayer.GetVar('Help');

      console.log('[Floating Menu] Help variable before toggle:', currentValue);

      // A Boolean Help variable must exist in the Storyline project. If the
      // project does not expose it, do not invent a JavaScript fallback state.
      if (currentValue === undefined || currentValue === null) {
        console.warn('[Floating Menu] Help variable is unavailable:', currentValue);
        helpBtn.classList.remove('fm-active');
        return;
      }

      var nextValue = !currentValue;
      storylinePlayer.SetVar('Help', nextValue);

      var afterHelp = storylinePlayer.GetVar('Help');
      console.log('[Floating Menu] Help variable after toggle:', afterHelp);

      // Help is hover-only by design. Never mirror the variable into the
      // persistent visual active state used by other controls.
      helpBtn.classList.remove('fm-active');
    });
  }

  // Native panels

  var panelSelectorMap = {
    menu: '#outline-link',
    transcript: '#transcript-link',
    glossary: '#glossary-link',
    resources: '#resources-link'
  };

  /*
   * IMPORTANT: define the panel element map before any native-panel handlers,
   * active-state sync, or Resources direct-open logic can call getPanelEl().
   * In V27 this map was declared later in section 6. Because `var` is hoisted
   * without its value, early calls saw PANEL_SELECTOR_MAP === undefined and
   * could throw while reading PANEL_SELECTOR_MAP.resources.
   */
  var PANEL_SELECTOR_MAP = {
    menu: '#outline-panel',
    transcript: '#transcript-panel',
    glossary: '#glossary-panel',
    resources: '#resources-panel'
  };

  var currentOpenPanelKey = null;
  var cachedPanelEls = {};

  var DETACHABLE_PANELS = {
    transcript: true
  };

  var detachedPanelState = {
    transcript: {
      detached: false,
      open: false,
      x: null,
      y: null,
      width: null,
      height: null
    }
  };

  function getDetachedState(key) {
    return DETACHABLE_PANELS[key]
      ? detachedPanelState[key]
      : null;
  }

  function isDetachedPanelOpen(key) {
    var state = getDetachedState(key);
    return !!(state && state.detached && state.open);
  }

  function getPanelEl(key) {
    var cached = cachedPanelEls[key];

    if (cached && cached.isConnected) {
      return cached;
    }

    if (!PANEL_SELECTOR_MAP || !Object.prototype.hasOwnProperty.call(PANEL_SELECTOR_MAP, key)) {
      console.warn('[Floating Menu] Panel selector unavailable for key:', key);
      return null;
    }

    var panelSelector = PANEL_SELECTOR_MAP[key];

    var found = panelSelector &&
      document.querySelector(panelSelector);

    if (found) {
      cachedPanelEls[key] = found;
    }

    return found || null;
  }

  function closePanel(key) {
    var panel = getPanelEl(key);
    var nativeEl = queryNative(panelSelectorMap[key]);
    var state = getDetachedState(key);

    var btn = document.querySelector(
      '.floating-menu [data-panel="' + key + '"]'
    );

    if (state && state.detached) {
      state.open = false;
    }

    if (panel) {
      setStyle(panel, 'display', 'none', 'important');
    }

    if (nativeEl) {
      nativeEl.setAttribute('aria-expanded', 'false');
    }

    if (btn) {
      btn.classList.remove('fm-active');
    }

    if (currentOpenPanelKey === key) {
      currentOpenPanelKey = null;
    }
  }

  function closeAllPanelsExcept(exceptKey) {
    Object.keys(panelSelectorMap).forEach(function (k) {
      if (
        k !== exceptKey &&
        !isDetachedPanelOpen(k)
      ) {
        closePanel(k);
      }
    });

    ['speed', 'settings'].forEach(function (k) {
      if (k !== exceptKey) {
        closeCustomDropdown(k);
      }
    });
  }

  function openResourcesPanelWithoutNativeClick(btn) {
    var panel = getPanelEl('resources');

    if (!panel) {
      console.warn('[Floating Menu] Resources panel not present yet; native proxy fallback is required once.');
      return false;
    }

    var nativeEl = queryNative(panelSelectorMap.resources);
    if (nativeEl) {
      nativeEl.setAttribute('aria-expanded', 'true');
    }

    currentOpenPanelKey = 'resources';
    btn.classList.add('fm-active');

    /*
     * ROOT-CAUSE FIX FOR THE RESOURCES JERK:
     * Previously the panel was made display:flex while it was still in its
     * native Storyline container, then moved/positioned on the next animation
     * frame. That created one visible/native-layout frame and also generated
     * body/panel mutations that the global layout observer treated as a stage
     * change. The Floating Menu then recalculated its transform/position.
     *
     * Keep Resources hidden, take it out of native layout first, build its
     * shell, position it completely, and only then reveal it. No Floating Menu
     * refresh/rebuild is requested anywhere in this path.
     */
    setStyle(panel, 'visibility', 'hidden', 'important');
    setStyle(panel, 'pointer-events', 'none', 'important');
    setStyle(panel, 'position', 'fixed', 'important');

    if (panel.parentElement !== document.body) {
      document.body.appendChild(panel);
    }

    var shell = ensurePanelShell('resources', panel);
    configurePanelScrolling('resources', shell);

    positionPanel('resources', {
      forceOpen: true,
      revealAfterPosition: true,
      debugReason: 'Resources direct open'
    });

    console.log('[Floating Menu] Resources opened directly from existing #resources-panel; Floating Menu layout untouched.');
    return true;
  }

  Object.keys(panelSelectorMap).forEach(function (key) {
    var btn = document.querySelector(
      '.floating-menu [data-panel="' + key + '"]'
    );

    if (!btn) return;

    btn.addEventListener('click', function () {
      if (key === 'resources') {
        console.log('[Floating Menu] Resources clicked', { menuOpen: menuOpen, currentOpenPanelKey: currentOpenPanelKey, initializationComplete: !!fmRoot.__fmInitializationComplete });

        if (currentOpenPanelKey === 'resources') {
          closePanel('resources');
          console.log('[Floating Menu] Resources closed directly; Floating Menu state preserved.');
          return;
        }

        closeAllPanelsExcept('resources');

        if (openResourcesPanelWithoutNativeClick(btn)) {
          return;
        }

        // Fallback only for builds that do not create #resources-panel until
        // the native tab is activated. This path should occur at most once;
        // after creation all later opens are direct and cannot reset the menu.
        var resourceProxyActivated = activateHiddenPanelProxy(panelSelectorMap.resources);
        console.log('[Floating Menu] Resources one-time proxy fallback result:', resourceProxyActivated);
        console.log('[Floating Menu] Resources fallback did not recreate #fmRoot; persistent root preserved:', document.getElementById('fmRoot') === fmRoot);

        currentOpenPanelKey = 'resources';
        btn.classList.add('fm-active');

        requestAnimationFrame(function () { watchPanel('resources'); });
        window.setTimeout(function () { watchPanel('resources'); }, 80);
        window.setTimeout(function () { watchPanel('resources'); }, 250);
        return;
      }

      var state = getDetachedState(key);

      if (state && state.detached && state.open) {
        closePanel(key);
        return;
      }

      if (state && state.detached && !state.open) {
        closeAllPanelsExcept(key);
        activateHiddenPanelProxy(panelSelectorMap[key]);
        state.open = true;
        currentOpenPanelKey = key;
        btn.classList.add('fm-active');

        setTimeout(function () {
          var panel = getPanelEl(key);
          if (!panel) return;
          ensurePanelShell(key, panel);
          setStyle(panel, 'display', 'flex', 'important');
          applyDetachedPanelGeometry(key, panel);
        }, 40);

        return;
      }

      if (currentOpenPanelKey === key) {
        closePanel(key);
        return;
      }

      closeAllPanelsExcept(key);
      activateHiddenPanelProxy(panelSelectorMap[key]);

      currentOpenPanelKey = key;
      btn.classList.add('fm-active');

      requestAnimationFrame(function () { watchPanel(key); });
      window.setTimeout(function () { watchPanel(key); }, 80);
      window.setTimeout(function () { watchPanel(key); }, 250);
    });
  });

  function syncPanelActiveStates() {
    Object.keys(panelSelectorMap).forEach(function (key) {
      var btn = document.querySelector(
        '.floating-menu [data-panel="' + key + '"]'
      );

      if (!btn) return;

      // Resources is now owned by the custom panel state. Do not let the
      // hidden native tab's aria state reopen/close/reset our button state.
      if (key === 'resources') {
        var resourcePanel = getPanelEl('resources');
        var resourceExpanded = false;

        if (resourcePanel && currentOpenPanelKey === 'resources') {
          try {
            resourceExpanded = getComputedStyle(resourcePanel).display !== 'none';
          } catch (e) {
            resourceExpanded = true;
          }
        }

        btn.classList.toggle('fm-active', resourceExpanded);
        if (!resourceExpanded && currentOpenPanelKey === 'resources') {
          currentOpenPanelKey = null;
        }
        return;
      }

      var nativeEl = queryNative(panelSelectorMap[key]);
      if (!nativeEl) return;

      var expanded = isDetachedPanelOpen(key) ||
        nativeEl.getAttribute('aria-expanded') === 'true';

      btn.classList.toggle('fm-active', expanded);

      if (expanded) {
        currentOpenPanelKey = key;
      } else if (currentOpenPanelKey === key) {
        currentOpenPanelKey = null;
      }
    });
  }

  syncPanelActiveStates();
  setInterval(syncPanelActiveStates, 300);

  function enforceSinglePanelOpen() {
    var openKeys = [];

    Object.keys(PANEL_SELECTOR_MAP).forEach(function (key) {
      if (
        !isDetachedPanelOpen(key) &&
        isPanelOpen(key)
      ) {
        openKeys.push(key);
      }
    });

    if (openKeys.length > 1) {
      var keep = openKeys.indexOf(currentOpenPanelKey) !== -1
        ? currentOpenPanelKey
        : openKeys[openKeys.length - 1];

      openKeys.forEach(function (key) {
        if (key !== keep) {
          closePanel(key);
        }
      });

      currentOpenPanelKey = keep;
    }
  }

  setInterval(enforceSinglePanelOpen, 250);

  // =========================================================
  // 5. CUSTOM PLAYBACK SPEED AND SETTINGS DROPDOWNS
  // =========================================================

  function closeCustomDropdown(key) {
    var el = key === 'speed'
      ? speedDropdownEl
      : settingsDropdownEl;

    if (el) {
      setStyle(el, 'display', 'none', 'important');
    }

    var btn = document.querySelector(
      '.floating-menu [data-panel="' + key + '"]'
    );

    if (btn) {
      btn.classList.remove('fm-active');
    }

    if (currentOpenPanelKey === key) {
      currentOpenPanelKey = null;
    }
  }

  function positionCustomDropdown(el, fmBtn) {
    if (!el || !fmBtn) return;

    var scale = getCurrentStageScale();
    var stageRect = getCurrentStageRect();
    var menuRect = floatingMenuEl.getBoundingClientRect();
    var btnRect = fmBtn.getBoundingClientRect();
    var gapVisual = 12 * scale;

    var allowedTop = menuRect.top;
    var allowedBottom = menuRect.bottom;

    if (stageRect) {
      allowedTop = Math.max(allowedTop, stageRect.top);
      allowedBottom = Math.min(allowedBottom, stageRect.bottom);
    }

    var availableVisualHeight = Math.max(0, allowedBottom - allowedTop);
    var availableLogicalHeight = availableVisualHeight / scale;

    var targetWidthLogical = CUSTOM_POPUP_TARGET_WIDTH;
    if (stageRect) {
      targetWidthLogical = Math.min(
        targetWidthLogical,
        Math.max(220, (stageRect.width / scale) - 24)
      );
    }

    setStyle(el, 'width', targetWidthLogical + 'px', 'important');
    setStyle(el, 'min-width', targetWidthLogical + 'px', 'important');
    setStyle(el, 'max-width', targetWidthLogical + 'px', 'important');

    var requestedHeightLogical = null;

    if (el.id === 'fmSpeedDropdown') {
      // Required fixed logical height. The popup still inherits the same
      // Storyline stage scale as the Floating Menu.
      requestedHeightLogical = 400;
    }
    if (requestedHeightLogical) {
      setStyle(el, 'height', requestedHeightLogical + 'px', 'important');
      setStyle(el, 'min-height', requestedHeightLogical + 'px', 'important');
      setStyle(el, 'max-height', requestedHeightLogical + 'px', 'important');
    } else {
      setStyle(el, 'height', '', 'important');
      setStyle(el, 'min-height', '0', 'important');
      setStyle(el, 'max-height', availableLogicalHeight + 'px', 'important');
    }

    setStyle(el, 'overflow', 'hidden', 'important');
    setStyle(el, 'transform-origin', 'top left', 'important');
    setStyle(el, 'transform', 'scale(' + scale + ')', 'important');
    setStyle(el, 'pointer-events', 'auto', 'important');

    var widthLogical = targetWidthLogical;
    var heightLogical = requestedHeightLogical || Math.min(el.offsetHeight || 200, availableLogicalHeight);
    var widthVisual = widthLogical * scale;
    var heightVisual = heightLogical * scale;

    var left = menuRect.left - widthVisual - gapVisual;
    var top = btnRect.top + ((btnRect.height - heightVisual) / 2);
    var maximumTop = allowedBottom - heightVisual;

    top = Math.max(allowedTop, Math.min(top, maximumTop));

    if (stageRect) {
      left = Math.max(
        stageRect.left + gapVisual,
        Math.min(left, stageRect.right - widthVisual - gapVisual)
      );
    }

    setStyle(el, 'position', 'fixed', 'important');
    setStyle(el, 'left', left + 'px', 'important');
    setStyle(el, 'top', top + 'px', 'important');
  }

  // Playback Speed

  var SPEED_OPTIONS = [
    '2',
    '1.75',
    '1.5',
    '1.25',
    '1',
    '0.75',
    '0.5',
    '0.25'
  ];

  var speedDropdownHTML =
    '<div class="fm-dropdown" id="fmSpeedDropdown">' +
      '<div class="fm-popup-header">' +
        '<div class="fm-popup-title">Playback Speed</div>' +
      '</div>' +
      '<div class="fm-popup-content">' +
        SPEED_OPTIONS.map(function (v) {
          var label = v === '1' ? 'Normal' : v;

          return (
            '<button class="fm-dropdown-item" data-speed-value="' +
            v +
            '">' +
            label +
            '</button>'
          );
        }).join('') +
      '</div>' +
    '</div>';

  var speedWrapper = document.createElement('div');
  speedWrapper.innerHTML = speedDropdownHTML;

  var speedDropdownEl = speedWrapper.firstElementChild;
  document.body.appendChild(speedDropdownEl);

  speedDropdownEl.querySelectorAll(
    '.fm-dropdown-item'
  ).forEach(function (item) {
    item.addEventListener('click', function () {
      var val = item.getAttribute('data-speed-value');

      clickNative(
        '.cs-listitem.menu-choice[data-speed="' + val + '"]'
      );

      speedDropdownEl.querySelectorAll(
        '.fm-dropdown-item'
      ).forEach(function (i) {
        i.classList.remove('fm-selected');
      });

      item.classList.add('fm-selected');
      closeCustomDropdown('speed');
    });
  });

  // Settings

  var SETTINGS_SWITCHES = [
    {
      id: 'zoom-switch',
      label: 'Zoom to fit'
    },
    {
      id: 'acctext-switch',
      label: 'Accessible text'
    },
    {
      id: 'shortcuts-switch',
      label: 'Keyboard shortcuts'
    }
  ];

  var settingsDropdownHTML =
    '<div class="fm-dropdown" id="fmSettingsDropdown">' +
      '<div class="fm-popup-header">' +
        '<div class="fm-popup-title">Settings</div>' +
      '</div>' +
      '<div class="fm-popup-content">' +
        SETTINGS_SWITCHES.map(function (s) {
          return (
            '<button class="fm-dropdown-item fm-dropdown-switch" ' +
            'data-switch-id="' + s.id + '">' +
              '<span>' + s.label + '</span>' +
              '<span class="fm-switch-indicator"></span>' +
            '</button>'
          );
        }).join('') +
      '</div>' +
    '</div>';

  var settingsWrapper = document.createElement('div');
  settingsWrapper.innerHTML = settingsDropdownHTML;

  var settingsDropdownEl = settingsWrapper.firstElementChild;
  document.body.appendChild(settingsDropdownEl);

  function syncSettingsSwitchStates() {
    SETTINGS_SWITCHES.forEach(function (s) {
      var nativeSwitch = document.getElementById(s.id);

      var row = settingsDropdownEl.querySelector(
        '[data-switch-id="' + s.id + '"]'
      );

      if (nativeSwitch && row) {
        row.classList.toggle(
          'fm-switch-on',
          nativeSwitch.getAttribute('aria-checked') === 'true'
        );
      }
    });
  }

  syncSettingsSwitchStates();
  setInterval(syncSettingsSwitchStates, 500);

  settingsDropdownEl.querySelectorAll(
    '.fm-dropdown-switch'
  ).forEach(function (row) {
    row.addEventListener('click', function () {
      clickNative(
        '#' + row.getAttribute('data-switch-id')
      );

      setTimeout(syncSettingsSwitchStates, 100);
    });
  });

  // Open / close the custom dropdowns.

  [
    {
      key: 'speed',
      el: speedDropdownEl
    },
    {
      key: 'settings',
      el: settingsDropdownEl
    }
  ].forEach(function (cfg) {
    var btn = document.querySelector(
      '.floating-menu [data-panel="' + cfg.key + '"]'
    );

    if (!btn) return;

    btn.addEventListener('click', function () {
      if (currentOpenPanelKey === cfg.key) {
        closeCustomDropdown(cfg.key);
        return;
      }

      closeAllPanelsExcept(cfg.key);

      positionCustomDropdown(cfg.el, btn);

      setStyle(
        cfg.el,
        'display',
        'flex',
        'important'
      );

      // Re-measure after display:flex gives it actual dimensions.
      positionCustomDropdown(cfg.el, btn);

      btn.classList.add('fm-active');
      currentOpenPanelKey = cfg.key;
    });
  });

  // =========================================================
  // 6. POSITION NATIVE PANELS BESIDE THE FLOATING MENU
  // =========================================================

  // PANEL_SELECTOR_MAP is declared earlier, before any panel handler can run.

  var PANEL_TITLES = {
    menu: 'Menu',
    transcript: 'Transcript',
    glossary: 'Glossary',
    resources: 'Resources'
  };

  var PANEL_FILL_HEIGHT = {
    menu: true,
    transcript: true,
    glossary: true,
    resources: true
  };

  // Popup sizing is authored in logical Storyline pixels and receives the
  // exact same stage scale as the Floating Menu.
  var POPUP_WIDTH_BONUS = 100;
  var CUSTOM_POPUP_BASE_WIDTH = 200;
  var CUSTOM_POPUP_TARGET_WIDTH = CUSTOM_POPUP_BASE_WIDTH + POPUP_WIDTH_BONUS;

  var panelOriginalHeights = {};
  var panelOriginalWidths = {};
  var panelShellBusy = false;
  var activeDetachedPointerSession = null;

  function clampNumber(value, min, max) {
    if (max < min) max = min;
    return Math.max(min, Math.min(value, max));
  }

  function getLogicalStageBounds() {
    var scale = getCurrentStageScale();
    var rect = getCurrentStageRect();

    if (!rect) {
      return {
        scale: scale,
        rect: { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight },
        width: window.innerWidth / scale,
        height: window.innerHeight / scale
      };
    }

    return {
      scale: scale,
      rect: rect,
      width: rect.width / scale,
      height: rect.height / scale
    };
  }

  function saveDetachedGeometry(key, panel) {
    var state = getDetachedState(key);
    if (!state || !panel) return;

    var bounds = getLogicalStageBounds();
    var rect = panel.getBoundingClientRect();

    state.x = (rect.left - bounds.rect.left) / bounds.scale;
    state.y = (rect.top - bounds.rect.top) / bounds.scale;
    state.width = panel.offsetWidth || (rect.width / bounds.scale);
    state.height = panel.offsetHeight || (rect.height / bounds.scale);
  }

  function ensureResizeHandles(panel) {
    if (!panel || panel.querySelector(':scope > .fm-resize-handle')) return;

    ['n', 'e', 's', 'w', 'ne', 'nw', 'se', 'sw'].forEach(function (edge) {
      var handle = document.createElement('div');
      handle.className = 'fm-resize-handle';
      handle.setAttribute('data-edge', edge);
      handle.setAttribute('aria-hidden', 'true');
      panel.appendChild(handle);
    });
  }

  function applyDetachedPanelGeometry(key, panel) {
    var state = getDetachedState(key);
    if (!state || !state.detached || !panel) return;

    var bounds = getLogicalStageBounds();
    var scale = bounds.scale;

    var width = isFinite(state.width) && state.width > 0
      ? state.width
      : Math.max(302, panel.offsetWidth || 302);
    var height = isFinite(state.height) && state.height > 0
      ? state.height
      : Math.max(220, panel.offsetHeight || 220);

    var inset = 8;
    width = clampNumber(width, 280, Math.max(280, bounds.width - inset * 2));
    height = clampNumber(height, 180, Math.max(180, bounds.height - inset * 2));

    var x = isFinite(state.x)
      ? state.x
      : Math.max(inset, (bounds.width - width) / 2);
    var y = isFinite(state.y)
      ? state.y
      : Math.max(inset, (bounds.height - height) / 2);

    x = clampNumber(x, inset, Math.max(inset, bounds.width - width - inset));
    y = clampNumber(y, inset, Math.max(inset, bounds.height - height - inset));

    state.x = x;
    state.y = y;
    state.width = width;
    state.height = height;

    panel.classList.add('fm-panel-detached');
    setStyle(panel, 'display', state.open ? 'flex' : 'none', 'important');
    setStyle(panel, 'position', 'fixed', 'important');
    setStyle(panel, 'left', (bounds.rect.left + x * scale) + 'px', 'important');
    setStyle(panel, 'top', (bounds.rect.top + y * scale) + 'px', 'important');
    setStyle(panel, 'width', width + 'px', 'important');
    setStyle(panel, 'height', height + 'px', 'important');
    setStyle(panel, 'max-width', 'none', 'important');
    setStyle(panel, 'max-height', 'none', 'important');
    setStyle(panel, 'z-index', '1000010', 'important');
    setStyle(panel, 'transform-origin', 'top left', 'important');
    setStyle(panel, 'transform', 'scale(' + scale + ')', 'important');
    setStyle(panel, 'overflow', 'hidden', 'important');
    setStyle(panel, 'pointer-events', 'auto', 'important');
  }

  function detachPanel(key, panel) {
    var state = getDetachedState(key);
    if (!state || !panel) return;

    var bounds = getLogicalStageBounds();
    var rect = panel.getBoundingClientRect();

    state.detached = true;
    state.open = true;
    state.x = (rect.left - bounds.rect.left) / bounds.scale;
    state.y = (rect.top - bounds.rect.top) / bounds.scale;
    state.width = Math.max(280, rect.width / bounds.scale);
    state.height = Math.max(180, rect.height / bounds.scale);

    ensureResizeHandles(panel);
    applyDetachedPanelGeometry(key, panel);

    var shell = ensurePanelShell(key, panel);
    configurePanelScrolling(key, shell);

    var btn = document.querySelector(
      '.floating-menu [data-panel="' + key + '"]'
    );
    if (btn) btn.classList.add('fm-active');
  }

  function attachPanel(key, panel) {
    var state = getDetachedState(key);
    if (!state || !panel || !state.detached) return;

    endDetachedPointerSession();

    state.detached = false;
    state.open = true;
    panel.classList.remove('fm-panel-detached');

    setStyle(panel, 'left', '', 'important');
    setStyle(panel, 'top', '', 'important');
    setStyle(panel, 'width', '', 'important');
    setStyle(panel, 'height', '', 'important');
    setStyle(panel, 'max-width', '', 'important');
    setStyle(panel, 'max-height', '', 'important');
    setStyle(panel, 'z-index', '', 'important');
    setStyle(panel, 'transform', '', 'important');
    setStyle(panel, 'transform-origin', '', 'important');

    var nativeEl = queryNative(panelSelectorMap[key]);
    if (nativeEl) nativeEl.setAttribute('aria-expanded', 'true');

    currentOpenPanelKey = key;

    var btn = document.querySelector(
      '.floating-menu [data-panel="' + key + '"]'
    );
    if (btn) btn.classList.add('fm-active');

    var shell = ensurePanelShell(key, panel);
    configurePanelScrolling(key, shell);

    requestAnimationFrame(function () {
      positionPanel(key);
    });
  }

  function beginDetachedPointerSession(key, panel, mode, edge, event) {
    var state = getDetachedState(key);
    if (!state || !state.detached || !state.open || !panel) return;
    if (event.button !== undefined && event.button !== 0) return;

    event.preventDefault();
    event.stopPropagation();

    var bounds = getLogicalStageBounds();
    saveDetachedGeometry(key, panel);

    activeDetachedPointerSession = {
      key: key,
      panel: panel,
      mode: mode,
      edge: edge || '',
      pointerId: event.pointerId,
      captureTarget: event.currentTarget || event.target,
      scale: bounds.scale,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: state.x,
      startTop: state.y,
      startWidth: state.width,
      startHeight: state.height
    };

    try {
      if (activeDetachedPointerSession.captureTarget.setPointerCapture) {
        activeDetachedPointerSession.captureTarget.setPointerCapture(event.pointerId);
      }
    } catch (e) {}
  }

  function updateDetachedPointerSession(event) {
    var session = activeDetachedPointerSession;
    if (!session) return;
    if (session.pointerId !== undefined && event.pointerId !== session.pointerId) return;

    event.preventDefault();

    var dx = (event.clientX - session.startX) / session.scale;
    var dy = (event.clientY - session.startY) / session.scale;
    var left = session.startLeft;
    var top = session.startTop;
    var width = session.startWidth;
    var height = session.startHeight;

    if (session.mode === 'drag') {
      left += dx;
      top += dy;
    } else {
      var edge = session.edge;

      if (edge.indexOf('e') !== -1) width += dx;
      if (edge.indexOf('s') !== -1) height += dy;

      if (edge.indexOf('w') !== -1) {
        width -= dx;
        left += dx;
      }

      if (edge.indexOf('n') !== -1) {
        height -= dy;
        top += dy;
      }

      if (width < 280) {
        if (edge.indexOf('w') !== -1) left -= (280 - width);
        width = 280;
      }

      if (height < 180) {
        if (edge.indexOf('n') !== -1) top -= (180 - height);
        height = 180;
      }
    }

    var bounds = getLogicalStageBounds();
    width = Math.min(width, Math.max(280, bounds.width - 16));
    height = Math.min(height, Math.max(180, bounds.height - 16));
    left = clampNumber(left, 8, Math.max(8, bounds.width - width - 8));
    top = clampNumber(top, 8, Math.max(8, bounds.height - height - 8));

    var state = getDetachedState(session.key);
    state.x = left;
    state.y = top;
    state.width = width;
    state.height = height;

    applyDetachedPanelGeometry(session.key, session.panel);
  }

  function endDetachedPointerSession(event) {
    var session = activeDetachedPointerSession;
    if (!session) return;
    if (event && session.pointerId !== undefined && event.pointerId !== undefined &&
        event.pointerId !== session.pointerId) return;

    saveDetachedGeometry(session.key, session.panel);

    try {
      if (session.captureTarget && session.captureTarget.releasePointerCapture &&
          session.pointerId !== undefined &&
          session.captureTarget.hasPointerCapture &&
          session.captureTarget.hasPointerCapture(session.pointerId)) {
        session.captureTarget.releasePointerCapture(session.pointerId);
      }
    } catch (e) {}

    activeDetachedPointerSession = null;
  }

  document.addEventListener('pointermove', updateDetachedPointerSession, true);
  document.addEventListener('pointerup', endDetachedPointerSession, true);
  document.addEventListener('pointercancel', endDetachedPointerSession, true);
  window.addEventListener('blur', function () { endDetachedPointerSession(); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) endDetachedPointerSession();
  });

  function ensureDetachControls(key, panel, shell) {
    if (!DETACHABLE_PANELS[key] || !panel || !shell || !shell.header) return;

    ensureResizeHandles(panel);

    var actions = shell.header.querySelector(
      ':scope > .fm-detached-actions[data-fm-detached-actions="' + key + '"]'
    );

    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'fm-detached-actions';
      actions.setAttribute('data-fm-detached-actions', key);

      actions.innerHTML =
        '<button type="button" class="fm-detach-btn" aria-label="Detach ' + PANEL_TITLES[key] + ' popup">' +
          '<svg viewBox="0 0 24 24"><path d="M9 5H5v14h14v-4"></path><path d="M13 5h6v6"></path><path d="M19 5l-8 8"></path></svg>' +
        '</button>' +
        '<button type="button" class="fm-detached-attach" aria-label="Attach ' + PANEL_TITLES[key] + ' popup">' +
          '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="5" width="11.5" height="14" rx="1.8"></rect><path d="M9 12h9"></path><path d="M15 9l3 3-3 3"></path><path d="M20.5 5v14"></path></svg>' +
        '</button>' +
        '<button type="button" class="fm-detached-close" aria-label="Close ' + PANEL_TITLES[key] + ' popup">' +
          '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"></path></svg>' +
        '</button>';

      shell.header.appendChild(actions);

      actions.querySelector('.fm-detach-btn').addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        detachPanel(key, panel);
      });

      actions.querySelector('.fm-detached-close').addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        closePanel(key);
      });

      actions.querySelector('.fm-detached-attach').addEventListener('click', function (event) {
        event.preventDefault();
        event.stopPropagation();
        attachPanel(key, panel);
      });

      shell.header.addEventListener('pointerdown', function (event) {
        if (!isDetachedPanelOpen(key)) return;
        if (event.target.closest('button, a, input, select, textarea, [role="button"]')) return;
        beginDetachedPointerSession(key, panel, 'drag', '', event);
      });

      panel.querySelectorAll(':scope > .fm-resize-handle').forEach(function (handle) {
        handle.addEventListener('pointerdown', function (event) {
          beginDetachedPointerSession(
            key,
            panel,
            'resize',
            handle.getAttribute('data-edge') || '',
            event
          );
        });
      });
    }
  }

  function capturePanelOriginalHeight(key, panel) {
    if (key !== 'transcript' || panelOriginalHeights[key]) return;

    // offsetHeight is the logical, pre-transform size. This is what should be
    // preserved when the entire popup later receives Storyline stage scaling.
    var h = panel.offsetHeight || 0;

    if (h >= 120) {
      panelOriginalHeights[key] = h;
    }
  }

  function capturePanelOriginalWidth(key, panel) {
    if (!panel || panelOriginalWidths[key]) return;

    var width = panel.offsetWidth || 0;
    if (!width) {
      try {
        width = parseFloat(getComputedStyle(panel).width) || 0;
      } catch (e) {}
    }

    if (width >= 120) {
      panelOriginalWidths[key] = width;
    }
  }

  function findBestScrollableDescendant(content) {
    if (!content) return null;

    var cached = content.__fmNativeScroller;
    if (cached && cached.isConnected && content.contains(cached)) {
      return cached;
    }

    var nodes = [].slice.call(content.querySelectorAll('*'));
    var best = null;
    var bestOverflow = 0;

    nodes.forEach(function (el) {
      if (!(el instanceof HTMLElement)) return;

      var cs = getComputedStyle(el);
      var overflowY = cs.overflowY;

      if (overflowY !== 'auto' && overflowY !== 'scroll') return;

      var overflowAmount = el.scrollHeight - el.clientHeight;

      if (overflowAmount > bestOverflow + 2) {
        best = el;
        bestOverflow = overflowAmount;
      }
    });

    content.__fmNativeScroller = best || null;
    return best;
  }

  function neutralizeNestedScrollers(content) {
    var nodes = [].slice.call(content.querySelectorAll('*'));

    nodes.forEach(function (el) {
      if (!(el instanceof HTMLElement)) return;
      if (el.matches('textarea, select, input, [role="listbox"]')) return;

      var cs = getComputedStyle(el);
      var overflowY = cs.overflowY;
      var isScrollable =
        (overflowY === 'auto' || overflowY === 'scroll') &&
        el.scrollHeight > el.clientHeight + 2;

      if (!isScrollable) return;

      setStyle(el, 'overflow-y', 'visible', 'important');
      setStyle(el, 'max-height', 'none', 'important');

      if (cs.position !== 'absolute' && cs.position !== 'fixed') {
        setStyle(el, 'height', 'auto', 'important');
      }
    });
  }

  function expandPanelContentToFullWidth(shell) {
    if (!shell || !shell.header || !shell.content) return;

    var header = shell.header;
    var content = shell.content;

    setStyle(header, 'width', '100%', 'important');
    setStyle(header, 'max-width', 'none', 'important');
    setStyle(header, 'min-width', '0', 'important');
    setStyle(header, 'box-sizing', 'border-box', 'important');

    setStyle(content, 'width', '100%', 'important');
    setStyle(content, 'max-width', 'none', 'important');
    setStyle(content, 'min-width', '0', 'important');
    setStyle(content, 'box-sizing', 'border-box', 'important');

    /* Storyline frequently leaves one or two block wrappers at the panel's
       original fixed width. Expand only layout containers; do not stretch
       buttons, SVGs, form controls, or inline transcript content. */
    var allowedTags = {
      DIV: true, SECTION: true, MAIN: true, NAV: true, ASIDE: true,
      ARTICLE: true, FORM: true, UL: true, OL: true
    };

    function expandContainer(el) {
      if (!el || !allowedTags[el.tagName]) return;

      var cs;
      try { cs = getComputedStyle(el); } catch (e) { return; }
      if (!cs || cs.position === 'fixed') return;

      setStyle(el, 'width', '100%', 'important');
      setStyle(el, 'max-width', 'none', 'important');
      setStyle(el, 'min-width', '0', 'important');
      setStyle(el, 'box-sizing', 'border-box', 'important');
    }

    [].slice.call(content.children).forEach(function (child) {
      expandContainer(child);

      /* One additional wrapper level covers the common Storyline sidebar
         structure without globally rewriting widths of actual content. */
      if (child && child.children) {
        [].slice.call(child.children).forEach(expandContainer);
      }
    });
  }

  function restoreResourcePdfIconSizing(content) {
    if (!content) return;

    var iconNodes = content.querySelectorAll('.file-icon.resource-ext-pdf');
    if (!iconNodes.length) return;

    [].slice.call(iconNodes).forEach(function (icon) {
      var svg = icon.querySelector('svg');
      var text = icon.querySelector('.file-icon-text');

      /* Keep the original Storyline PDF artwork dimensions exactly. */
      if (svg) {
        setStyle(svg, 'width', '22px', 'important');
        setStyle(svg, 'height', '27px', 'important');
        setStyle(svg, 'min-width', '22px', 'important');
        setStyle(svg, 'min-height', '27px', 'important');
        setStyle(svg, 'max-width', '22px', 'important');
        setStyle(svg, 'max-height', '27px', 'important');
        setStyle(svg, 'flex', '0 0 22px', 'important');
      }

      /*
       * Apply only typography captured before our stylesheet existed. Never
       * disable #floatingMenuStyle here. That old first-open measurement was
       * the Resources-only path capable of restyling/reflowing the whole menu.
       */
      if (text) {
        if (nativeResourcePdfTextMetrics.fontSize) {
          setStyle(
            text,
            'font-size',
            nativeResourcePdfTextMetrics.fontSize,
            'important'
          );
        }

        if (nativeResourcePdfTextMetrics.lineHeight) {
          setStyle(
            text,
            'line-height',
            nativeResourcePdfTextMetrics.lineHeight,
            'important'
          );
        }
      }
    });

    console.log('[Floating Menu] Resources PDF icon normalized without disabling Floating Menu CSS.', {
      svg: '22x27',
      nativeFontSize: nativeResourcePdfTextMetrics.fontSize || 'Storyline native CSS',
      nativeLineHeight: nativeResourcePdfTextMetrics.lineHeight || 'Storyline native CSS'
    });
  }

  function parseRgbColor(value) {
    var m = String(value || '').match(/rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)(?:\s*,\s*(\d+(?:\.\d+)?))?\s*\)/i);
    if (!m) return null;
    return {
      r: parseFloat(m[1]),
      g: parseFloat(m[2]),
      b: parseFloat(m[3]),
      a: m[4] === undefined ? 1 : parseFloat(m[4]),
      css: value
    };
  }

  function isUsefulSeekGreen(value) {
    var c = parseRgbColor(value);
    if (!c || c.a < 0.15) return false;
    /* Prefer the existing dark green/teal seek color and reject white/gray. */
    var max = Math.max(c.r, c.g, c.b);
    var min = Math.min(c.r, c.g, c.b);
    var saturation = max - min;
    var luminance = (c.r + c.g + c.b) / 3;
    return c.g >= c.r && c.g >= c.b && saturation >= 18 && luminance < 190;
  }

  function getFloatingSeekbarGreen() {
    var seek = document.getElementById('seek');
    if (!seek) return '#12544F';

    var nodes = [seek].concat([].slice.call(seek.querySelectorAll('*')));
    var props = ['backgroundColor', 'borderTopColor', 'borderRightColor', 'color'];

    for (var i = 0; i < nodes.length; i++) {
      var node = nodes[i];
      var styles = [];
      try {
        styles.push(getComputedStyle(node));
        styles.push(getComputedStyle(node, '::before'));
        styles.push(getComputedStyle(node, '::after'));
      } catch (e) {}

      for (var si = 0; si < styles.length; si++) {
        var cs = styles[si];
        if (!cs) continue;
        for (var pi = 0; pi < props.length; pi++) {
          var candidate = cs[props[pi]];
          if (isUsefulSeekGreen(candidate)) {
            return candidate;
          }
        }
      }
    }

    return '#12544F';
  }

  function applyTranscriptScrollbarAppearance(nativeScroller) {
    if (!nativeScroller) return;

    var seekGreen = getFloatingSeekbarGreen();
    nativeScroller.classList.add('fm-transcript-native-scroller');
    setStyle(nativeScroller, '--fm-transcript-scrollbar-color', seekGreen);
    setStyle(nativeScroller, 'direction', 'ltr', 'important');

    console.log('[Floating Menu] Transcript native scrollbar positioned right; seekbar color:', seekGreen);
  }

  function configurePanelScrolling(key, shell) {
    if (!shell || !shell.content) return;

    var content = shell.content;

    expandPanelContentToFullWidth(shell);

    if (key === 'resources') {
      restoreResourcePdfIconSizing(content);
    }

    if (key === 'transcript') {
      setStyle(content, 'overflow', 'hidden', 'important');
      setStyle(content, 'padding', '0', 'important');

      var nativeScroller = findBestScrollableDescendant(content);

      if (nativeScroller) {
        setStyle(nativeScroller, 'box-sizing', 'border-box', 'important');
        // Force the one native Transcript scrollbar to the popup's far right
        // and match the current floating seekbar's dark-green color.
        applyTranscriptScrollbarAppearance(nativeScroller);
        setStyle(nativeScroller, 'width', '100%', 'important');
        setStyle(nativeScroller, 'max-width', 'none', 'important');
        setStyle(nativeScroller, 'min-width', '0', 'important');
        setStyle(nativeScroller, 'height', '100%', 'important');
        setStyle(nativeScroller, 'max-height', '100%', 'important');
        content.setAttribute('data-fm-native-scroll-found', 'true');
      } else {
        content.removeAttribute('data-fm-native-scroll-found');
      }

      return;
    }

    setStyle(content, 'overflow-y', 'auto', 'important');
    setStyle(content, 'overflow-x', 'hidden', 'important');

    /* Menu/Glossary/Resources should have one scrollbar only. Storyline can
       insert its own nested scrolling divs, so expand those divs and let the
       shared content shell own scrolling instead. */
    neutralizeNestedScrollers(content);
  }

  function moveCloseControlToHeader(header, content) {
    if (!header || !content) return;

    var close = content.querySelector(
      '[aria-label="Close"], [aria-label^="Close "], ' +
      '.panel-close, .close-button, [data-ref="close"], [data-ref="closeButton"]'
    );

    if (!close || header.contains(close)) return;

    close.classList.add('fm-popup-close');
    header.appendChild(close);
  }

  function ensurePanelShell(key, panel) {
    var title = PANEL_TITLES[key];
    if (!title || !panel) return null;

    capturePanelOriginalHeight(key, panel);

    var header = panel.querySelector(
      ':scope > .fm-popup-header[data-fm-panel-header="' + key + '"]'
    );

    var content = panel.querySelector(
      ':scope > .fm-native-panel-content[data-fm-panel-content="' + key + '"]'
    );

    if (!header || !content) {
      panelShellBusy = true;

      var originalNodes = [].slice.call(panel.childNodes);

      header = document.createElement('div');
      header.className = 'fm-popup-header';
      header.setAttribute('data-fm-panel-header', key);

      var titleEl = document.createElement('div');
      titleEl.className = 'fm-popup-title';
      titleEl.setAttribute('role', 'heading');
      titleEl.setAttribute('aria-level', '2');
      titleEl.textContent = title;
      header.appendChild(titleEl);

      content = document.createElement('div');
      content.className = 'fm-native-panel-content';
      content.setAttribute('data-fm-panel-content', key);

      originalNodes.forEach(function (node) {
        content.appendChild(node);
      });

      panel.appendChild(header);
      panel.appendChild(content);
      panelShellBusy = false;
    }

    /* Storyline can add panel children after first open. Keep them inside the
       body so nothing can appear on top of the fixed header. */
    var looseNodes = [].slice.call(panel.childNodes).filter(function (node) {
      if (node === header || node === content) return false;
      if (
        node.nodeType === 1 &&
        node.classList &&
        node.classList.contains('fm-resize-handle')
      ) {
        return false;
      }
      return true;
    });

    if (looseNodes.length) {
      panelShellBusy = true;
      looseNodes.forEach(function (node) {
        content.appendChild(node);
      });
      panelShellBusy = false;
    }

    var headings = content.querySelectorAll(
      'h1, h2, h3, h4, h5, h6, [role="heading"], .panel-title, .panel-header-title'
    );

    [].slice.call(headings).forEach(function (heading) {
      if (
        heading.textContent &&
        heading.textContent.trim().toLowerCase() === title.toLowerCase()
      ) {
        setStyle(heading, 'display', 'none', 'important');
      }
    });

    moveCloseControlToHeader(header, content);

    var shell = { header: header, content: content };
    ensureDetachControls(key, panel, shell);
    configurePanelScrolling(key, shell);

    return shell;
  }

  var panelObservers = {};

  function isPanelOpen(key) {
    if (isDetachedPanelOpen(key)) return true;

    if (key === 'resources') {
      var resourcePanel = getPanelEl('resources');
      if (!resourcePanel || currentOpenPanelKey !== 'resources') return false;

      try {
        return getComputedStyle(resourcePanel).display !== 'none';
      } catch (e) {
        return true;
      }
    }

    var nativeEl = queryNative(panelSelectorMap[key]);

    return (
      !!nativeEl &&
      nativeEl.getAttribute('aria-expanded') === 'true'
    );
  }

  function positionPanel(key, options) {
    options = options || {};

    var fmBtn = document.querySelector(
      '.floating-menu [data-panel="' + key + '"]'
    );
    var panel = getPanelEl(key);

    if (!panel || !fmBtn) return;
    if (!options.forceOpen && !isPanelOpen(key)) return;

    var detachedState = getDetachedState(key);
    if (detachedState && !detachedState.detached) {
      panel.classList.remove('fm-panel-detached');
    }

    capturePanelOriginalHeight(key, panel);
    capturePanelOriginalWidth(key, panel);
    var panelShell = ensurePanelShell(key, panel);

    if (panel.parentElement !== document.body) {
      document.body.appendChild(panel);
    }

    if (isDetachedPanelOpen(key)) {
      applyDetachedPanelGeometry(key, panel);
      configurePanelScrolling(key, panelShell);
      return;
    }

    var scale = getCurrentStageScale();
    var stageRect = getCurrentStageRect();
    var menuRect = getFloatingMenuPopupRect();
    var btnRect = fmBtn.getBoundingClientRect();
    var gapVisual = 12 * scale;

    var allowedTop = menuRect.top;
    var allowedBottom = menuRect.bottom;

    if (stageRect) {
      allowedTop = Math.max(allowedTop, stageRect.top);
      allowedBottom = Math.min(allowedBottom, stageRect.bottom);
    }

    var availableVisualHeight = Math.max(0, allowedBottom - allowedTop);
    var availableLogicalHeight = availableVisualHeight / scale;
    var fillHeight = !!PANEL_FILL_HEIGHT[key];
    var targetHeightLogical;

    if (fillHeight) {
      targetHeightLogical = availableLogicalHeight;
    } else {
      var naturalTranscriptHeight =
        panelOriginalHeights.transcript ||
        panel.offsetHeight ||
        availableLogicalHeight;

      targetHeightLogical = Math.min(
        Math.max(120, naturalTranscriptHeight),
        availableLogicalHeight
      );
    }

    var basePanelWidthLogical = panelOriginalWidths[key] || panel.offsetWidth || 302;
    var targetPanelWidthLogical = basePanelWidthLogical + POPUP_WIDTH_BONUS;

    if (stageRect) {
      targetPanelWidthLogical = Math.min(
        targetPanelWidthLogical,
        Math.max(220, (stageRect.width / scale) - 24)
      );
    }

    setStyle(panel, 'display', 'flex', 'important');
    setStyle(panel, 'width', targetPanelWidthLogical + 'px', 'important');
    setStyle(panel, 'max-width', targetPanelWidthLogical + 'px', 'important');
    setStyle(panel, 'min-width', '0', 'important');
    expandPanelContentToFullWidth(panelShell);
    setStyle(panel, 'overflow', 'hidden', 'important');
    setStyle(panel, 'height', targetHeightLogical + 'px', 'important');
    setStyle(panel, 'max-height', targetHeightLogical + 'px', 'important');
    setStyle(panel, 'min-height', '0', 'important');
    setStyle(panel, 'pointer-events', 'auto', 'important');
    setStyle(panel, 'transform-origin', 'top left', 'important');
    setStyle(panel, 'transform', 'scale(' + scale + ')', 'important');

    configurePanelScrolling(key, panelShell);

    var panelWidthLogical = targetPanelWidthLogical;
    var panelWidthVisual = panelWidthLogical * scale;
    var panelHeightVisual = targetHeightLogical * scale;

    var left = menuRect.left - panelWidthVisual - gapVisual;
    var top;

    if (fillHeight) {
      top = allowedTop;
    } else {
      top = btnRect.top + ((btnRect.height - panelHeightVisual) / 2);
      top = Math.max(allowedTop, Math.min(top, allowedBottom - panelHeightVisual));
    }

    if (stageRect) {
      left = Math.max(
        stageRect.left + gapVisual,
        Math.min(left, stageRect.right - panelWidthVisual - gapVisual)
      );
    }

    setStyle(panel, 'position', 'fixed', 'important');
    setStyle(panel, 'left', left + 'px', 'important');
    setStyle(panel, 'top', top + 'px', 'important');

    if (options.revealAfterPosition) {
      setStyle(panel, 'visibility', 'visible', 'important');
      setStyle(panel, 'pointer-events', 'auto', 'important');
      console.log('[Floating Menu] Resources popup positioned before reveal', {
        left: left,
        top: top,
        width: targetPanelWidthLogical,
        height: targetHeightLogical
      });
    }

    var arrow = panel.querySelector(
      '.panel-arrow, ' +
      '.panel-down-arrow, ' +
      '[data-ref="arrow"], ' +
      '[data-ref="contentPanelArrow"], ' +
      '[data-ref="settingsPanelArrow"]'
    );

    if (arrow) {
      setStyle(arrow, 'display', 'none', 'important');
    }
  }

  function watchPanel(key) {
    var panel = getPanelEl(key);
    if (!panel) return;

    if (panel !== cachedPanelEls['__observed_' + key]) {
      cachedPanelEls['__observed_' + key] = panel;

      if (panelObservers[key]) {
        panelObservers[key].disconnect();
      }

      // Observe only structural additions at the panel root. Watching style/class
      // here caused our own positioning writes to schedule more positioning work.
      panelObservers[key] = new MutationObserver(function () {
        console.log('[Floating Menu] MutationObserver triggered', { observer: 'panel', key: key });
        if (panelShellBusy || !isPanelOpen(key)) return;
        ensurePanelShell(key, panel);
        positionPanel(key);
      });

      panelObservers[key].observe(panel, {
        childList: true,
        subtree: false
      });
    }

    if (isPanelOpen(key)) {
      ensurePanelShell(key, panel);
      positionPanel(key);
    }
  }

  function syncScaledFloatingUi() {
    /* During Slide Master re-entry, this function must also be safe if a
       refresh request lands before every later var assignment has completed. */
    var safePanelMap = (typeof PANEL_SELECTOR_MAP === 'object' && PANEL_SELECTOR_MAP)
      ? PANEL_SELECTOR_MAP
      : {};

    // Native Storyline panels.
    Object.keys(safePanelMap).forEach(function (key) {
      if (isPanelOpen(key)) positionPanel(key);
    });

    // Custom Playback Speed / Settings popups.
    if (typeof speedDropdownEl !== 'undefined' && speedDropdownEl &&
        getComputedStyle(speedDropdownEl).display !== 'none') {
      var speedBtn = document.querySelector('.floating-menu [data-panel="speed"]');
      if (speedBtn) positionCustomDropdown(speedDropdownEl, speedBtn);
    }

    if (typeof settingsDropdownEl !== 'undefined' && settingsDropdownEl &&
        getComputedStyle(settingsDropdownEl).display !== 'none') {
      var settingsBtn = document.querySelector('.floating-menu [data-panel="settings"]');
      if (settingsBtn) positionCustomDropdown(settingsDropdownEl, settingsBtn);
    }

    // Detached panels retain logical slide-space geometry and are reprojected
    // whenever the Storyline stage scale changes.
    var safeDetachedStates = (typeof detachedPanelState === 'object' && detachedPanelState)
      ? detachedPanelState
      : {};

    Object.keys(safeDetachedStates).forEach(function (key) {
      var state = safeDetachedStates[key];
      if (!state || !state.detached || !state.open) return;
      var panel = getPanelEl(key);
      if (panel) applyDetachedPanelGeometry(key, panel);
    });

    if (activeTooltipControl && globalTooltipEl.classList.contains('fm-show')) {
      positionGlobalTooltip(activeTooltipControl);
    }
  }

  Object.keys(PANEL_SELECTOR_MAP).forEach(function (key) {
    watchPanel(key);
  });

  // No permanent 300 ms panel scan. Panels are refreshed on button activation,
  // their own child mutations, and the shared Storyline layout observer.

  // =========================================================
  // 7. STATIONARY ARROW TOGGLE AND EXPAND / COLLAPSE
  // =========================================================

  var TOGGLE_LOCK_MS = 320;
  var toggleLocked = false;

  /*
   * Intentionally no stagger/transform on child controls.
   * Container-only expand/collapse keeps every icon on a fixed center line.
   */
  function setChildStagger() {}

  function setMenuOpen(open) {
    if (toggleLocked) return;

    hideGlobalTooltip();

    toggleLocked = true;

    setTimeout(function () {
      toggleLocked = false;
    }, TOGGLE_LOCK_MS);

    positionFloatingMenu('Floating Menu expand/collapse');

    menuOpen = open;

    arrowEl.classList.toggle('fm-open', open);

    arrowEl.setAttribute(
      'aria-expanded',
      open ? 'true' : 'false'
    );

    if (open) {
      // CC is deliberately absent from these panel maps.
      closeAllPanelsExcept(null);

      setChildStagger(true);

      floatingMenuEl.removeAttribute('inert');
      floatingMenuEl.setAttribute('aria-hidden', 'false');

      // Expanded height comes from --fm-height.
      floatingMenuEl.classList.remove('fm-collapsed');
    } else {
      if (floatingMenuEl.contains(document.activeElement)) {
        arrowEl.focus();
      }

      setChildStagger(false);

      floatingMenuEl.setAttribute('inert', '');
      floatingMenuEl.setAttribute('aria-hidden', 'true');

      // CSS sets height:0 without an inline height overriding it.
      floatingMenuEl.classList.add('fm-collapsed');
    }
  }

  arrowEl.addEventListener('click', function () {
    setMenuOpen(!menuOpen);
  });

  // =========================================================
  // 8. ORIGINAL BOTTOM-BAR CLEANUP AND PLAYBACK LAYOUT
  // =========================================================

  var RESCUE_BEFORE_REMOVE = {
    'misc-controls': [
      'captions',
      'playback-speed',
      'settings'
    ],
    'nav-controls': [
      'full-screen-toggle',
      'prev',
      'next',
      'submit'
    ]
  };

  function removeExtraBottomBarContainers() {
    Object.keys(RESCUE_BEFORE_REMOVE).forEach(function (containerId) {
      var container = document.getElementById(containerId);

      if (!container) return;

      RESCUE_BEFORE_REMOVE[containerId].forEach(function (childId) {
        var child = document.getElementById(childId);

        if (child && container.contains(child)) {
          document.body.appendChild(child);
        }
      });

      container.remove();
    });
  }

  var PLAYBACK_CONTROLS_ID = 'playback-controls';
  var PLAYBACK_CONTROLS_MARGIN = 10;

  function fitPlaybackControlsToBottomBar() {
    var bottomBar = findBottomBarEl();

    var playbackControls = document.getElementById(
      PLAYBACK_CONTROLS_ID
    );

    if (
      !bottomBar ||
      !playbackControls ||
      bottomBar === playbackControls ||
      !bottomBar.contains(playbackControls)
    ) {
      return;
    }

    // Use logical, pre-transform dimensions.
    var widthStyle = bottomBar.style.width;

    var bottomBarWidth = /px$/.test(widthStyle)
      ? parseFloat(widthStyle)
      : bottomBar.clientWidth;

    if (!bottomBarWidth) return;

    var newWidth = Math.max(
      0,
      bottomBarWidth - (PLAYBACK_CONTROLS_MARGIN * 2)
    );

    setStyle(
      playbackControls,
      'width',
      newWidth + 'px',
      'important'
    );

    setStyle(
      playbackControls,
      'transform',
      'translate(' + PLAYBACK_CONTROLS_MARGIN + 'px, 0px)',
      'important'
    );

    var seek = playbackControls.querySelector('#seek');
    var resetBtn = playbackControls.querySelector('#reset');

    if (seek && resetBtn) {
      var seekLeft = 44;
      var replayWidth = 30;

      var newSeekWidth = Math.max(
        0,
        newWidth -
          seekLeft -
          replayWidth -
          PLAYBACK_CONTROLS_MARGIN
      );

      setStyle(
        seek,
        'width',
        newSeekWidth + 'px',
        'important'
      );

      setStyle(
        resetBtn,
        'transform',
        'translate(' +
          (
            seekLeft +
            newSeekWidth +
            PLAYBACK_CONTROLS_MARGIN
          ) +
          'px, 18px)',
        'important'
      );
    }
  }

  removeExtraBottomBarContainers();
  fitPlaybackControlsToBottomBar();

  var bottomBarEl = findBottomBarEl();

  if (bottomBarEl) {
    var bottomBarObserver = new MutationObserver(function () {
      console.log('[Floating Menu] MutationObserver triggered', { observer: 'bottomBar' });
      removeExtraBottomBarContainers();
      fitPlaybackControlsToBottomBar();
      scheduleLayout('bottomBar MutationObserver');
    });

    bottomBarObserver.observe(bottomBarEl, {
      childList: true,
      attributes: true,
      attributeFilter: ['style']
    });
  }

  window.addEventListener(
    'resize',
    fitPlaybackControlsToBottomBar
  );

  setInterval(function () {
    removeExtraBottomBarContainers();
    fitPlaybackControlsToBottomBar();
  }, 100);

  // =========================================================
  // 9. RESPONSIVE LAYOUT OBSERVERS
  // =========================================================

  function isManagedFloatingUiNode(node) {
    if (!node || node.nodeType !== 1) return false;

    if (node === fmRoot || fmRoot.contains(node)) return true;
    if (node === globalTooltipEl) return true;

    if (node.matches && node.matches(
      '#outline-panel, #transcript-panel, #glossary-panel, #resources-panel, .fm-dropdown'
    )) {
      return true;
    }

    if (node.closest && node.closest(
      '#outline-panel, #transcript-panel, #glossary-panel, #resources-panel, .fm-dropdown'
    )) {
      return true;
    }

    return false;
  }

  function isManagedFloatingUiMutation(record) {
    if (!record) return false;
    if (isManagedFloatingUiNode(record.target)) return true;

    if (record.type === 'childList') {
      var changedNodes = [].slice.call(record.addedNodes || [])
        .concat([].slice.call(record.removedNodes || []))
        .filter(function (node) { return node && node.nodeType === 1; });

      if (changedNodes.length && changedNodes.every(isManagedFloatingUiNode)) {
        return true;
      }
    }

    return false;
  }

  if (window.ResizeObserver) {
    layoutResizeObserver = new ResizeObserver(function (entries) {
      console.log('[Floating Menu] ResizeObserver triggered', {
        entries: entries ? entries.length : 0
      });
      scheduleLayout('ResizeObserver');
    });
  }

  layoutAttributeObserver = new MutationObserver(function (records) {
    console.log('[Floating Menu] MutationObserver triggered', {
      observer: 'layoutAttribute',
      records: records ? records.length : 0
    });
    scheduleLayout('layoutAttribute MutationObserver');
  });

  var layoutTreeObserver = new MutationObserver(function (records) {
    console.log('[Floating Menu] MutationObserver triggered', {
      observer: 'layoutTree',
      records: records ? records.length : 0
    });

    var externalChange = records.some(function (record) {
      return !isManagedFloatingUiMutation(record);
    });

    if (externalChange) {
      scheduleLayout('layoutTree external DOM mutation');
    } else {
      console.log('[Floating Menu] Managed popup/menu DOM mutation ignored for Floating Menu layout.');
    }
  });

  layoutTreeObserver.observe(document.body, {
    childList: true,
    subtree: true
  });

  window.addEventListener('resize', function () { scheduleLayout('window resize'); });
  window.addEventListener('orientationchange', function () { scheduleLayout('orientationchange'); });

  // Optional hook for outer preview wrappers. This only requests a new
  // .acc-blocker measurement; it never scales #fmRoot, #floatingMenu, or #fmArrow.
  window.addEventListener('floating-menu-layout', function () { scheduleLayout('floating-menu-layout event'); });

  document.addEventListener(
    'fullscreenchange',
    function () { scheduleLayout('fullscreenchange'); }
  );

  document.addEventListener(
    'scroll',
    function () { scheduleLayout('document scroll'); },
    true
  );

  if (window.visualViewport) {
    window.visualViewport.addEventListener(
      'resize',
      function () { scheduleLayout('visualViewport resize'); }
    );

    window.visualViewport.addEventListener(
      'scroll',
      function () { scheduleLayout('visualViewport scroll'); }
    );
  }

  /* All functions/state required by fmRefresh() now exist. Mark the root ready
     before any late Slide Master trigger can attempt a refresh. */
  fmRoot.__fmInitializationComplete = true;
  console.log('[Floating Menu] Initialization complete; persistent root ready.');

  /* Preserve the existing dark-teal treatment until the first reliable
     sample has been collected. */
  applyAdaptiveContrastMode('light');

  positionFloatingMenu('initial layout');
  scheduleAdaptiveContrast(true);

  setTimeout(function () { scheduleLayout('initial 300ms settle'); }, 300);
  setTimeout(function () {
    scheduleLayout('initial 1000ms settle');
    scheduleAdaptiveContrast(true);
  }, 1000);

  // No permanent 250ms Floating Menu layout loop. Real geometry changes are
  // handled by ResizeObserver/MutationObserver/window/viewport events. This
  // prevents popup-only DOM activity (especially Resources) from repeatedly
  // re-running the Floating Menu positioning path.
})();
}

};
