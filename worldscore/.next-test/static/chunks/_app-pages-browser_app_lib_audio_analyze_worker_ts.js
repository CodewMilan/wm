/*
 * ATTENTION: An "eval-source-map" devtool has been used.
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file with attached SourceMaps in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	// runtime can't be in strict mode because a global variable is assign and maybe created.
/******/ 	var __webpack_modules__ = ({

/***/ "(app-pages-browser)/./app/lib/audio/analyze.ts":
/*!**********************************!*\
  !*** ./app/lib/audio/analyze.ts ***!
  \**********************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   TEXTURE_HZ: () => (/* binding */ TEXTURE_HZ),\n/* harmony export */   analyzePcm: () => (/* binding */ analyzePcm)\n/* harmony export */ });\n/* harmony import */ var _dsp__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./dsp */ \"(app-pages-browser)/./app/lib/audio/dsp.ts\");\n\n/** Texture frames per second — the resolution structure detection works at. */ const TEXTURE_HZ = 4;\n/** Half-width of the novelty comparison window, in texture frames. */ const NOVELTY_WINDOW = 20;\n/** Minimum musical distance between two section boundaries. */ const MIN_SECTION_MS = 9000;\n/**\n * Half-width of the window harmony is read over, in texture frames. A quarter\n * of a second of audio can't tell you a key — two seconds either side can, and\n * it also stops the season flickering on every passing chord.\n */ const HARMONY_WINDOW = 8;\n/** Below this correlation the track has no key worth naming, so don't claim one. */ const KEY_CONFIDENCE_FLOOR = 0.2;\n/** Average a frame-rate series down onto the texture grid. */ function toTexture(src, fps, textureCount) {\n    const out = new Float32Array(textureCount);\n    const per = fps / TEXTURE_HZ;\n    for(let t = 0; t < textureCount; t++){\n        out[t] = (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.mean)(src, Math.floor(t * per), Math.min(src.length, Math.floor((t + 1) * per)));\n    }\n    return out;\n}\n/** Same reduction as `toTexture`, but for the interleaved 12-bin chroma array. */ function chromaToTexture(chroma, fps, frameCount, textureCount) {\n    const out = new Float32Array(textureCount * 12);\n    const per = fps / TEXTURE_HZ;\n    for(let t = 0; t < textureCount; t++){\n        const from = Math.floor(t * per);\n        const to = Math.min(frameCount, Math.floor((t + 1) * per));\n        const n = Math.max(1, to - from);\n        const off = t * 12;\n        for(let f = from; f < to; f++){\n            const src = f * 12;\n            for(let c = 0; c < 12; c++)out[off + c] += chroma[src + c];\n        }\n        for(let c = 0; c < 12; c++)out[off + c] /= n;\n    }\n    return out;\n}\n/** Shortest signed distance between two pitch classes, -6..6. */ function semitoneDistance(from, to) {\n    let d = (to - from) % 12;\n    if (d > 6) d -= 12;\n    if (d < -6) d += 12;\n    return d;\n}\n/**\n * Cosine distance alone is scale-invariant, so a section that just gets louder\n * with the same spectral shape — a verse dropping into a chorus — scores zero.\n * Blending in a magnitude-sensitive term catches both timbral changes and pure\n * dynamic ones, which is most of what section boundaries actually are.\n */ function featureDistance(a, b) {\n    let dot = 0;\n    let na = 0;\n    let nb = 0;\n    let sq = 0;\n    for(let i = 0; i < a.length; i++){\n        dot += a[i] * b[i];\n        na += a[i] * a[i];\n        nb += b[i] * b[i];\n        sq += (a[i] - b[i]) ** 2;\n    }\n    const cosine = na === 0 || nb === 0 ? 0 : 1 - dot / (Math.sqrt(na) * Math.sqrt(nb));\n    const euclidean = Math.sqrt(sq / a.length);\n    return 0.45 * cosine + 0.55 * Math.min(1, euclidean);\n}\n/**\n * Novelty curve over a multi-band texture. For each point we compare the mean\n * feature vector of the window before it against the window after it; a large\n * cosine distance means the track just changed character. This is a cheap\n * stand-in for a full self-similarity checkerboard and holds up well on the\n * 9s+ boundaries we actually care about.\n */ function noveltyCurve(bands, count) {\n    const novelty = new Float32Array(count);\n    for(let t = 0; t < count; t++){\n        const from = Math.max(0, t - NOVELTY_WINDOW);\n        const to = Math.min(count, t + NOVELTY_WINDOW);\n        if (t - from < 3 || to - t < 3) continue;\n        const before = bands.map((b)=>(0,_dsp__WEBPACK_IMPORTED_MODULE_0__.mean)(b, from, t));\n        const after = bands.map((b)=>(0,_dsp__WEBPACK_IMPORTED_MODULE_0__.mean)(b, t, to));\n        novelty[t] = featureDistance(before, after);\n    }\n    return novelty;\n}\nfunction pickPeaks(novelty, minGapFrames) {\n    const avg = (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.mean)(novelty);\n    let variance = 0;\n    for(let i = 0; i < novelty.length; i++)variance += (novelty[i] - avg) ** 2;\n    const std = Math.sqrt(variance / Math.max(1, novelty.length));\n    const threshold = avg + std * 0.35;\n    const candidates = [];\n    for(let t = 1; t < novelty.length - 1; t++){\n        if (novelty[t] < threshold) continue;\n        if (novelty[t] < novelty[t - 1] || novelty[t] < novelty[t + 1]) continue;\n        candidates.push({\n            index: t,\n            value: novelty[t]\n        });\n    }\n    // Greedy: strongest peaks win, weaker ones inside the exclusion zone drop.\n    candidates.sort((a, b)=>b.value - a.value);\n    const kept = [];\n    for (const c of candidates){\n        if (kept.every((k)=>Math.abs(k - c.index) >= minGapFrames)) kept.push(c.index);\n    }\n    return kept.sort((a, b)=>a - b);\n}\n/**\n * Assign musical roles from relative energy and position. This is deliberately\n * interpretable rather than clever: the spec asks for believable mapping we can\n * debug, not a music-information-retrieval paper.\n */ function labelSections(bounds, energy, brightness, register, majorness, tension) {\n    const raw = bounds.slice(0, -1).map((startT, i)=>{\n        const endT = bounds[i + 1];\n        return {\n            startT,\n            endT,\n            energy: (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.mean)(energy, startT, endT),\n            brightness: (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.mean)(brightness, startT, endT),\n            register: (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.mean)(register, startT, endT),\n            majorness: (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.mean)(majorness, startT, endT),\n            tension: (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.mean)(tension, startT, endT)\n        };\n    });\n    if (raw.length === 0) return [];\n    const energies = raw.map((s)=>s.energy).sort((a, b)=>a - b);\n    const loud = energies[Math.floor(energies.length * 0.7)];\n    const quiet = energies[Math.floor(energies.length * 0.3)];\n    return raw.map((s, i)=>{\n        const startMs = s.startT / TEXTURE_HZ * 1000;\n        const endMs = s.endT / TEXTURE_HZ * 1000;\n        const isFirst = i === 0;\n        const isLast = i === raw.length - 1;\n        const prev = raw[i - 1];\n        const next = raw[i + 1];\n        // A sharp jump up in energy from the previous section reads as a drop.\n        const jump = prev ? s.energy - prev.energy : 0;\n        const isImpact = jump > 0.18;\n        let role;\n        if (isFirst && s.energy <= loud) role = \"intro\";\n        else if (isLast && s.energy < loud) role = \"outro\";\n        else if (s.energy >= loud && isImpact) role = \"drop\";\n        else if (s.energy >= loud) role = \"chorus\";\n        else if (s.energy <= quiet && !isFirst && !isLast) role = \"breakdown\";\n        else if (next && next.energy - s.energy > 0.15) role = \"build\";\n        else if (prev && next && s.brightness > prev.brightness + 0.15) role = \"bridge\";\n        else role = \"verse\";\n        return {\n            startMs,\n            endMs,\n            role,\n            energy: s.energy,\n            brightness: s.brightness,\n            isImpact,\n            register: s.register,\n            majorness: s.majorness,\n            tension: s.tension\n        };\n    });\n}\nfunction deriveMoodTags(bpm, brightness, energy, dynamicRange, lowEnd, mode, tension, register) {\n    const tags = [];\n    if (bpm < 85) tags.push(\"slow\", \"spacious\");\n    else if (bpm < 110) tags.push(\"mid-tempo\", \"loping\");\n    else if (bpm < 140) tags.push(\"driving\");\n    else tags.push(\"fast\", \"urgent\");\n    if (brightness < 0.35) tags.push(\"dark\", \"murky\");\n    else if (brightness > 0.65) tags.push(\"bright\", \"airy\");\n    else tags.push(\"warm\");\n    if (energy > 0.65) tags.push(\"dense\", \"powerful\");\n    else if (energy < 0.35) tags.push(\"sparse\", \"intimate\");\n    if (dynamicRange > 0.5) tags.push(\"dynamic\", \"cinematic\");\n    else tags.push(\"compressed\", \"hypnotic\");\n    if (lowEnd > 0.6) tags.push(\"bass-heavy\", \"physical\");\n    tags.push(mode === \"minor\" ? \"melancholic\" : \"resolved\");\n    if (tension > 0.55) tags.push(\"unresolved\", \"restless\");\n    else if (tension < 0.3) tags.push(\"consonant\", \"settled\");\n    if (register < 40) tags.push(\"subterranean\");\n    else if (register > 62) tags.push(\"high-register\", \"weightless\");\n    return tags;\n}\n/**\n * Both grids start at zero and run at `TEXTURE_HZ`, so conforming is a clamp\n * rather than a resample. Frames past the end repeat the last known harmony,\n * which is what a reverb tail is actually doing anyway.\n */ function conform(src, count, stride) {\n    const out = new Float32Array(count * stride);\n    const srcCount = Math.floor(src.length / stride);\n    if (srcCount === 0) return out;\n    for(let t = 0; t < count; t++){\n        const s = Math.min(srcCount - 1, t);\n        for(let k = 0; k < stride; k++)out[t * stride + k] = src[s * stride + k];\n    }\n    return out;\n}\nfunction analyzePcm(pcm, sampleRate, override) {\n    const frames = (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.computeFrames)(pcm, sampleRate);\n    const durationMs = pcm.length / sampleRate * 1000;\n    const estimated = (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.estimateTempo)(frames.flux, frames.fps);\n    const tempo = override ? {\n        bpm: override.bpm,\n        phaseFrames: override.beatPhaseMs / 1000 * frames.fps\n    } : estimated;\n    // Centroid is in Hz and spans orders of magnitude, so a few noisy-hat frames\n    // would otherwise squash the whole track toward zero. Compress it first.\n    const logCentroid = new Float32Array(frames.centroid.length);\n    for(let i = 0; i < frames.centroid.length; i++){\n        logCentroid[i] = Math.log2(1 + frames.centroid[i]);\n    }\n    const energyN = (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.normalise)((0,_dsp__WEBPACK_IMPORTED_MODULE_0__.smooth)(frames.rms, 2));\n    const brightN = (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.normalise)((0,_dsp__WEBPACK_IMPORTED_MODULE_0__.smooth)(logCentroid, 2));\n    const lowN = (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.normalise)((0,_dsp__WEBPACK_IMPORTED_MODULE_0__.smooth)(frames.low, 2));\n    const midN = (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.normalise)((0,_dsp__WEBPACK_IMPORTED_MODULE_0__.smooth)(frames.mid, 2));\n    const highN = (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.normalise)((0,_dsp__WEBPACK_IMPORTED_MODULE_0__.smooth)(frames.high, 2));\n    const textureCount = Math.max(1, Math.floor(durationMs / 1000 * TEXTURE_HZ));\n    const tEnergy = toTexture(energyN, frames.fps, textureCount);\n    const tBright = toTexture(brightN, frames.fps, textureCount);\n    const tLow = toTexture(lowN, frames.fps, textureCount);\n    const tMid = toTexture(midN, frames.fps, textureCount);\n    const tHigh = toTexture(highN, frames.fps, textureCount);\n    // Absolute pitch in MIDI numbers, before normalising: a genuinely bass-heavy\n    // track should read heavy overall, not merely heavy relative to its own\n    // brightest moment.\n    const pitchMidi = override ? conform(override.pitch, textureCount, 1) : toTexture(frames.pitch, frames.fps, textureCount);\n    const tRegister = (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.normalise)((0,_dsp__WEBPACK_IMPORTED_MODULE_0__.smooth)(pitchMidi, 2));\n    // Harmony is read over a sliding window rather than per texture frame, so a\n    // passing chord can't yank the season around. Both curves come off the same\n    // averaged profile, which keeps them consistent with each other.\n    const tChroma = override ? conform(override.chroma, textureCount, 12) : chromaToTexture(frames.chroma, frames.fps, frames.count, textureCount);\n    const tMajorness = new Float32Array(textureCount);\n    const tTension = new Float32Array(textureCount);\n    for(let t = 0; t < textureCount; t++){\n        const from = Math.max(0, t - HARMONY_WINDOW);\n        const to = Math.min(textureCount, t + HARMONY_WINDOW + 1);\n        const profile = (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.meanChroma)(tChroma, from, to);\n        // detectKey returns -1..1; the curves are 0..1 like every other curve here.\n        tMajorness[t] = ((0,_dsp__WEBPACK_IMPORTED_MODULE_0__.detectKey)(profile).majorness + 1) / 2;\n        tTension[t] = (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.dissonance)(profile);\n    }\n    const novelty = noveltyCurve([\n        tEnergy,\n        tBright,\n        tLow,\n        tMid,\n        tHigh\n    ], textureCount);\n    const minGap = Math.round(MIN_SECTION_MS / 1000 * TEXTURE_HZ);\n    const peaks = pickPeaks(novelty, minGap);\n    const bounds = [\n        0,\n        ...peaks,\n        textureCount\n    ].filter((v, i, arr)=>i === 0 || v - arr[i - 1] >= Math.min(minGap, 4));\n    if (bounds[bounds.length - 1] !== textureCount) bounds.push(textureCount);\n    const sections = labelSections(bounds, tEnergy, tBright, tRegister, tMajorness, tTension);\n    const meanEnergy = (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.mean)(tEnergy);\n    const meanBrightness = (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.mean)(tBright);\n    const sortedEnergy = Array.from(tEnergy).sort((a, b)=>a - b);\n    const dynamicRange = sortedEnergy[Math.floor(sortedEnergy.length * 0.9)] - sortedEnergy[Math.floor(sortedEnergy.length * 0.1)];\n    const lowEnd = (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.mean)(tLow);\n    const key = (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.detectKey)((0,_dsp__WEBPACK_IMPORTED_MODULE_0__.meanChroma)(tChroma, 0, textureCount));\n    // A modulation is the loudest event a piece of music can hand us, so it gets\n    // detected per section rather than per frame — we want the ones that stick.\n    const keyChanges = [];\n    let previous = key;\n    for (const section of sections){\n        const from = Math.floor(section.startMs / 1000 * TEXTURE_HZ);\n        const to = Math.min(textureCount, Math.ceil(section.endMs / 1000 * TEXTURE_HZ));\n        if (to - from < HARMONY_WINDOW) continue;\n        const local = (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.detectKey)((0,_dsp__WEBPACK_IMPORTED_MODULE_0__.meanChroma)(tChroma, from, to));\n        if (local.confidence < KEY_CONFIDENCE_FLOOR) continue;\n        if (local.tonic === previous.tonic && local.mode === previous.mode) continue;\n        keyChanges.push({\n            atMs: section.startMs,\n            from: \"\".concat(previous.tonicName, \" \").concat(previous.mode),\n            to: \"\".concat(local.tonicName, \" \").concat(local.mode),\n            mode: local.mode,\n            semitones: semitoneDistance(previous.tonic, local.tonic)\n        });\n        previous = local;\n    }\n    // Averaged only over frames that actually had pitch in them, or the rests in\n    // a sparse arrangement would drag its register to the floor.\n    let pitchSum = 0;\n    let sounding = 0;\n    for(let t = 0; t < textureCount; t++){\n        if (pitchMidi[t] > 0) {\n            pitchSum += pitchMidi[t];\n            sounding++;\n        }\n    }\n    const meanPitchMidi = sounding > 0 ? pitchSum / sounding : 0;\n    const meanTension = (0,_dsp__WEBPACK_IMPORTED_MODULE_0__.mean)(tTension);\n    return {\n        durationMs,\n        bpm: Math.round(tempo.bpm * 10) / 10,\n        beatMs: 60000 / tempo.bpm,\n        beatPhaseMs: tempo.phaseFrames / frames.fps * 1000,\n        energyCurve: Array.from(tEnergy),\n        brightnessCurve: Array.from(tBright),\n        registerCurve: Array.from(tRegister),\n        majornessCurve: Array.from(tMajorness),\n        tensionCurve: Array.from(tTension),\n        curveHz: TEXTURE_HZ,\n        sections,\n        moodTags: deriveMoodTags(tempo.bpm, meanBrightness, meanEnergy, dynamicRange, lowEnd, key.mode, meanTension, meanPitchMidi),\n        meanEnergy,\n        meanBrightness,\n        dynamicRange,\n        lowEnd,\n        key,\n        keyChanges,\n        meanPitchMidi,\n        meanTension\n    };\n}\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL2FwcC9saWIvYXVkaW8vYW5hbHl6ZS50cyIsIm1hcHBpbmdzIjoiOzs7Ozs7QUFTZTtBQVNmLDZFQUE2RSxHQUN0RSxNQUFNUSxhQUFhLEVBQUU7QUFDNUIsb0VBQW9FLEdBQ3BFLE1BQU1DLGlCQUFpQjtBQUN2Qiw2REFBNkQsR0FDN0QsTUFBTUMsaUJBQWlCO0FBQ3ZCOzs7O0NBSUMsR0FDRCxNQUFNQyxpQkFBaUI7QUFDdkIsa0ZBQWtGLEdBQ2xGLE1BQU1DLHVCQUF1QjtBQUU3Qiw0REFBNEQsR0FDNUQsU0FBU0MsVUFBVUMsR0FBc0IsRUFBRUMsR0FBVyxFQUFFQyxZQUFvQjtJQUMxRSxNQUFNQyxNQUFNLElBQUlDLGFBQWFGO0lBQzdCLE1BQU1HLE1BQU1KLE1BQU1QO0lBQ2xCLElBQUssSUFBSVksSUFBSSxHQUFHQSxJQUFJSixjQUFjSSxJQUFLO1FBQ3JDSCxHQUFHLENBQUNHLEVBQUUsR0FBR2hCLDBDQUFJQSxDQUFDVSxLQUFLTyxLQUFLQyxLQUFLLENBQUNGLElBQUlELE1BQU1FLEtBQUtFLEdBQUcsQ0FBQ1QsSUFBSVUsTUFBTSxFQUFFSCxLQUFLQyxLQUFLLENBQUMsQ0FBQ0YsSUFBSSxLQUFLRDtJQUNwRjtJQUNBLE9BQU9GO0FBQ1Q7QUFFQSxnRkFBZ0YsR0FDaEYsU0FBU1EsZ0JBQ1BDLE1BQW9CLEVBQ3BCWCxHQUFXLEVBQ1hZLFVBQWtCLEVBQ2xCWCxZQUFvQjtJQUVwQixNQUFNQyxNQUFNLElBQUlDLGFBQWFGLGVBQWU7SUFDNUMsTUFBTUcsTUFBTUosTUFBTVA7SUFDbEIsSUFBSyxJQUFJWSxJQUFJLEdBQUdBLElBQUlKLGNBQWNJLElBQUs7UUFDckMsTUFBTVEsT0FBT1AsS0FBS0MsS0FBSyxDQUFDRixJQUFJRDtRQUM1QixNQUFNVSxLQUFLUixLQUFLRSxHQUFHLENBQUNJLFlBQVlOLEtBQUtDLEtBQUssQ0FBQyxDQUFDRixJQUFJLEtBQUtEO1FBQ3JELE1BQU1XLElBQUlULEtBQUtVLEdBQUcsQ0FBQyxHQUFHRixLQUFLRDtRQUMzQixNQUFNSSxNQUFNWixJQUFJO1FBQ2hCLElBQUssSUFBSWEsSUFBSUwsTUFBTUssSUFBSUosSUFBSUksSUFBSztZQUM5QixNQUFNbkIsTUFBTW1CLElBQUk7WUFDaEIsSUFBSyxJQUFJQyxJQUFJLEdBQUdBLElBQUksSUFBSUEsSUFBS2pCLEdBQUcsQ0FBQ2UsTUFBTUUsRUFBRSxJQUFJUixNQUFNLENBQUNaLE1BQU1vQixFQUFFO1FBQzlEO1FBQ0EsSUFBSyxJQUFJQSxJQUFJLEdBQUdBLElBQUksSUFBSUEsSUFBS2pCLEdBQUcsQ0FBQ2UsTUFBTUUsRUFBRSxJQUFJSjtJQUMvQztJQUNBLE9BQU9iO0FBQ1Q7QUFFQSwrREFBK0QsR0FDL0QsU0FBU2tCLGlCQUFpQlAsSUFBWSxFQUFFQyxFQUFVO0lBQ2hELElBQUlPLElBQUksQ0FBQ1AsS0FBS0QsSUFBRyxJQUFLO0lBQ3RCLElBQUlRLElBQUksR0FBR0EsS0FBSztJQUNoQixJQUFJQSxJQUFJLENBQUMsR0FBR0EsS0FBSztJQUNqQixPQUFPQTtBQUNUO0FBRUE7Ozs7O0NBS0MsR0FDRCxTQUFTQyxnQkFBZ0JDLENBQVcsRUFBRUMsQ0FBVztJQUMvQyxJQUFJQyxNQUFNO0lBQ1YsSUFBSUMsS0FBSztJQUNULElBQUlDLEtBQUs7SUFDVCxJQUFJQyxLQUFLO0lBQ1QsSUFBSyxJQUFJQyxJQUFJLEdBQUdBLElBQUlOLEVBQUVkLE1BQU0sRUFBRW9CLElBQUs7UUFDakNKLE9BQU9GLENBQUMsQ0FBQ00sRUFBRSxHQUFHTCxDQUFDLENBQUNLLEVBQUU7UUFDbEJILE1BQU1ILENBQUMsQ0FBQ00sRUFBRSxHQUFHTixDQUFDLENBQUNNLEVBQUU7UUFDakJGLE1BQU1ILENBQUMsQ0FBQ0ssRUFBRSxHQUFHTCxDQUFDLENBQUNLLEVBQUU7UUFDakJELE1BQU0sQ0FBQ0wsQ0FBQyxDQUFDTSxFQUFFLEdBQUdMLENBQUMsQ0FBQ0ssRUFBRSxLQUFLO0lBQ3pCO0lBQ0EsTUFBTUMsU0FBU0osT0FBTyxLQUFLQyxPQUFPLElBQUksSUFBSSxJQUFJRixNQUFPbkIsQ0FBQUEsS0FBS3lCLElBQUksQ0FBQ0wsTUFBTXBCLEtBQUt5QixJQUFJLENBQUNKLEdBQUU7SUFDakYsTUFBTUssWUFBWTFCLEtBQUt5QixJQUFJLENBQUNILEtBQUtMLEVBQUVkLE1BQU07SUFDekMsT0FBTyxPQUFPcUIsU0FBUyxPQUFPeEIsS0FBS0UsR0FBRyxDQUFDLEdBQUd3QjtBQUM1QztBQUVBOzs7Ozs7Q0FNQyxHQUNELFNBQVNDLGFBQWFDLEtBQXFCLEVBQUVDLEtBQWE7SUFDeEQsTUFBTUMsVUFBVSxJQUFJakMsYUFBYWdDO0lBQ2pDLElBQUssSUFBSTlCLElBQUksR0FBR0EsSUFBSThCLE9BQU85QixJQUFLO1FBQzlCLE1BQU1RLE9BQU9QLEtBQUtVLEdBQUcsQ0FBQyxHQUFHWCxJQUFJWDtRQUM3QixNQUFNb0IsS0FBS1IsS0FBS0UsR0FBRyxDQUFDMkIsT0FBTzlCLElBQUlYO1FBQy9CLElBQUlXLElBQUlRLE9BQU8sS0FBS0MsS0FBS1QsSUFBSSxHQUFHO1FBQ2hDLE1BQU1nQyxTQUFTSCxNQUFNSSxHQUFHLENBQUMsQ0FBQ2QsSUFBTW5DLDBDQUFJQSxDQUFDbUMsR0FBR1gsTUFBTVI7UUFDOUMsTUFBTWtDLFFBQVFMLE1BQU1JLEdBQUcsQ0FBQyxDQUFDZCxJQUFNbkMsMENBQUlBLENBQUNtQyxHQUFHbkIsR0FBR1M7UUFDMUNzQixPQUFPLENBQUMvQixFQUFFLEdBQUdpQixnQkFBZ0JlLFFBQVFFO0lBQ3ZDO0lBQ0EsT0FBT0g7QUFDVDtBQUVBLFNBQVNJLFVBQVVKLE9BQXFCLEVBQUVLLFlBQW9CO0lBQzVELE1BQU1DLE1BQU1yRCwwQ0FBSUEsQ0FBQytDO0lBQ2pCLElBQUlPLFdBQVc7SUFDZixJQUFLLElBQUlkLElBQUksR0FBR0EsSUFBSU8sUUFBUTNCLE1BQU0sRUFBRW9CLElBQUtjLFlBQVksQ0FBQ1AsT0FBTyxDQUFDUCxFQUFFLEdBQUdhLEdBQUUsS0FBTTtJQUMzRSxNQUFNRSxNQUFNdEMsS0FBS3lCLElBQUksQ0FBQ1ksV0FBV3JDLEtBQUtVLEdBQUcsQ0FBQyxHQUFHb0IsUUFBUTNCLE1BQU07SUFDM0QsTUFBTW9DLFlBQVlILE1BQU1FLE1BQU07SUFFOUIsTUFBTUUsYUFBaUQsRUFBRTtJQUN6RCxJQUFLLElBQUl6QyxJQUFJLEdBQUdBLElBQUkrQixRQUFRM0IsTUFBTSxHQUFHLEdBQUdKLElBQUs7UUFDM0MsSUFBSStCLE9BQU8sQ0FBQy9CLEVBQUUsR0FBR3dDLFdBQVc7UUFDNUIsSUFBSVQsT0FBTyxDQUFDL0IsRUFBRSxHQUFHK0IsT0FBTyxDQUFDL0IsSUFBSSxFQUFFLElBQUkrQixPQUFPLENBQUMvQixFQUFFLEdBQUcrQixPQUFPLENBQUMvQixJQUFJLEVBQUUsRUFBRTtRQUNoRXlDLFdBQVdDLElBQUksQ0FBQztZQUFFQyxPQUFPM0M7WUFBRzRDLE9BQU9iLE9BQU8sQ0FBQy9CLEVBQUU7UUFBQztJQUNoRDtJQUVBLDJFQUEyRTtJQUMzRXlDLFdBQVdJLElBQUksQ0FBQyxDQUFDM0IsR0FBR0MsSUFBTUEsRUFBRXlCLEtBQUssR0FBRzFCLEVBQUUwQixLQUFLO0lBQzNDLE1BQU1FLE9BQWlCLEVBQUU7SUFDekIsS0FBSyxNQUFNaEMsS0FBSzJCLFdBQVk7UUFDMUIsSUFBSUssS0FBS0MsS0FBSyxDQUFDLENBQUNDLElBQU0vQyxLQUFLZ0QsR0FBRyxDQUFDRCxJQUFJbEMsRUFBRTZCLEtBQUssS0FBS1AsZUFBZVUsS0FBS0osSUFBSSxDQUFDNUIsRUFBRTZCLEtBQUs7SUFDakY7SUFDQSxPQUFPRyxLQUFLRCxJQUFJLENBQUMsQ0FBQzNCLEdBQUdDLElBQU1ELElBQUlDO0FBQ2pDO0FBRUE7Ozs7Q0FJQyxHQUNELFNBQVMrQixjQUNQQyxNQUFnQixFQUNoQkMsTUFBb0IsRUFDcEJDLFVBQXdCLEVBQ3hCQyxRQUFzQixFQUN0QkMsU0FBdUIsRUFDdkJDLE9BQXFCO0lBRXJCLE1BQU1DLE1BQU1OLE9BQU9PLEtBQUssQ0FBQyxHQUFHLENBQUMsR0FBR3pCLEdBQUcsQ0FBQyxDQUFDMEIsUUFBUW5DO1FBQzNDLE1BQU1vQyxPQUFPVCxNQUFNLENBQUMzQixJQUFJLEVBQUU7UUFDMUIsT0FBTztZQUNMbUM7WUFDQUM7WUFDQVIsUUFBUXBFLDBDQUFJQSxDQUFDb0UsUUFBUU8sUUFBUUM7WUFDN0JQLFlBQVlyRSwwQ0FBSUEsQ0FBQ3FFLFlBQVlNLFFBQVFDO1lBQ3JDTixVQUFVdEUsMENBQUlBLENBQUNzRSxVQUFVSyxRQUFRQztZQUNqQ0wsV0FBV3ZFLDBDQUFJQSxDQUFDdUUsV0FBV0ksUUFBUUM7WUFDbkNKLFNBQVN4RSwwQ0FBSUEsQ0FBQ3dFLFNBQVNHLFFBQVFDO1FBQ2pDO0lBQ0Y7SUFFQSxJQUFJSCxJQUFJckQsTUFBTSxLQUFLLEdBQUcsT0FBTyxFQUFFO0lBRS9CLE1BQU15RCxXQUFXSixJQUFJeEIsR0FBRyxDQUFDLENBQUM2QixJQUFNQSxFQUFFVixNQUFNLEVBQUVQLElBQUksQ0FBQyxDQUFDM0IsR0FBR0MsSUFBTUQsSUFBSUM7SUFDN0QsTUFBTTRDLE9BQU9GLFFBQVEsQ0FBQzVELEtBQUtDLEtBQUssQ0FBQzJELFNBQVN6RCxNQUFNLEdBQUcsS0FBSztJQUN4RCxNQUFNNEQsUUFBUUgsUUFBUSxDQUFDNUQsS0FBS0MsS0FBSyxDQUFDMkQsU0FBU3pELE1BQU0sR0FBRyxLQUFLO0lBRXpELE9BQU9xRCxJQUFJeEIsR0FBRyxDQUFDLENBQUM2QixHQUFHdEM7UUFDakIsTUFBTXlDLFVBQVUsRUFBR04sTUFBTSxHQUFHdkUsYUFBYztRQUMxQyxNQUFNOEUsUUFBUSxFQUFHTixJQUFJLEdBQUd4RSxhQUFjO1FBQ3RDLE1BQU0rRSxVQUFVM0MsTUFBTTtRQUN0QixNQUFNNEMsU0FBUzVDLE1BQU1pQyxJQUFJckQsTUFBTSxHQUFHO1FBQ2xDLE1BQU1pRSxPQUFPWixHQUFHLENBQUNqQyxJQUFJLEVBQUU7UUFDdkIsTUFBTThDLE9BQU9iLEdBQUcsQ0FBQ2pDLElBQUksRUFBRTtRQUV2Qix1RUFBdUU7UUFDdkUsTUFBTStDLE9BQU9GLE9BQU9QLEVBQUVWLE1BQU0sR0FBR2lCLEtBQUtqQixNQUFNLEdBQUc7UUFDN0MsTUFBTW9CLFdBQVdELE9BQU87UUFFeEIsSUFBSUU7UUFDSixJQUFJTixXQUFXTCxFQUFFVixNQUFNLElBQUlXLE1BQU1VLE9BQU87YUFDbkMsSUFBSUwsVUFBVU4sRUFBRVYsTUFBTSxHQUFHVyxNQUFNVSxPQUFPO2FBQ3RDLElBQUlYLEVBQUVWLE1BQU0sSUFBSVcsUUFBUVMsVUFBVUMsT0FBTzthQUN6QyxJQUFJWCxFQUFFVixNQUFNLElBQUlXLE1BQU1VLE9BQU87YUFDN0IsSUFBSVgsRUFBRVYsTUFBTSxJQUFJWSxTQUFTLENBQUNHLFdBQVcsQ0FBQ0MsUUFBUUssT0FBTzthQUNyRCxJQUFJSCxRQUFRQSxLQUFLbEIsTUFBTSxHQUFHVSxFQUFFVixNQUFNLEdBQUcsTUFBTXFCLE9BQU87YUFDbEQsSUFBSUosUUFBUUMsUUFBUVIsRUFBRVQsVUFBVSxHQUFHZ0IsS0FBS2hCLFVBQVUsR0FBRyxNQUFNb0IsT0FBTzthQUNsRUEsT0FBTztRQUVaLE9BQU87WUFDTFI7WUFDQUM7WUFDQU87WUFDQXJCLFFBQVFVLEVBQUVWLE1BQU07WUFDaEJDLFlBQVlTLEVBQUVULFVBQVU7WUFDeEJtQjtZQUNBbEIsVUFBVVEsRUFBRVIsUUFBUTtZQUNwQkMsV0FBV08sRUFBRVAsU0FBUztZQUN0QkMsU0FBU00sRUFBRU4sT0FBTztRQUNwQjtJQUNGO0FBQ0Y7QUFFQSxTQUFTa0IsZUFDUEMsR0FBVyxFQUNYdEIsVUFBa0IsRUFDbEJELE1BQWMsRUFDZHdCLFlBQW9CLEVBQ3BCQyxNQUFjLEVBQ2RDLElBQXVCLEVBQ3ZCdEIsT0FBZSxFQUNmRixRQUFnQjtJQUVoQixNQUFNeUIsT0FBaUIsRUFBRTtJQUV6QixJQUFJSixNQUFNLElBQUlJLEtBQUtyQyxJQUFJLENBQUMsUUFBUTtTQUMzQixJQUFJaUMsTUFBTSxLQUFLSSxLQUFLckMsSUFBSSxDQUFDLGFBQWE7U0FDdEMsSUFBSWlDLE1BQU0sS0FBS0ksS0FBS3JDLElBQUksQ0FBQztTQUN6QnFDLEtBQUtyQyxJQUFJLENBQUMsUUFBUTtJQUV2QixJQUFJVyxhQUFhLE1BQU0wQixLQUFLckMsSUFBSSxDQUFDLFFBQVE7U0FDcEMsSUFBSVcsYUFBYSxNQUFNMEIsS0FBS3JDLElBQUksQ0FBQyxVQUFVO1NBQzNDcUMsS0FBS3JDLElBQUksQ0FBQztJQUVmLElBQUlVLFNBQVMsTUFBTTJCLEtBQUtyQyxJQUFJLENBQUMsU0FBUztTQUNqQyxJQUFJVSxTQUFTLE1BQU0yQixLQUFLckMsSUFBSSxDQUFDLFVBQVU7SUFFNUMsSUFBSWtDLGVBQWUsS0FBS0csS0FBS3JDLElBQUksQ0FBQyxXQUFXO1NBQ3hDcUMsS0FBS3JDLElBQUksQ0FBQyxjQUFjO0lBRTdCLElBQUltQyxTQUFTLEtBQUtFLEtBQUtyQyxJQUFJLENBQUMsY0FBYztJQUUxQ3FDLEtBQUtyQyxJQUFJLENBQUNvQyxTQUFTLFVBQVUsZ0JBQWdCO0lBQzdDLElBQUl0QixVQUFVLE1BQU11QixLQUFLckMsSUFBSSxDQUFDLGNBQWM7U0FDdkMsSUFBSWMsVUFBVSxLQUFLdUIsS0FBS3JDLElBQUksQ0FBQyxhQUFhO0lBRS9DLElBQUlZLFdBQVcsSUFBSXlCLEtBQUtyQyxJQUFJLENBQUM7U0FDeEIsSUFBSVksV0FBVyxJQUFJeUIsS0FBS3JDLElBQUksQ0FBQyxpQkFBaUI7SUFFbkQsT0FBT3FDO0FBQ1Q7QUFFQTs7OztDQUlDLEdBQ0QsU0FBU0MsUUFBUXRGLEdBQWlCLEVBQUVvQyxLQUFhLEVBQUVtRCxNQUFjO0lBQy9ELE1BQU1wRixNQUFNLElBQUlDLGFBQWFnQyxRQUFRbUQ7SUFDckMsTUFBTUMsV0FBV2pGLEtBQUtDLEtBQUssQ0FBQ1IsSUFBSVUsTUFBTSxHQUFHNkU7SUFDekMsSUFBSUMsYUFBYSxHQUFHLE9BQU9yRjtJQUUzQixJQUFLLElBQUlHLElBQUksR0FBR0EsSUFBSThCLE9BQU85QixJQUFLO1FBQzlCLE1BQU04RCxJQUFJN0QsS0FBS0UsR0FBRyxDQUFDK0UsV0FBVyxHQUFHbEY7UUFDakMsSUFBSyxJQUFJZ0QsSUFBSSxHQUFHQSxJQUFJaUMsUUFBUWpDLElBQUtuRCxHQUFHLENBQUNHLElBQUlpRixTQUFTakMsRUFBRSxHQUFHdEQsR0FBRyxDQUFDb0UsSUFBSW1CLFNBQVNqQyxFQUFFO0lBQzVFO0lBQ0EsT0FBT25EO0FBQ1Q7QUFFTyxTQUFTc0YsV0FDZEMsR0FBaUIsRUFDakJDLFVBQWtCLEVBQ2xCQyxRQUEyQjtJQUUzQixNQUFNQyxTQUFTM0csbURBQWFBLENBQUN3RyxLQUFLQztJQUNsQyxNQUFNRyxhQUFhLElBQUtwRixNQUFNLEdBQUdpRixhQUFjO0lBRS9DLE1BQU1JLFlBQVkxRyxtREFBYUEsQ0FBQ3dHLE9BQU9HLElBQUksRUFBRUgsT0FBTzVGLEdBQUc7SUFDdkQsTUFBTWdHLFFBQVFMLFdBQ1Y7UUFBRVgsS0FBS1csU0FBU1gsR0FBRztRQUFFaUIsYUFBYSxTQUFVQyxXQUFXLEdBQUcsT0FBUU4sT0FBTzVGLEdBQUc7SUFBQyxJQUM3RThGO0lBRUosNkVBQTZFO0lBQzdFLHlFQUF5RTtJQUN6RSxNQUFNSyxjQUFjLElBQUloRyxhQUFheUYsT0FBT1EsUUFBUSxDQUFDM0YsTUFBTTtJQUMzRCxJQUFLLElBQUlvQixJQUFJLEdBQUdBLElBQUkrRCxPQUFPUSxRQUFRLENBQUMzRixNQUFNLEVBQUVvQixJQUFLO1FBQy9Dc0UsV0FBVyxDQUFDdEUsRUFBRSxHQUFHdkIsS0FBSytGLElBQUksQ0FBQyxJQUFJVCxPQUFPUSxRQUFRLENBQUN2RSxFQUFFO0lBQ25EO0lBRUEsTUFBTXlFLFVBQVUvRywrQ0FBU0EsQ0FBQ0MsNENBQU1BLENBQUNvRyxPQUFPVyxHQUFHLEVBQUU7SUFDN0MsTUFBTUMsVUFBVWpILCtDQUFTQSxDQUFDQyw0Q0FBTUEsQ0FBQzJHLGFBQWE7SUFDOUMsTUFBTU0sT0FBT2xILCtDQUFTQSxDQUFDQyw0Q0FBTUEsQ0FBQ29HLE9BQU9jLEdBQUcsRUFBRTtJQUMxQyxNQUFNQyxPQUFPcEgsK0NBQVNBLENBQUNDLDRDQUFNQSxDQUFDb0csT0FBT2dCLEdBQUcsRUFBRTtJQUMxQyxNQUFNQyxRQUFRdEgsK0NBQVNBLENBQUNDLDRDQUFNQSxDQUFDb0csT0FBT2tCLElBQUksRUFBRTtJQUU1QyxNQUFNN0csZUFBZUssS0FBS1UsR0FBRyxDQUFDLEdBQUdWLEtBQUtDLEtBQUssQ0FBQyxhQUFjLE9BQVFkO0lBQ2xFLE1BQU1zSCxVQUFVakgsVUFBVXdHLFNBQVNWLE9BQU81RixHQUFHLEVBQUVDO0lBQy9DLE1BQU0rRyxVQUFVbEgsVUFBVTBHLFNBQVNaLE9BQU81RixHQUFHLEVBQUVDO0lBQy9DLE1BQU1nSCxPQUFPbkgsVUFBVTJHLE1BQU1iLE9BQU81RixHQUFHLEVBQUVDO0lBQ3pDLE1BQU1pSCxPQUFPcEgsVUFBVTZHLE1BQU1mLE9BQU81RixHQUFHLEVBQUVDO0lBQ3pDLE1BQU1rSCxRQUFRckgsVUFBVStHLE9BQU9qQixPQUFPNUYsR0FBRyxFQUFFQztJQUUzQyw2RUFBNkU7SUFDN0Usd0VBQXdFO0lBQ3hFLG9CQUFvQjtJQUNwQixNQUFNbUgsWUFBWXpCLFdBQ2ROLFFBQVFNLFNBQVMwQixLQUFLLEVBQUVwSCxjQUFjLEtBQ3RDSCxVQUFVOEYsT0FBT3lCLEtBQUssRUFBRXpCLE9BQU81RixHQUFHLEVBQUVDO0lBQ3hDLE1BQU1xSCxZQUFZL0gsK0NBQVNBLENBQUNDLDRDQUFNQSxDQUFDNEgsV0FBVztJQUU5Qyw0RUFBNEU7SUFDNUUsNEVBQTRFO0lBQzVFLGlFQUFpRTtJQUNqRSxNQUFNRyxVQUFVNUIsV0FDWk4sUUFBUU0sU0FBU2hGLE1BQU0sRUFBRVYsY0FBYyxNQUN2Q1MsZ0JBQWdCa0YsT0FBT2pGLE1BQU0sRUFBRWlGLE9BQU81RixHQUFHLEVBQUU0RixPQUFPekQsS0FBSyxFQUFFbEM7SUFDN0QsTUFBTXVILGFBQWEsSUFBSXJILGFBQWFGO0lBQ3BDLE1BQU13SCxXQUFXLElBQUl0SCxhQUFhRjtJQUNsQyxJQUFLLElBQUlJLElBQUksR0FBR0EsSUFBSUosY0FBY0ksSUFBSztRQUNyQyxNQUFNUSxPQUFPUCxLQUFLVSxHQUFHLENBQUMsR0FBR1gsSUFBSVQ7UUFDN0IsTUFBTWtCLEtBQUtSLEtBQUtFLEdBQUcsQ0FBQ1AsY0FBY0ksSUFBSVQsaUJBQWlCO1FBQ3ZELE1BQU04SCxVQUFVcEksZ0RBQVVBLENBQUNpSSxTQUFTMUcsTUFBTUM7UUFDMUMsNEVBQTRFO1FBQzVFMEcsVUFBVSxDQUFDbkgsRUFBRSxHQUFHLENBQUNuQiwrQ0FBU0EsQ0FBQ3dJLFNBQVM5RCxTQUFTLEdBQUcsS0FBSztRQUNyRDZELFFBQVEsQ0FBQ3BILEVBQUUsR0FBR2xCLGdEQUFVQSxDQUFDdUk7SUFDM0I7SUFFQSxNQUFNdEYsVUFBVUgsYUFBYTtRQUFDOEU7UUFBU0M7UUFBU0M7UUFBTUM7UUFBTUM7S0FBTSxFQUFFbEg7SUFDcEUsTUFBTTBILFNBQVNySCxLQUFLc0gsS0FBSyxDQUFDLGlCQUFrQixPQUFRbkk7SUFDcEQsTUFBTW9JLFFBQVFyRixVQUFVSixTQUFTdUY7SUFFakMsTUFBTW5FLFNBQVM7UUFBQztXQUFNcUU7UUFBTzVIO0tBQWEsQ0FBQzZILE1BQU0sQ0FDL0MsQ0FBQ0MsR0FBR2xHLEdBQUdtRyxNQUFRbkcsTUFBTSxLQUFLa0csSUFBSUMsR0FBRyxDQUFDbkcsSUFBSSxFQUFFLElBQUl2QixLQUFLRSxHQUFHLENBQUNtSCxRQUFRO0lBRS9ELElBQUluRSxNQUFNLENBQUNBLE9BQU8vQyxNQUFNLEdBQUcsRUFBRSxLQUFLUixjQUFjdUQsT0FBT1QsSUFBSSxDQUFDOUM7SUFFNUQsTUFBTWdJLFdBQVcxRSxjQUFjQyxRQUFRdUQsU0FBU0MsU0FBU00sV0FBV0UsWUFBWUM7SUFFaEYsTUFBTVMsYUFBYTdJLDBDQUFJQSxDQUFDMEg7SUFDeEIsTUFBTW9CLGlCQUFpQjlJLDBDQUFJQSxDQUFDMkg7SUFDNUIsTUFBTW9CLGVBQWVDLE1BQU14SCxJQUFJLENBQUNrRyxTQUFTN0QsSUFBSSxDQUFDLENBQUMzQixHQUFHQyxJQUFNRCxJQUFJQztJQUM1RCxNQUFNeUQsZUFDSm1ELFlBQVksQ0FBQzlILEtBQUtDLEtBQUssQ0FBQzZILGFBQWEzSCxNQUFNLEdBQUcsS0FBSyxHQUNuRDJILFlBQVksQ0FBQzlILEtBQUtDLEtBQUssQ0FBQzZILGFBQWEzSCxNQUFNLEdBQUcsS0FBSztJQUNyRCxNQUFNeUUsU0FBUzdGLDBDQUFJQSxDQUFDNEg7SUFFcEIsTUFBTXFCLE1BQU1wSiwrQ0FBU0EsQ0FBQ0ksZ0RBQVVBLENBQUNpSSxTQUFTLEdBQUd0SDtJQUU3Qyw2RUFBNkU7SUFDN0UsNEVBQTRFO0lBQzVFLE1BQU1zSSxhQUEwQixFQUFFO0lBQ2xDLElBQUlDLFdBQVdGO0lBQ2YsS0FBSyxNQUFNRyxXQUFXUixTQUFVO1FBQzlCLE1BQU1wSCxPQUFPUCxLQUFLQyxLQUFLLENBQUMsUUFBUytELE9BQU8sR0FBRyxPQUFRN0U7UUFDbkQsTUFBTXFCLEtBQUtSLEtBQUtFLEdBQUcsQ0FBQ1AsY0FBY0ssS0FBS29JLElBQUksQ0FBQyxRQUFTbkUsS0FBSyxHQUFHLE9BQVE5RTtRQUNyRSxJQUFJcUIsS0FBS0QsT0FBT2pCLGdCQUFnQjtRQUVoQyxNQUFNK0ksUUFBUXpKLCtDQUFTQSxDQUFDSSxnREFBVUEsQ0FBQ2lJLFNBQVMxRyxNQUFNQztRQUNsRCxJQUFJNkgsTUFBTUMsVUFBVSxHQUFHL0ksc0JBQXNCO1FBQzdDLElBQUk4SSxNQUFNRSxLQUFLLEtBQUtMLFNBQVNLLEtBQUssSUFBSUYsTUFBTXhELElBQUksS0FBS3FELFNBQVNyRCxJQUFJLEVBQUU7UUFFcEVvRCxXQUFXeEYsSUFBSSxDQUFDO1lBQ2QrRixNQUFNTCxRQUFRbkUsT0FBTztZQUNyQnpELE1BQU0sR0FBeUIySCxPQUF0QkEsU0FBU08sU0FBUyxFQUFDLEtBQWlCLE9BQWRQLFNBQVNyRCxJQUFJO1lBQzVDckUsSUFBSSxHQUFzQjZILE9BQW5CQSxNQUFNSSxTQUFTLEVBQUMsS0FBYyxPQUFYSixNQUFNeEQsSUFBSTtZQUNwQ0EsTUFBTXdELE1BQU14RCxJQUFJO1lBQ2hCNkQsV0FBVzVILGlCQUFpQm9ILFNBQVNLLEtBQUssRUFBRUYsTUFBTUUsS0FBSztRQUN6RDtRQUNBTCxXQUFXRztJQUNiO0lBRUEsNkVBQTZFO0lBQzdFLDZEQUE2RDtJQUM3RCxJQUFJTSxXQUFXO0lBQ2YsSUFBSUMsV0FBVztJQUNmLElBQUssSUFBSTdJLElBQUksR0FBR0EsSUFBSUosY0FBY0ksSUFBSztRQUNyQyxJQUFJK0csU0FBUyxDQUFDL0csRUFBRSxHQUFHLEdBQUc7WUFDcEI0SSxZQUFZN0IsU0FBUyxDQUFDL0csRUFBRTtZQUN4QjZJO1FBQ0Y7SUFDRjtJQUNBLE1BQU1DLGdCQUFnQkQsV0FBVyxJQUFJRCxXQUFXQyxXQUFXO0lBQzNELE1BQU1FLGNBQWMvSiwwQ0FBSUEsQ0FBQ29JO0lBRXpCLE9BQU87UUFDTDVCO1FBQ0FiLEtBQUsxRSxLQUFLc0gsS0FBSyxDQUFDNUIsTUFBTWhCLEdBQUcsR0FBRyxNQUFNO1FBQ2xDcUUsUUFBUSxRQUFTckQsTUFBTWhCLEdBQUc7UUFDMUJrQixhQUFhLE1BQU9ELFdBQVcsR0FBR0wsT0FBTzVGLEdBQUcsR0FBSTtRQUNoRHNKLGFBQWFqQixNQUFNeEgsSUFBSSxDQUFDa0c7UUFDeEJ3QyxpQkFBaUJsQixNQUFNeEgsSUFBSSxDQUFDbUc7UUFDNUJ3QyxlQUFlbkIsTUFBTXhILElBQUksQ0FBQ3lHO1FBQzFCbUMsZ0JBQWdCcEIsTUFBTXhILElBQUksQ0FBQzJHO1FBQzNCa0MsY0FBY3JCLE1BQU14SCxJQUFJLENBQUM0RztRQUN6QmtDLFNBQVNsSztRQUNUd0k7UUFDQTJCLFVBQVU3RSxlQUNSaUIsTUFBTWhCLEdBQUcsRUFDVG1ELGdCQUNBRCxZQUNBakQsY0FDQUMsUUFDQW9ELElBQUluRCxJQUFJLEVBQ1JpRSxhQUNBRDtRQUVGakI7UUFDQUM7UUFDQWxEO1FBQ0FDO1FBQ0FvRDtRQUNBQztRQUNBWTtRQUNBQztJQUNGO0FBQ0YiLCJzb3VyY2VzIjpbIi9Vc2Vycy9taWxhbi9Eb3dubG9hZHMvd20vd29ybGRzY29yZS9hcHAvbGliL2F1ZGlvL2FuYWx5emUudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgY29tcHV0ZUZyYW1lcyxcbiAgZGV0ZWN0S2V5LFxuICBkaXNzb25hbmNlLFxuICBlc3RpbWF0ZVRlbXBvLFxuICBtZWFuLFxuICBtZWFuQ2hyb21hLFxuICBub3JtYWxpc2UsXG4gIHNtb290aCxcbn0gZnJvbSBcIi4vZHNwXCI7XG5pbXBvcnQgdHlwZSB7XG4gIEFuYWx5c2lzT3ZlcnJpZGUsXG4gIEF1ZGlvQW5hbHlzaXMsXG4gIEtleUNoYW5nZSxcbiAgU2VjdGlvbixcbiAgU2VjdGlvblJvbGUsXG59IGZyb20gXCIuL3R5cGVzXCI7XG5cbi8qKiBUZXh0dXJlIGZyYW1lcyBwZXIgc2Vjb25kIOKAlCB0aGUgcmVzb2x1dGlvbiBzdHJ1Y3R1cmUgZGV0ZWN0aW9uIHdvcmtzIGF0LiAqL1xuZXhwb3J0IGNvbnN0IFRFWFRVUkVfSFogPSA0O1xuLyoqIEhhbGYtd2lkdGggb2YgdGhlIG5vdmVsdHkgY29tcGFyaXNvbiB3aW5kb3csIGluIHRleHR1cmUgZnJhbWVzLiAqL1xuY29uc3QgTk9WRUxUWV9XSU5ET1cgPSAyMDtcbi8qKiBNaW5pbXVtIG11c2ljYWwgZGlzdGFuY2UgYmV0d2VlbiB0d28gc2VjdGlvbiBib3VuZGFyaWVzLiAqL1xuY29uc3QgTUlOX1NFQ1RJT05fTVMgPSA5XzAwMDtcbi8qKlxuICogSGFsZi13aWR0aCBvZiB0aGUgd2luZG93IGhhcm1vbnkgaXMgcmVhZCBvdmVyLCBpbiB0ZXh0dXJlIGZyYW1lcy4gQSBxdWFydGVyXG4gKiBvZiBhIHNlY29uZCBvZiBhdWRpbyBjYW4ndCB0ZWxsIHlvdSBhIGtleSDigJQgdHdvIHNlY29uZHMgZWl0aGVyIHNpZGUgY2FuLCBhbmRcbiAqIGl0IGFsc28gc3RvcHMgdGhlIHNlYXNvbiBmbGlja2VyaW5nIG9uIGV2ZXJ5IHBhc3NpbmcgY2hvcmQuXG4gKi9cbmNvbnN0IEhBUk1PTllfV0lORE9XID0gODtcbi8qKiBCZWxvdyB0aGlzIGNvcnJlbGF0aW9uIHRoZSB0cmFjayBoYXMgbm8ga2V5IHdvcnRoIG5hbWluZywgc28gZG9uJ3QgY2xhaW0gb25lLiAqL1xuY29uc3QgS0VZX0NPTkZJREVOQ0VfRkxPT1IgPSAwLjI7XG5cbi8qKiBBdmVyYWdlIGEgZnJhbWUtcmF0ZSBzZXJpZXMgZG93biBvbnRvIHRoZSB0ZXh0dXJlIGdyaWQuICovXG5mdW5jdGlvbiB0b1RleHR1cmUoc3JjOiBBcnJheUxpa2U8bnVtYmVyPiwgZnBzOiBudW1iZXIsIHRleHR1cmVDb3VudDogbnVtYmVyKTogRmxvYXQzMkFycmF5IHtcbiAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheSh0ZXh0dXJlQ291bnQpO1xuICBjb25zdCBwZXIgPSBmcHMgLyBURVhUVVJFX0haO1xuICBmb3IgKGxldCB0ID0gMDsgdCA8IHRleHR1cmVDb3VudDsgdCsrKSB7XG4gICAgb3V0W3RdID0gbWVhbihzcmMsIE1hdGguZmxvb3IodCAqIHBlciksIE1hdGgubWluKHNyYy5sZW5ndGgsIE1hdGguZmxvb3IoKHQgKyAxKSAqIHBlcikpKTtcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG4vKiogU2FtZSByZWR1Y3Rpb24gYXMgYHRvVGV4dHVyZWAsIGJ1dCBmb3IgdGhlIGludGVybGVhdmVkIDEyLWJpbiBjaHJvbWEgYXJyYXkuICovXG5mdW5jdGlvbiBjaHJvbWFUb1RleHR1cmUoXG4gIGNocm9tYTogRmxvYXQzMkFycmF5LFxuICBmcHM6IG51bWJlcixcbiAgZnJhbWVDb3VudDogbnVtYmVyLFxuICB0ZXh0dXJlQ291bnQ6IG51bWJlcixcbik6IEZsb2F0MzJBcnJheSB7XG4gIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkodGV4dHVyZUNvdW50ICogMTIpO1xuICBjb25zdCBwZXIgPSBmcHMgLyBURVhUVVJFX0haO1xuICBmb3IgKGxldCB0ID0gMDsgdCA8IHRleHR1cmVDb3VudDsgdCsrKSB7XG4gICAgY29uc3QgZnJvbSA9IE1hdGguZmxvb3IodCAqIHBlcik7XG4gICAgY29uc3QgdG8gPSBNYXRoLm1pbihmcmFtZUNvdW50LCBNYXRoLmZsb29yKCh0ICsgMSkgKiBwZXIpKTtcbiAgICBjb25zdCBuID0gTWF0aC5tYXgoMSwgdG8gLSBmcm9tKTtcbiAgICBjb25zdCBvZmYgPSB0ICogMTI7XG4gICAgZm9yIChsZXQgZiA9IGZyb207IGYgPCB0bzsgZisrKSB7XG4gICAgICBjb25zdCBzcmMgPSBmICogMTI7XG4gICAgICBmb3IgKGxldCBjID0gMDsgYyA8IDEyOyBjKyspIG91dFtvZmYgKyBjXSArPSBjaHJvbWFbc3JjICsgY107XG4gICAgfVxuICAgIGZvciAobGV0IGMgPSAwOyBjIDwgMTI7IGMrKykgb3V0W29mZiArIGNdIC89IG47XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxuLyoqIFNob3J0ZXN0IHNpZ25lZCBkaXN0YW5jZSBiZXR3ZWVuIHR3byBwaXRjaCBjbGFzc2VzLCAtNi4uNi4gKi9cbmZ1bmN0aW9uIHNlbWl0b25lRGlzdGFuY2UoZnJvbTogbnVtYmVyLCB0bzogbnVtYmVyKTogbnVtYmVyIHtcbiAgbGV0IGQgPSAodG8gLSBmcm9tKSAlIDEyO1xuICBpZiAoZCA+IDYpIGQgLT0gMTI7XG4gIGlmIChkIDwgLTYpIGQgKz0gMTI7XG4gIHJldHVybiBkO1xufVxuXG4vKipcbiAqIENvc2luZSBkaXN0YW5jZSBhbG9uZSBpcyBzY2FsZS1pbnZhcmlhbnQsIHNvIGEgc2VjdGlvbiB0aGF0IGp1c3QgZ2V0cyBsb3VkZXJcbiAqIHdpdGggdGhlIHNhbWUgc3BlY3RyYWwgc2hhcGUg4oCUIGEgdmVyc2UgZHJvcHBpbmcgaW50byBhIGNob3J1cyDigJQgc2NvcmVzIHplcm8uXG4gKiBCbGVuZGluZyBpbiBhIG1hZ25pdHVkZS1zZW5zaXRpdmUgdGVybSBjYXRjaGVzIGJvdGggdGltYnJhbCBjaGFuZ2VzIGFuZCBwdXJlXG4gKiBkeW5hbWljIG9uZXMsIHdoaWNoIGlzIG1vc3Qgb2Ygd2hhdCBzZWN0aW9uIGJvdW5kYXJpZXMgYWN0dWFsbHkgYXJlLlxuICovXG5mdW5jdGlvbiBmZWF0dXJlRGlzdGFuY2UoYTogbnVtYmVyW10sIGI6IG51bWJlcltdKTogbnVtYmVyIHtcbiAgbGV0IGRvdCA9IDA7XG4gIGxldCBuYSA9IDA7XG4gIGxldCBuYiA9IDA7XG4gIGxldCBzcSA9IDA7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuICAgIGRvdCArPSBhW2ldICogYltpXTtcbiAgICBuYSArPSBhW2ldICogYVtpXTtcbiAgICBuYiArPSBiW2ldICogYltpXTtcbiAgICBzcSArPSAoYVtpXSAtIGJbaV0pICoqIDI7XG4gIH1cbiAgY29uc3QgY29zaW5lID0gbmEgPT09IDAgfHwgbmIgPT09IDAgPyAwIDogMSAtIGRvdCAvIChNYXRoLnNxcnQobmEpICogTWF0aC5zcXJ0KG5iKSk7XG4gIGNvbnN0IGV1Y2xpZGVhbiA9IE1hdGguc3FydChzcSAvIGEubGVuZ3RoKTtcbiAgcmV0dXJuIDAuNDUgKiBjb3NpbmUgKyAwLjU1ICogTWF0aC5taW4oMSwgZXVjbGlkZWFuKTtcbn1cblxuLyoqXG4gKiBOb3ZlbHR5IGN1cnZlIG92ZXIgYSBtdWx0aS1iYW5kIHRleHR1cmUuIEZvciBlYWNoIHBvaW50IHdlIGNvbXBhcmUgdGhlIG1lYW5cbiAqIGZlYXR1cmUgdmVjdG9yIG9mIHRoZSB3aW5kb3cgYmVmb3JlIGl0IGFnYWluc3QgdGhlIHdpbmRvdyBhZnRlciBpdDsgYSBsYXJnZVxuICogY29zaW5lIGRpc3RhbmNlIG1lYW5zIHRoZSB0cmFjayBqdXN0IGNoYW5nZWQgY2hhcmFjdGVyLiBUaGlzIGlzIGEgY2hlYXBcbiAqIHN0YW5kLWluIGZvciBhIGZ1bGwgc2VsZi1zaW1pbGFyaXR5IGNoZWNrZXJib2FyZCBhbmQgaG9sZHMgdXAgd2VsbCBvbiB0aGVcbiAqIDlzKyBib3VuZGFyaWVzIHdlIGFjdHVhbGx5IGNhcmUgYWJvdXQuXG4gKi9cbmZ1bmN0aW9uIG5vdmVsdHlDdXJ2ZShiYW5kczogRmxvYXQzMkFycmF5W10sIGNvdW50OiBudW1iZXIpOiBGbG9hdDMyQXJyYXkge1xuICBjb25zdCBub3ZlbHR5ID0gbmV3IEZsb2F0MzJBcnJheShjb3VudCk7XG4gIGZvciAobGV0IHQgPSAwOyB0IDwgY291bnQ7IHQrKykge1xuICAgIGNvbnN0IGZyb20gPSBNYXRoLm1heCgwLCB0IC0gTk9WRUxUWV9XSU5ET1cpO1xuICAgIGNvbnN0IHRvID0gTWF0aC5taW4oY291bnQsIHQgKyBOT1ZFTFRZX1dJTkRPVyk7XG4gICAgaWYgKHQgLSBmcm9tIDwgMyB8fCB0byAtIHQgPCAzKSBjb250aW51ZTtcbiAgICBjb25zdCBiZWZvcmUgPSBiYW5kcy5tYXAoKGIpID0+IG1lYW4oYiwgZnJvbSwgdCkpO1xuICAgIGNvbnN0IGFmdGVyID0gYmFuZHMubWFwKChiKSA9PiBtZWFuKGIsIHQsIHRvKSk7XG4gICAgbm92ZWx0eVt0XSA9IGZlYXR1cmVEaXN0YW5jZShiZWZvcmUsIGFmdGVyKTtcbiAgfVxuICByZXR1cm4gbm92ZWx0eTtcbn1cblxuZnVuY3Rpb24gcGlja1BlYWtzKG5vdmVsdHk6IEZsb2F0MzJBcnJheSwgbWluR2FwRnJhbWVzOiBudW1iZXIpOiBudW1iZXJbXSB7XG4gIGNvbnN0IGF2ZyA9IG1lYW4obm92ZWx0eSk7XG4gIGxldCB2YXJpYW5jZSA9IDA7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbm92ZWx0eS5sZW5ndGg7IGkrKykgdmFyaWFuY2UgKz0gKG5vdmVsdHlbaV0gLSBhdmcpICoqIDI7XG4gIGNvbnN0IHN0ZCA9IE1hdGguc3FydCh2YXJpYW5jZSAvIE1hdGgubWF4KDEsIG5vdmVsdHkubGVuZ3RoKSk7XG4gIGNvbnN0IHRocmVzaG9sZCA9IGF2ZyArIHN0ZCAqIDAuMzU7XG5cbiAgY29uc3QgY2FuZGlkYXRlczogeyBpbmRleDogbnVtYmVyOyB2YWx1ZTogbnVtYmVyIH1bXSA9IFtdO1xuICBmb3IgKGxldCB0ID0gMTsgdCA8IG5vdmVsdHkubGVuZ3RoIC0gMTsgdCsrKSB7XG4gICAgaWYgKG5vdmVsdHlbdF0gPCB0aHJlc2hvbGQpIGNvbnRpbnVlO1xuICAgIGlmIChub3ZlbHR5W3RdIDwgbm92ZWx0eVt0IC0gMV0gfHwgbm92ZWx0eVt0XSA8IG5vdmVsdHlbdCArIDFdKSBjb250aW51ZTtcbiAgICBjYW5kaWRhdGVzLnB1c2goeyBpbmRleDogdCwgdmFsdWU6IG5vdmVsdHlbdF0gfSk7XG4gIH1cblxuICAvLyBHcmVlZHk6IHN0cm9uZ2VzdCBwZWFrcyB3aW4sIHdlYWtlciBvbmVzIGluc2lkZSB0aGUgZXhjbHVzaW9uIHpvbmUgZHJvcC5cbiAgY2FuZGlkYXRlcy5zb3J0KChhLCBiKSA9PiBiLnZhbHVlIC0gYS52YWx1ZSk7XG4gIGNvbnN0IGtlcHQ6IG51bWJlcltdID0gW107XG4gIGZvciAoY29uc3QgYyBvZiBjYW5kaWRhdGVzKSB7XG4gICAgaWYgKGtlcHQuZXZlcnkoKGspID0+IE1hdGguYWJzKGsgLSBjLmluZGV4KSA+PSBtaW5HYXBGcmFtZXMpKSBrZXB0LnB1c2goYy5pbmRleCk7XG4gIH1cbiAgcmV0dXJuIGtlcHQuc29ydCgoYSwgYikgPT4gYSAtIGIpO1xufVxuXG4vKipcbiAqIEFzc2lnbiBtdXNpY2FsIHJvbGVzIGZyb20gcmVsYXRpdmUgZW5lcmd5IGFuZCBwb3NpdGlvbi4gVGhpcyBpcyBkZWxpYmVyYXRlbHlcbiAqIGludGVycHJldGFibGUgcmF0aGVyIHRoYW4gY2xldmVyOiB0aGUgc3BlYyBhc2tzIGZvciBiZWxpZXZhYmxlIG1hcHBpbmcgd2UgY2FuXG4gKiBkZWJ1Zywgbm90IGEgbXVzaWMtaW5mb3JtYXRpb24tcmV0cmlldmFsIHBhcGVyLlxuICovXG5mdW5jdGlvbiBsYWJlbFNlY3Rpb25zKFxuICBib3VuZHM6IG51bWJlcltdLFxuICBlbmVyZ3k6IEZsb2F0MzJBcnJheSxcbiAgYnJpZ2h0bmVzczogRmxvYXQzMkFycmF5LFxuICByZWdpc3RlcjogRmxvYXQzMkFycmF5LFxuICBtYWpvcm5lc3M6IEZsb2F0MzJBcnJheSxcbiAgdGVuc2lvbjogRmxvYXQzMkFycmF5LFxuKTogU2VjdGlvbltdIHtcbiAgY29uc3QgcmF3ID0gYm91bmRzLnNsaWNlKDAsIC0xKS5tYXAoKHN0YXJ0VCwgaSkgPT4ge1xuICAgIGNvbnN0IGVuZFQgPSBib3VuZHNbaSArIDFdO1xuICAgIHJldHVybiB7XG4gICAgICBzdGFydFQsXG4gICAgICBlbmRULFxuICAgICAgZW5lcmd5OiBtZWFuKGVuZXJneSwgc3RhcnRULCBlbmRUKSxcbiAgICAgIGJyaWdodG5lc3M6IG1lYW4oYnJpZ2h0bmVzcywgc3RhcnRULCBlbmRUKSxcbiAgICAgIHJlZ2lzdGVyOiBtZWFuKHJlZ2lzdGVyLCBzdGFydFQsIGVuZFQpLFxuICAgICAgbWFqb3JuZXNzOiBtZWFuKG1ham9ybmVzcywgc3RhcnRULCBlbmRUKSxcbiAgICAgIHRlbnNpb246IG1lYW4odGVuc2lvbiwgc3RhcnRULCBlbmRUKSxcbiAgICB9O1xuICB9KTtcblxuICBpZiAocmF3Lmxlbmd0aCA9PT0gMCkgcmV0dXJuIFtdO1xuXG4gIGNvbnN0IGVuZXJnaWVzID0gcmF3Lm1hcCgocykgPT4gcy5lbmVyZ3kpLnNvcnQoKGEsIGIpID0+IGEgLSBiKTtcbiAgY29uc3QgbG91ZCA9IGVuZXJnaWVzW01hdGguZmxvb3IoZW5lcmdpZXMubGVuZ3RoICogMC43KV07XG4gIGNvbnN0IHF1aWV0ID0gZW5lcmdpZXNbTWF0aC5mbG9vcihlbmVyZ2llcy5sZW5ndGggKiAwLjMpXTtcblxuICByZXR1cm4gcmF3Lm1hcCgocywgaSkgPT4ge1xuICAgIGNvbnN0IHN0YXJ0TXMgPSAocy5zdGFydFQgLyBURVhUVVJFX0haKSAqIDEwMDA7XG4gICAgY29uc3QgZW5kTXMgPSAocy5lbmRUIC8gVEVYVFVSRV9IWikgKiAxMDAwO1xuICAgIGNvbnN0IGlzRmlyc3QgPSBpID09PSAwO1xuICAgIGNvbnN0IGlzTGFzdCA9IGkgPT09IHJhdy5sZW5ndGggLSAxO1xuICAgIGNvbnN0IHByZXYgPSByYXdbaSAtIDFdO1xuICAgIGNvbnN0IG5leHQgPSByYXdbaSArIDFdO1xuXG4gICAgLy8gQSBzaGFycCBqdW1wIHVwIGluIGVuZXJneSBmcm9tIHRoZSBwcmV2aW91cyBzZWN0aW9uIHJlYWRzIGFzIGEgZHJvcC5cbiAgICBjb25zdCBqdW1wID0gcHJldiA/IHMuZW5lcmd5IC0gcHJldi5lbmVyZ3kgOiAwO1xuICAgIGNvbnN0IGlzSW1wYWN0ID0ganVtcCA+IDAuMTg7XG5cbiAgICBsZXQgcm9sZTogU2VjdGlvblJvbGU7XG4gICAgaWYgKGlzRmlyc3QgJiYgcy5lbmVyZ3kgPD0gbG91ZCkgcm9sZSA9IFwiaW50cm9cIjtcbiAgICBlbHNlIGlmIChpc0xhc3QgJiYgcy5lbmVyZ3kgPCBsb3VkKSByb2xlID0gXCJvdXRyb1wiO1xuICAgIGVsc2UgaWYgKHMuZW5lcmd5ID49IGxvdWQgJiYgaXNJbXBhY3QpIHJvbGUgPSBcImRyb3BcIjtcbiAgICBlbHNlIGlmIChzLmVuZXJneSA+PSBsb3VkKSByb2xlID0gXCJjaG9ydXNcIjtcbiAgICBlbHNlIGlmIChzLmVuZXJneSA8PSBxdWlldCAmJiAhaXNGaXJzdCAmJiAhaXNMYXN0KSByb2xlID0gXCJicmVha2Rvd25cIjtcbiAgICBlbHNlIGlmIChuZXh0ICYmIG5leHQuZW5lcmd5IC0gcy5lbmVyZ3kgPiAwLjE1KSByb2xlID0gXCJidWlsZFwiO1xuICAgIGVsc2UgaWYgKHByZXYgJiYgbmV4dCAmJiBzLmJyaWdodG5lc3MgPiBwcmV2LmJyaWdodG5lc3MgKyAwLjE1KSByb2xlID0gXCJicmlkZ2VcIjtcbiAgICBlbHNlIHJvbGUgPSBcInZlcnNlXCI7XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3RhcnRNcyxcbiAgICAgIGVuZE1zLFxuICAgICAgcm9sZSxcbiAgICAgIGVuZXJneTogcy5lbmVyZ3ksXG4gICAgICBicmlnaHRuZXNzOiBzLmJyaWdodG5lc3MsXG4gICAgICBpc0ltcGFjdCxcbiAgICAgIHJlZ2lzdGVyOiBzLnJlZ2lzdGVyLFxuICAgICAgbWFqb3JuZXNzOiBzLm1ham9ybmVzcyxcbiAgICAgIHRlbnNpb246IHMudGVuc2lvbixcbiAgICB9O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gZGVyaXZlTW9vZFRhZ3MoXG4gIGJwbTogbnVtYmVyLFxuICBicmlnaHRuZXNzOiBudW1iZXIsXG4gIGVuZXJneTogbnVtYmVyLFxuICBkeW5hbWljUmFuZ2U6IG51bWJlcixcbiAgbG93RW5kOiBudW1iZXIsXG4gIG1vZGU6IFwibWFqb3JcIiB8IFwibWlub3JcIixcbiAgdGVuc2lvbjogbnVtYmVyLFxuICByZWdpc3RlcjogbnVtYmVyLFxuKTogc3RyaW5nW10ge1xuICBjb25zdCB0YWdzOiBzdHJpbmdbXSA9IFtdO1xuXG4gIGlmIChicG0gPCA4NSkgdGFncy5wdXNoKFwic2xvd1wiLCBcInNwYWNpb3VzXCIpO1xuICBlbHNlIGlmIChicG0gPCAxMTApIHRhZ3MucHVzaChcIm1pZC10ZW1wb1wiLCBcImxvcGluZ1wiKTtcbiAgZWxzZSBpZiAoYnBtIDwgMTQwKSB0YWdzLnB1c2goXCJkcml2aW5nXCIpO1xuICBlbHNlIHRhZ3MucHVzaChcImZhc3RcIiwgXCJ1cmdlbnRcIik7XG5cbiAgaWYgKGJyaWdodG5lc3MgPCAwLjM1KSB0YWdzLnB1c2goXCJkYXJrXCIsIFwibXVya3lcIik7XG4gIGVsc2UgaWYgKGJyaWdodG5lc3MgPiAwLjY1KSB0YWdzLnB1c2goXCJicmlnaHRcIiwgXCJhaXJ5XCIpO1xuICBlbHNlIHRhZ3MucHVzaChcIndhcm1cIik7XG5cbiAgaWYgKGVuZXJneSA+IDAuNjUpIHRhZ3MucHVzaChcImRlbnNlXCIsIFwicG93ZXJmdWxcIik7XG4gIGVsc2UgaWYgKGVuZXJneSA8IDAuMzUpIHRhZ3MucHVzaChcInNwYXJzZVwiLCBcImludGltYXRlXCIpO1xuXG4gIGlmIChkeW5hbWljUmFuZ2UgPiAwLjUpIHRhZ3MucHVzaChcImR5bmFtaWNcIiwgXCJjaW5lbWF0aWNcIik7XG4gIGVsc2UgdGFncy5wdXNoKFwiY29tcHJlc3NlZFwiLCBcImh5cG5vdGljXCIpO1xuXG4gIGlmIChsb3dFbmQgPiAwLjYpIHRhZ3MucHVzaChcImJhc3MtaGVhdnlcIiwgXCJwaHlzaWNhbFwiKTtcblxuICB0YWdzLnB1c2gobW9kZSA9PT0gXCJtaW5vclwiID8gXCJtZWxhbmNob2xpY1wiIDogXCJyZXNvbHZlZFwiKTtcbiAgaWYgKHRlbnNpb24gPiAwLjU1KSB0YWdzLnB1c2goXCJ1bnJlc29sdmVkXCIsIFwicmVzdGxlc3NcIik7XG4gIGVsc2UgaWYgKHRlbnNpb24gPCAwLjMpIHRhZ3MucHVzaChcImNvbnNvbmFudFwiLCBcInNldHRsZWRcIik7XG5cbiAgaWYgKHJlZ2lzdGVyIDwgNDApIHRhZ3MucHVzaChcInN1YnRlcnJhbmVhblwiKTtcbiAgZWxzZSBpZiAocmVnaXN0ZXIgPiA2MikgdGFncy5wdXNoKFwiaGlnaC1yZWdpc3RlclwiLCBcIndlaWdodGxlc3NcIik7XG5cbiAgcmV0dXJuIHRhZ3M7XG59XG5cbi8qKlxuICogQm90aCBncmlkcyBzdGFydCBhdCB6ZXJvIGFuZCBydW4gYXQgYFRFWFRVUkVfSFpgLCBzbyBjb25mb3JtaW5nIGlzIGEgY2xhbXBcbiAqIHJhdGhlciB0aGFuIGEgcmVzYW1wbGUuIEZyYW1lcyBwYXN0IHRoZSBlbmQgcmVwZWF0IHRoZSBsYXN0IGtub3duIGhhcm1vbnksXG4gKiB3aGljaCBpcyB3aGF0IGEgcmV2ZXJiIHRhaWwgaXMgYWN0dWFsbHkgZG9pbmcgYW55d2F5LlxuICovXG5mdW5jdGlvbiBjb25mb3JtKHNyYzogRmxvYXQzMkFycmF5LCBjb3VudDogbnVtYmVyLCBzdHJpZGU6IG51bWJlcik6IEZsb2F0MzJBcnJheSB7XG4gIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoY291bnQgKiBzdHJpZGUpO1xuICBjb25zdCBzcmNDb3VudCA9IE1hdGguZmxvb3Ioc3JjLmxlbmd0aCAvIHN0cmlkZSk7XG4gIGlmIChzcmNDb3VudCA9PT0gMCkgcmV0dXJuIG91dDtcblxuICBmb3IgKGxldCB0ID0gMDsgdCA8IGNvdW50OyB0KyspIHtcbiAgICBjb25zdCBzID0gTWF0aC5taW4oc3JjQ291bnQgLSAxLCB0KTtcbiAgICBmb3IgKGxldCBrID0gMDsgayA8IHN0cmlkZTsgaysrKSBvdXRbdCAqIHN0cmlkZSArIGtdID0gc3JjW3MgKiBzdHJpZGUgKyBrXTtcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYW5hbHl6ZVBjbShcbiAgcGNtOiBGbG9hdDMyQXJyYXksXG4gIHNhbXBsZVJhdGU6IG51bWJlcixcbiAgb3ZlcnJpZGU/OiBBbmFseXNpc092ZXJyaWRlLFxuKTogQXVkaW9BbmFseXNpcyB7XG4gIGNvbnN0IGZyYW1lcyA9IGNvbXB1dGVGcmFtZXMocGNtLCBzYW1wbGVSYXRlKTtcbiAgY29uc3QgZHVyYXRpb25NcyA9IChwY20ubGVuZ3RoIC8gc2FtcGxlUmF0ZSkgKiAxMDAwO1xuXG4gIGNvbnN0IGVzdGltYXRlZCA9IGVzdGltYXRlVGVtcG8oZnJhbWVzLmZsdXgsIGZyYW1lcy5mcHMpO1xuICBjb25zdCB0ZW1wbyA9IG92ZXJyaWRlXG4gICAgPyB7IGJwbTogb3ZlcnJpZGUuYnBtLCBwaGFzZUZyYW1lczogKG92ZXJyaWRlLmJlYXRQaGFzZU1zIC8gMTAwMCkgKiBmcmFtZXMuZnBzIH1cbiAgICA6IGVzdGltYXRlZDtcblxuICAvLyBDZW50cm9pZCBpcyBpbiBIeiBhbmQgc3BhbnMgb3JkZXJzIG9mIG1hZ25pdHVkZSwgc28gYSBmZXcgbm9pc3ktaGF0IGZyYW1lc1xuICAvLyB3b3VsZCBvdGhlcndpc2Ugc3F1YXNoIHRoZSB3aG9sZSB0cmFjayB0b3dhcmQgemVyby4gQ29tcHJlc3MgaXQgZmlyc3QuXG4gIGNvbnN0IGxvZ0NlbnRyb2lkID0gbmV3IEZsb2F0MzJBcnJheShmcmFtZXMuY2VudHJvaWQubGVuZ3RoKTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBmcmFtZXMuY2VudHJvaWQubGVuZ3RoOyBpKyspIHtcbiAgICBsb2dDZW50cm9pZFtpXSA9IE1hdGgubG9nMigxICsgZnJhbWVzLmNlbnRyb2lkW2ldKTtcbiAgfVxuXG4gIGNvbnN0IGVuZXJneU4gPSBub3JtYWxpc2Uoc21vb3RoKGZyYW1lcy5ybXMsIDIpKTtcbiAgY29uc3QgYnJpZ2h0TiA9IG5vcm1hbGlzZShzbW9vdGgobG9nQ2VudHJvaWQsIDIpKTtcbiAgY29uc3QgbG93TiA9IG5vcm1hbGlzZShzbW9vdGgoZnJhbWVzLmxvdywgMikpO1xuICBjb25zdCBtaWROID0gbm9ybWFsaXNlKHNtb290aChmcmFtZXMubWlkLCAyKSk7XG4gIGNvbnN0IGhpZ2hOID0gbm9ybWFsaXNlKHNtb290aChmcmFtZXMuaGlnaCwgMikpO1xuXG4gIGNvbnN0IHRleHR1cmVDb3VudCA9IE1hdGgubWF4KDEsIE1hdGguZmxvb3IoKGR1cmF0aW9uTXMgLyAxMDAwKSAqIFRFWFRVUkVfSFopKTtcbiAgY29uc3QgdEVuZXJneSA9IHRvVGV4dHVyZShlbmVyZ3lOLCBmcmFtZXMuZnBzLCB0ZXh0dXJlQ291bnQpO1xuICBjb25zdCB0QnJpZ2h0ID0gdG9UZXh0dXJlKGJyaWdodE4sIGZyYW1lcy5mcHMsIHRleHR1cmVDb3VudCk7XG4gIGNvbnN0IHRMb3cgPSB0b1RleHR1cmUobG93TiwgZnJhbWVzLmZwcywgdGV4dHVyZUNvdW50KTtcbiAgY29uc3QgdE1pZCA9IHRvVGV4dHVyZShtaWROLCBmcmFtZXMuZnBzLCB0ZXh0dXJlQ291bnQpO1xuICBjb25zdCB0SGlnaCA9IHRvVGV4dHVyZShoaWdoTiwgZnJhbWVzLmZwcywgdGV4dHVyZUNvdW50KTtcblxuICAvLyBBYnNvbHV0ZSBwaXRjaCBpbiBNSURJIG51bWJlcnMsIGJlZm9yZSBub3JtYWxpc2luZzogYSBnZW51aW5lbHkgYmFzcy1oZWF2eVxuICAvLyB0cmFjayBzaG91bGQgcmVhZCBoZWF2eSBvdmVyYWxsLCBub3QgbWVyZWx5IGhlYXZ5IHJlbGF0aXZlIHRvIGl0cyBvd25cbiAgLy8gYnJpZ2h0ZXN0IG1vbWVudC5cbiAgY29uc3QgcGl0Y2hNaWRpID0gb3ZlcnJpZGVcbiAgICA/IGNvbmZvcm0ob3ZlcnJpZGUucGl0Y2gsIHRleHR1cmVDb3VudCwgMSlcbiAgICA6IHRvVGV4dHVyZShmcmFtZXMucGl0Y2gsIGZyYW1lcy5mcHMsIHRleHR1cmVDb3VudCk7XG4gIGNvbnN0IHRSZWdpc3RlciA9IG5vcm1hbGlzZShzbW9vdGgocGl0Y2hNaWRpLCAyKSk7XG5cbiAgLy8gSGFybW9ueSBpcyByZWFkIG92ZXIgYSBzbGlkaW5nIHdpbmRvdyByYXRoZXIgdGhhbiBwZXIgdGV4dHVyZSBmcmFtZSwgc28gYVxuICAvLyBwYXNzaW5nIGNob3JkIGNhbid0IHlhbmsgdGhlIHNlYXNvbiBhcm91bmQuIEJvdGggY3VydmVzIGNvbWUgb2ZmIHRoZSBzYW1lXG4gIC8vIGF2ZXJhZ2VkIHByb2ZpbGUsIHdoaWNoIGtlZXBzIHRoZW0gY29uc2lzdGVudCB3aXRoIGVhY2ggb3RoZXIuXG4gIGNvbnN0IHRDaHJvbWEgPSBvdmVycmlkZVxuICAgID8gY29uZm9ybShvdmVycmlkZS5jaHJvbWEsIHRleHR1cmVDb3VudCwgMTIpXG4gICAgOiBjaHJvbWFUb1RleHR1cmUoZnJhbWVzLmNocm9tYSwgZnJhbWVzLmZwcywgZnJhbWVzLmNvdW50LCB0ZXh0dXJlQ291bnQpO1xuICBjb25zdCB0TWFqb3JuZXNzID0gbmV3IEZsb2F0MzJBcnJheSh0ZXh0dXJlQ291bnQpO1xuICBjb25zdCB0VGVuc2lvbiA9IG5ldyBGbG9hdDMyQXJyYXkodGV4dHVyZUNvdW50KTtcbiAgZm9yIChsZXQgdCA9IDA7IHQgPCB0ZXh0dXJlQ291bnQ7IHQrKykge1xuICAgIGNvbnN0IGZyb20gPSBNYXRoLm1heCgwLCB0IC0gSEFSTU9OWV9XSU5ET1cpO1xuICAgIGNvbnN0IHRvID0gTWF0aC5taW4odGV4dHVyZUNvdW50LCB0ICsgSEFSTU9OWV9XSU5ET1cgKyAxKTtcbiAgICBjb25zdCBwcm9maWxlID0gbWVhbkNocm9tYSh0Q2hyb21hLCBmcm9tLCB0byk7XG4gICAgLy8gZGV0ZWN0S2V5IHJldHVybnMgLTEuLjE7IHRoZSBjdXJ2ZXMgYXJlIDAuLjEgbGlrZSBldmVyeSBvdGhlciBjdXJ2ZSBoZXJlLlxuICAgIHRNYWpvcm5lc3NbdF0gPSAoZGV0ZWN0S2V5KHByb2ZpbGUpLm1ham9ybmVzcyArIDEpIC8gMjtcbiAgICB0VGVuc2lvblt0XSA9IGRpc3NvbmFuY2UocHJvZmlsZSk7XG4gIH1cblxuICBjb25zdCBub3ZlbHR5ID0gbm92ZWx0eUN1cnZlKFt0RW5lcmd5LCB0QnJpZ2h0LCB0TG93LCB0TWlkLCB0SGlnaF0sIHRleHR1cmVDb3VudCk7XG4gIGNvbnN0IG1pbkdhcCA9IE1hdGgucm91bmQoKE1JTl9TRUNUSU9OX01TIC8gMTAwMCkgKiBURVhUVVJFX0haKTtcbiAgY29uc3QgcGVha3MgPSBwaWNrUGVha3Mobm92ZWx0eSwgbWluR2FwKTtcblxuICBjb25zdCBib3VuZHMgPSBbMCwgLi4ucGVha3MsIHRleHR1cmVDb3VudF0uZmlsdGVyKFxuICAgICh2LCBpLCBhcnIpID0+IGkgPT09IDAgfHwgdiAtIGFycltpIC0gMV0gPj0gTWF0aC5taW4obWluR2FwLCA0KSxcbiAgKTtcbiAgaWYgKGJvdW5kc1tib3VuZHMubGVuZ3RoIC0gMV0gIT09IHRleHR1cmVDb3VudCkgYm91bmRzLnB1c2godGV4dHVyZUNvdW50KTtcblxuICBjb25zdCBzZWN0aW9ucyA9IGxhYmVsU2VjdGlvbnMoYm91bmRzLCB0RW5lcmd5LCB0QnJpZ2h0LCB0UmVnaXN0ZXIsIHRNYWpvcm5lc3MsIHRUZW5zaW9uKTtcblxuICBjb25zdCBtZWFuRW5lcmd5ID0gbWVhbih0RW5lcmd5KTtcbiAgY29uc3QgbWVhbkJyaWdodG5lc3MgPSBtZWFuKHRCcmlnaHQpO1xuICBjb25zdCBzb3J0ZWRFbmVyZ3kgPSBBcnJheS5mcm9tKHRFbmVyZ3kpLnNvcnQoKGEsIGIpID0+IGEgLSBiKTtcbiAgY29uc3QgZHluYW1pY1JhbmdlID1cbiAgICBzb3J0ZWRFbmVyZ3lbTWF0aC5mbG9vcihzb3J0ZWRFbmVyZ3kubGVuZ3RoICogMC45KV0gLVxuICAgIHNvcnRlZEVuZXJneVtNYXRoLmZsb29yKHNvcnRlZEVuZXJneS5sZW5ndGggKiAwLjEpXTtcbiAgY29uc3QgbG93RW5kID0gbWVhbih0TG93KTtcblxuICBjb25zdCBrZXkgPSBkZXRlY3RLZXkobWVhbkNocm9tYSh0Q2hyb21hLCAwLCB0ZXh0dXJlQ291bnQpKTtcblxuICAvLyBBIG1vZHVsYXRpb24gaXMgdGhlIGxvdWRlc3QgZXZlbnQgYSBwaWVjZSBvZiBtdXNpYyBjYW4gaGFuZCB1cywgc28gaXQgZ2V0c1xuICAvLyBkZXRlY3RlZCBwZXIgc2VjdGlvbiByYXRoZXIgdGhhbiBwZXIgZnJhbWUg4oCUIHdlIHdhbnQgdGhlIG9uZXMgdGhhdCBzdGljay5cbiAgY29uc3Qga2V5Q2hhbmdlczogS2V5Q2hhbmdlW10gPSBbXTtcbiAgbGV0IHByZXZpb3VzID0ga2V5O1xuICBmb3IgKGNvbnN0IHNlY3Rpb24gb2Ygc2VjdGlvbnMpIHtcbiAgICBjb25zdCBmcm9tID0gTWF0aC5mbG9vcigoc2VjdGlvbi5zdGFydE1zIC8gMTAwMCkgKiBURVhUVVJFX0haKTtcbiAgICBjb25zdCB0byA9IE1hdGgubWluKHRleHR1cmVDb3VudCwgTWF0aC5jZWlsKChzZWN0aW9uLmVuZE1zIC8gMTAwMCkgKiBURVhUVVJFX0haKSk7XG4gICAgaWYgKHRvIC0gZnJvbSA8IEhBUk1PTllfV0lORE9XKSBjb250aW51ZTtcblxuICAgIGNvbnN0IGxvY2FsID0gZGV0ZWN0S2V5KG1lYW5DaHJvbWEodENocm9tYSwgZnJvbSwgdG8pKTtcbiAgICBpZiAobG9jYWwuY29uZmlkZW5jZSA8IEtFWV9DT05GSURFTkNFX0ZMT09SKSBjb250aW51ZTtcbiAgICBpZiAobG9jYWwudG9uaWMgPT09IHByZXZpb3VzLnRvbmljICYmIGxvY2FsLm1vZGUgPT09IHByZXZpb3VzLm1vZGUpIGNvbnRpbnVlO1xuXG4gICAga2V5Q2hhbmdlcy5wdXNoKHtcbiAgICAgIGF0TXM6IHNlY3Rpb24uc3RhcnRNcyxcbiAgICAgIGZyb206IGAke3ByZXZpb3VzLnRvbmljTmFtZX0gJHtwcmV2aW91cy5tb2RlfWAsXG4gICAgICB0bzogYCR7bG9jYWwudG9uaWNOYW1lfSAke2xvY2FsLm1vZGV9YCxcbiAgICAgIG1vZGU6IGxvY2FsLm1vZGUsXG4gICAgICBzZW1pdG9uZXM6IHNlbWl0b25lRGlzdGFuY2UocHJldmlvdXMudG9uaWMsIGxvY2FsLnRvbmljKSxcbiAgICB9KTtcbiAgICBwcmV2aW91cyA9IGxvY2FsO1xuICB9XG5cbiAgLy8gQXZlcmFnZWQgb25seSBvdmVyIGZyYW1lcyB0aGF0IGFjdHVhbGx5IGhhZCBwaXRjaCBpbiB0aGVtLCBvciB0aGUgcmVzdHMgaW5cbiAgLy8gYSBzcGFyc2UgYXJyYW5nZW1lbnQgd291bGQgZHJhZyBpdHMgcmVnaXN0ZXIgdG8gdGhlIGZsb29yLlxuICBsZXQgcGl0Y2hTdW0gPSAwO1xuICBsZXQgc291bmRpbmcgPSAwO1xuICBmb3IgKGxldCB0ID0gMDsgdCA8IHRleHR1cmVDb3VudDsgdCsrKSB7XG4gICAgaWYgKHBpdGNoTWlkaVt0XSA+IDApIHtcbiAgICAgIHBpdGNoU3VtICs9IHBpdGNoTWlkaVt0XTtcbiAgICAgIHNvdW5kaW5nKys7XG4gICAgfVxuICB9XG4gIGNvbnN0IG1lYW5QaXRjaE1pZGkgPSBzb3VuZGluZyA+IDAgPyBwaXRjaFN1bSAvIHNvdW5kaW5nIDogMDtcbiAgY29uc3QgbWVhblRlbnNpb24gPSBtZWFuKHRUZW5zaW9uKTtcblxuICByZXR1cm4ge1xuICAgIGR1cmF0aW9uTXMsXG4gICAgYnBtOiBNYXRoLnJvdW5kKHRlbXBvLmJwbSAqIDEwKSAvIDEwLFxuICAgIGJlYXRNczogNjBfMDAwIC8gdGVtcG8uYnBtLFxuICAgIGJlYXRQaGFzZU1zOiAodGVtcG8ucGhhc2VGcmFtZXMgLyBmcmFtZXMuZnBzKSAqIDEwMDAsXG4gICAgZW5lcmd5Q3VydmU6IEFycmF5LmZyb20odEVuZXJneSksXG4gICAgYnJpZ2h0bmVzc0N1cnZlOiBBcnJheS5mcm9tKHRCcmlnaHQpLFxuICAgIHJlZ2lzdGVyQ3VydmU6IEFycmF5LmZyb20odFJlZ2lzdGVyKSxcbiAgICBtYWpvcm5lc3NDdXJ2ZTogQXJyYXkuZnJvbSh0TWFqb3JuZXNzKSxcbiAgICB0ZW5zaW9uQ3VydmU6IEFycmF5LmZyb20odFRlbnNpb24pLFxuICAgIGN1cnZlSHo6IFRFWFRVUkVfSFosXG4gICAgc2VjdGlvbnMsXG4gICAgbW9vZFRhZ3M6IGRlcml2ZU1vb2RUYWdzKFxuICAgICAgdGVtcG8uYnBtLFxuICAgICAgbWVhbkJyaWdodG5lc3MsXG4gICAgICBtZWFuRW5lcmd5LFxuICAgICAgZHluYW1pY1JhbmdlLFxuICAgICAgbG93RW5kLFxuICAgICAga2V5Lm1vZGUsXG4gICAgICBtZWFuVGVuc2lvbixcbiAgICAgIG1lYW5QaXRjaE1pZGksXG4gICAgKSxcbiAgICBtZWFuRW5lcmd5LFxuICAgIG1lYW5CcmlnaHRuZXNzLFxuICAgIGR5bmFtaWNSYW5nZSxcbiAgICBsb3dFbmQsXG4gICAga2V5LFxuICAgIGtleUNoYW5nZXMsXG4gICAgbWVhblBpdGNoTWlkaSxcbiAgICBtZWFuVGVuc2lvbixcbiAgfTtcbn1cbiJdLCJuYW1lcyI6WyJjb21wdXRlRnJhbWVzIiwiZGV0ZWN0S2V5IiwiZGlzc29uYW5jZSIsImVzdGltYXRlVGVtcG8iLCJtZWFuIiwibWVhbkNocm9tYSIsIm5vcm1hbGlzZSIsInNtb290aCIsIlRFWFRVUkVfSFoiLCJOT1ZFTFRZX1dJTkRPVyIsIk1JTl9TRUNUSU9OX01TIiwiSEFSTU9OWV9XSU5ET1ciLCJLRVlfQ09ORklERU5DRV9GTE9PUiIsInRvVGV4dHVyZSIsInNyYyIsImZwcyIsInRleHR1cmVDb3VudCIsIm91dCIsIkZsb2F0MzJBcnJheSIsInBlciIsInQiLCJNYXRoIiwiZmxvb3IiLCJtaW4iLCJsZW5ndGgiLCJjaHJvbWFUb1RleHR1cmUiLCJjaHJvbWEiLCJmcmFtZUNvdW50IiwiZnJvbSIsInRvIiwibiIsIm1heCIsIm9mZiIsImYiLCJjIiwic2VtaXRvbmVEaXN0YW5jZSIsImQiLCJmZWF0dXJlRGlzdGFuY2UiLCJhIiwiYiIsImRvdCIsIm5hIiwibmIiLCJzcSIsImkiLCJjb3NpbmUiLCJzcXJ0IiwiZXVjbGlkZWFuIiwibm92ZWx0eUN1cnZlIiwiYmFuZHMiLCJjb3VudCIsIm5vdmVsdHkiLCJiZWZvcmUiLCJtYXAiLCJhZnRlciIsInBpY2tQZWFrcyIsIm1pbkdhcEZyYW1lcyIsImF2ZyIsInZhcmlhbmNlIiwic3RkIiwidGhyZXNob2xkIiwiY2FuZGlkYXRlcyIsInB1c2giLCJpbmRleCIsInZhbHVlIiwic29ydCIsImtlcHQiLCJldmVyeSIsImsiLCJhYnMiLCJsYWJlbFNlY3Rpb25zIiwiYm91bmRzIiwiZW5lcmd5IiwiYnJpZ2h0bmVzcyIsInJlZ2lzdGVyIiwibWFqb3JuZXNzIiwidGVuc2lvbiIsInJhdyIsInNsaWNlIiwic3RhcnRUIiwiZW5kVCIsImVuZXJnaWVzIiwicyIsImxvdWQiLCJxdWlldCIsInN0YXJ0TXMiLCJlbmRNcyIsImlzRmlyc3QiLCJpc0xhc3QiLCJwcmV2IiwibmV4dCIsImp1bXAiLCJpc0ltcGFjdCIsInJvbGUiLCJkZXJpdmVNb29kVGFncyIsImJwbSIsImR5bmFtaWNSYW5nZSIsImxvd0VuZCIsIm1vZGUiLCJ0YWdzIiwiY29uZm9ybSIsInN0cmlkZSIsInNyY0NvdW50IiwiYW5hbHl6ZVBjbSIsInBjbSIsInNhbXBsZVJhdGUiLCJvdmVycmlkZSIsImZyYW1lcyIsImR1cmF0aW9uTXMiLCJlc3RpbWF0ZWQiLCJmbHV4IiwidGVtcG8iLCJwaGFzZUZyYW1lcyIsImJlYXRQaGFzZU1zIiwibG9nQ2VudHJvaWQiLCJjZW50cm9pZCIsImxvZzIiLCJlbmVyZ3lOIiwicm1zIiwiYnJpZ2h0TiIsImxvd04iLCJsb3ciLCJtaWROIiwibWlkIiwiaGlnaE4iLCJoaWdoIiwidEVuZXJneSIsInRCcmlnaHQiLCJ0TG93IiwidE1pZCIsInRIaWdoIiwicGl0Y2hNaWRpIiwicGl0Y2giLCJ0UmVnaXN0ZXIiLCJ0Q2hyb21hIiwidE1ham9ybmVzcyIsInRUZW5zaW9uIiwicHJvZmlsZSIsIm1pbkdhcCIsInJvdW5kIiwicGVha3MiLCJmaWx0ZXIiLCJ2IiwiYXJyIiwic2VjdGlvbnMiLCJtZWFuRW5lcmd5IiwibWVhbkJyaWdodG5lc3MiLCJzb3J0ZWRFbmVyZ3kiLCJBcnJheSIsImtleSIsImtleUNoYW5nZXMiLCJwcmV2aW91cyIsInNlY3Rpb24iLCJjZWlsIiwibG9jYWwiLCJjb25maWRlbmNlIiwidG9uaWMiLCJhdE1zIiwidG9uaWNOYW1lIiwic2VtaXRvbmVzIiwicGl0Y2hTdW0iLCJzb3VuZGluZyIsIm1lYW5QaXRjaE1pZGkiLCJtZWFuVGVuc2lvbiIsImJlYXRNcyIsImVuZXJneUN1cnZlIiwiYnJpZ2h0bmVzc0N1cnZlIiwicmVnaXN0ZXJDdXJ2ZSIsIm1ham9ybmVzc0N1cnZlIiwidGVuc2lvbkN1cnZlIiwiY3VydmVIeiIsIm1vb2RUYWdzIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(app-pages-browser)/./app/lib/audio/analyze.ts\n"));

/***/ }),

/***/ "(app-pages-browser)/./app/lib/audio/analyze.worker.ts":
/*!*****************************************!*\
  !*** ./app/lib/audio/analyze.worker.ts ***!
  \*****************************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _analyze__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./analyze */ \"(app-pages-browser)/./app/lib/audio/analyze.ts\");\n\nself.onmessage = (event)=>{\n    const { pcm, sampleRate, override } = event.data;\n    try {\n        self.postMessage({\n            ok: true,\n            analysis: (0,_analyze__WEBPACK_IMPORTED_MODULE_0__.analyzePcm)(pcm, sampleRate, override)\n        });\n    } catch (error) {\n        self.postMessage({\n            ok: false,\n            error: error.message\n        });\n    }\n};\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL2FwcC9saWIvYXVkaW8vYW5hbHl6ZS53b3JrZXIudHMiLCJtYXBwaW5ncyI6Ijs7QUFBdUM7QUFHdkNDLEtBQUtDLFNBQVMsR0FBRyxDQUFDQztJQUNoQixNQUFNLEVBQUVDLEdBQUcsRUFBRUMsVUFBVSxFQUFFQyxRQUFRLEVBQUUsR0FBR0gsTUFBTUksSUFBSTtJQUNoRCxJQUFJO1FBQ0ZOLEtBQUtPLFdBQVcsQ0FBQztZQUFFQyxJQUFJO1lBQU1DLFVBQVVWLG9EQUFVQSxDQUFDSSxLQUFLQyxZQUFZQztRQUFVO0lBQy9FLEVBQUUsT0FBT0ssT0FBTztRQUNkVixLQUFLTyxXQUFXLENBQUM7WUFBRUMsSUFBSTtZQUFPRSxPQUFPLE1BQWlCQyxPQUFPO1FBQUM7SUFDaEU7QUFDRiIsInNvdXJjZXMiOlsiL1VzZXJzL21pbGFuL0Rvd25sb2Fkcy93bS93b3JsZHNjb3JlL2FwcC9saWIvYXVkaW8vYW5hbHl6ZS53b3JrZXIudHMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgYW5hbHl6ZVBjbSB9IGZyb20gXCIuL2FuYWx5emVcIjtcbmltcG9ydCB0eXBlIHsgQW5hbHl6ZVJlcXVlc3QgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG5zZWxmLm9ubWVzc2FnZSA9IChldmVudDogTWVzc2FnZUV2ZW50PEFuYWx5emVSZXF1ZXN0PikgPT4ge1xuICBjb25zdCB7IHBjbSwgc2FtcGxlUmF0ZSwgb3ZlcnJpZGUgfSA9IGV2ZW50LmRhdGE7XG4gIHRyeSB7XG4gICAgc2VsZi5wb3N0TWVzc2FnZSh7IG9rOiB0cnVlLCBhbmFseXNpczogYW5hbHl6ZVBjbShwY20sIHNhbXBsZVJhdGUsIG92ZXJyaWRlKSB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBzZWxmLnBvc3RNZXNzYWdlKHsgb2s6IGZhbHNlLCBlcnJvcjogKGVycm9yIGFzIEVycm9yKS5tZXNzYWdlIH0pO1xuICB9XG59O1xuIl0sIm5hbWVzIjpbImFuYWx5emVQY20iLCJzZWxmIiwib25tZXNzYWdlIiwiZXZlbnQiLCJwY20iLCJzYW1wbGVSYXRlIiwib3ZlcnJpZGUiLCJkYXRhIiwicG9zdE1lc3NhZ2UiLCJvayIsImFuYWx5c2lzIiwiZXJyb3IiLCJtZXNzYWdlIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(app-pages-browser)/./app/lib/audio/analyze.worker.ts\n"));

/***/ }),

/***/ "(app-pages-browser)/./app/lib/audio/dsp.ts":
/*!******************************!*\
  !*** ./app/lib/audio/dsp.ts ***!
  \******************************/
/***/ ((module, __webpack_exports__, __webpack_require__) => {

"use strict";
eval(__webpack_require__.ts("__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   PITCH_CLASS_NAMES: () => (/* binding */ PITCH_CLASS_NAMES),\n/* harmony export */   computeFrames: () => (/* binding */ computeFrames),\n/* harmony export */   detectKey: () => (/* binding */ detectKey),\n/* harmony export */   dissonance: () => (/* binding */ dissonance),\n/* harmony export */   estimateTempo: () => (/* binding */ estimateTempo),\n/* harmony export */   fft: () => (/* binding */ fft),\n/* harmony export */   hannWindow: () => (/* binding */ hannWindow),\n/* harmony export */   mean: () => (/* binding */ mean),\n/* harmony export */   meanChroma: () => (/* binding */ meanChroma),\n/* harmony export */   normalise: () => (/* binding */ normalise),\n/* harmony export */   smooth: () => (/* binding */ smooth)\n/* harmony export */ });\n// Minimal DSP kit: an in-place radix-2 FFT plus the frame-level features the\n// analyser needs. Kept dependency-free so it runs unchanged in a worker.\n/** In-place iterative radix-2 Cooley-Tukey FFT. `re`/`im` length must be a power of two. */ function fft(re, im) {\n    const n = re.length;\n    for(let i = 1, j = 0; i < n; i++){\n        let bit = n >> 1;\n        for(; j & bit; bit >>= 1)j ^= bit;\n        j ^= bit;\n        if (i < j) {\n            let t = re[i];\n            re[i] = re[j];\n            re[j] = t;\n            t = im[i];\n            im[i] = im[j];\n            im[j] = t;\n        }\n    }\n    for(let len = 2; len <= n; len <<= 1){\n        const ang = -2 * Math.PI / len;\n        const wRe = Math.cos(ang);\n        const wIm = Math.sin(ang);\n        for(let i = 0; i < n; i += len){\n            let curRe = 1;\n            let curIm = 0;\n            for(let k = 0; k < len >> 1; k++){\n                const aRe = re[i + k];\n                const aIm = im[i + k];\n                const bRe = re[i + k + (len >> 1)] * curRe - im[i + k + (len >> 1)] * curIm;\n                const bIm = re[i + k + (len >> 1)] * curIm + im[i + k + (len >> 1)] * curRe;\n                re[i + k] = aRe + bRe;\n                im[i + k] = aIm + bIm;\n                re[i + k + (len >> 1)] = aRe - bRe;\n                im[i + k + (len >> 1)] = aIm - bIm;\n                const nextRe = curRe * wRe - curIm * wIm;\n                curIm = curRe * wIm + curIm * wRe;\n                curRe = nextRe;\n            }\n        }\n    }\n}\nfunction hannWindow(size) {\n    const w = new Float32Array(size);\n    for(let i = 0; i < size; i++)w[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (size - 1)));\n    return w;\n}\n/** Lowest and highest note we let contribute to chroma and pitch height. */ const PITCH_MIN_HZ = 55; // A1\nconst PITCH_MAX_HZ = 2093; // C7\n/** Run an STFT over mono PCM and reduce each frame to a handful of features. */ function computeFrames(pcm, sampleRate) {\n    let frameSize = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : 2048, hop = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : 512;\n    const count = Math.max(1, Math.floor((pcm.length - frameSize) / hop) + 1);\n    const bins = frameSize >> 1;\n    const window = hannWindow(frameSize);\n    const binHz = sampleRate / frameSize;\n    // Band edges in bins. Low is kick/bass, high is hats/air.\n    const lowEnd = Math.max(1, Math.floor(150 / binHz));\n    const midEnd = Math.max(lowEnd + 1, Math.floor(2000 / binHz));\n    const highStart = Math.max(midEnd + 1, Math.floor(6000 / binHz));\n    const rms = new Float32Array(count);\n    const flux = new Float32Array(count);\n    const centroid = new Float32Array(count);\n    const low = new Float32Array(count);\n    const mid = new Float32Array(count);\n    const high = new Float32Array(count);\n    const chroma = new Float32Array(count * 12);\n    const pitch = new Float32Array(count);\n    // Bin -> pitch lookup, built once. -1 marks a bin outside the musical band,\n    // which skips both the sub-bass rumble and the harmonic wash up top where\n    // pitch-class estimates stop meaning anything.\n    const binPitchClass = new Int8Array(bins).fill(-1);\n    const binMidi = new Float32Array(bins);\n    for(let b = 1; b < bins; b++){\n        const hz = b * binHz;\n        if (hz < PITCH_MIN_HZ || hz > PITCH_MAX_HZ) continue;\n        const midi = 69 + 12 * Math.log2(hz / 440);\n        binMidi[b] = midi;\n        binPitchClass[b] = (Math.round(midi) % 12 + 12) % 12;\n    }\n    const re = new Float32Array(frameSize);\n    const im = new Float32Array(frameSize);\n    const mag = new Float32Array(bins);\n    const prevMag = new Float32Array(bins);\n    for(let f = 0; f < count; f++){\n        const off = f * hop;\n        let sumSq = 0;\n        for(let i = 0; i < frameSize; i++){\n            var _pcm_;\n            const s = (_pcm_ = pcm[off + i]) !== null && _pcm_ !== void 0 ? _pcm_ : 0;\n            sumSq += s * s;\n            re[i] = s * window[i];\n            im[i] = 0;\n        }\n        rms[f] = Math.sqrt(sumSq / frameSize);\n        fft(re, im);\n        let magSum = 0;\n        let weighted = 0;\n        let fluxSum = 0;\n        let lowSum = 0;\n        let midSum = 0;\n        let highSum = 0;\n        let pitchMag = 0;\n        let pitchWeighted = 0;\n        const chromaOff = f * 12;\n        for(let b = 0; b < bins; b++){\n            const m = Math.hypot(re[b], im[b]);\n            mag[b] = m;\n            magSum += m;\n            weighted += m * b * binHz;\n            const d = m - prevMag[b];\n            if (d > 0) fluxSum += d;\n            if (b < lowEnd) lowSum += m;\n            else if (b < midEnd) midSum += m;\n            else if (b >= highStart) highSum += m;\n            const pc = binPitchClass[b];\n            if (pc >= 0) {\n                chroma[chromaOff + pc] += m;\n                pitchMag += m;\n                pitchWeighted += m * binMidi[b];\n            }\n        }\n        flux[f] = fluxSum;\n        centroid[f] = magSum > 0 ? weighted / magSum : 0;\n        low[f] = lowSum;\n        mid[f] = midSum;\n        high[f] = highSum;\n        pitch[f] = pitchMag > 0 ? pitchWeighted / pitchMag : 0;\n        // Normalise each frame's profile so a loud bar and a quiet bar with the\n        // same harmony compare equal — key detection cares about shape, not level.\n        let chromaSum = 0;\n        for(let c = 0; c < 12; c++)chromaSum += chroma[chromaOff + c];\n        if (chromaSum > 0) {\n            for(let c = 0; c < 12; c++)chroma[chromaOff + c] /= chromaSum;\n        }\n        prevMag.set(mag);\n    }\n    return {\n        fps: sampleRate / hop,\n        count,\n        rms,\n        flux,\n        centroid,\n        low,\n        mid,\n        high,\n        chroma,\n        pitch\n    };\n}\nconst PITCH_CLASS_NAMES = [\n    \"C\",\n    \"C#\",\n    \"D\",\n    \"D#\",\n    \"E\",\n    \"F\",\n    \"F#\",\n    \"G\",\n    \"G#\",\n    \"A\",\n    \"A#\",\n    \"B\"\n];\n/**\n * Krumhansl-Schmuckler key profiles: how strongly each scale degree is\n * expected to sound in a piece written in that key. Correlating a measured\n * chroma profile against all 24 rotations is the standard way to name a key.\n */ const MAJOR_PROFILE = [\n    6.35,\n    2.23,\n    3.48,\n    2.33,\n    4.38,\n    4.09,\n    2.52,\n    5.19,\n    2.39,\n    3.66,\n    2.29,\n    2.88\n];\nconst MINOR_PROFILE = [\n    6.33,\n    2.68,\n    3.52,\n    5.38,\n    2.6,\n    3.53,\n    2.54,\n    4.75,\n    3.98,\n    2.69,\n    3.34,\n    3.17\n];\n/**\n * Perceived roughness of each interval, indexed by semitone distance. Minor\n * seconds and major sevenths grate; fifths and thirds sit still. Used to turn\n * a chroma profile into a single \"how tense is this harmony\" number.\n */ const INTERVAL_DISSONANCE = [\n    0,\n    1.0,\n    0.55,\n    0.25,\n    0.2,\n    0.15,\n    0.75,\n    0.05,\n    0.25,\n    0.2,\n    0.5,\n    0.9\n];\nfunction correlate(a, b, rotation) {\n    let sumA = 0;\n    let sumB = 0;\n    for(let i = 0; i < 12; i++){\n        sumA += a[i];\n        sumB += b[(i + rotation) % 12];\n    }\n    const meanA = sumA / 12;\n    const meanB = sumB / 12;\n    let num = 0;\n    let denA = 0;\n    let denB = 0;\n    for(let i = 0; i < 12; i++){\n        const da = a[i] - meanA;\n        const db = b[(i + rotation) % 12] - meanB;\n        num += da * db;\n        denA += da * da;\n        denB += db * db;\n    }\n    const den = Math.sqrt(denA * denB);\n    return den > 1e-9 ? num / den : 0;\n}\n/**\n * Name the key of a 12-bin chroma profile by best-fitting profile rotation.\n * `majorness` is kept continuous rather than binary so the season can sit\n * between two states instead of snapping, which is what stops it flickering.\n */ function detectKey(profile) {\n    let bestMajor = -Infinity;\n    let bestMajorTonic = 0;\n    let bestMinor = -Infinity;\n    let bestMinorTonic = 0;\n    for(let rotation = 0; rotation < 12; rotation++){\n        // Rotating the profile by `r` tests the key whose tonic is pitch class `r`.\n        const maj = correlate(profile, MAJOR_PROFILE, (12 - rotation) % 12);\n        const min = correlate(profile, MINOR_PROFILE, (12 - rotation) % 12);\n        if (maj > bestMajor) {\n            bestMajor = maj;\n            bestMajorTonic = rotation;\n        }\n        if (min > bestMinor) {\n            bestMinor = min;\n            bestMinorTonic = rotation;\n        }\n    }\n    const isMajor = bestMajor >= bestMinor;\n    const tonic = isMajor ? bestMajorTonic : bestMinorTonic;\n    return {\n        tonic,\n        tonicName: PITCH_CLASS_NAMES[tonic],\n        mode: isMajor ? \"major\" : \"minor\",\n        majorness: Math.max(-1, Math.min(1, bestMajor - bestMinor)),\n        confidence: Math.max(0, Math.min(1, isMajor ? bestMajor : bestMinor))\n    };\n}\n/**\n * How rough a chroma profile sounds, 0..1. Every pair of sounding pitch\n * classes contributes its interval's roughness, weighted by how present both\n * are, so a bare fifth scores near zero and a cluster scores high.\n */ function dissonance(profile) {\n    let total = 0;\n    let weight = 0;\n    for(let i = 0; i < 12; i++){\n        for(let j = i + 1; j < 12; j++){\n            const pair = profile[i] * profile[j];\n            total += pair * INTERVAL_DISSONANCE[j - i];\n            weight += pair;\n        }\n    }\n    return weight > 1e-9 ? Math.min(1, total / weight) : 0;\n}\n/** Average the per-frame chroma profiles across a frame range into one profile. */ function meanChroma(chroma, from, to) {\n    const out = new Array(12).fill(0);\n    const n = Math.max(1, to - from);\n    for(let f = from; f < to; f++){\n        const off = f * 12;\n        for(let c = 0; c < 12; c++)out[c] += chroma[off + c];\n    }\n    for(let c = 0; c < 12; c++)out[c] /= n;\n    return out;\n}\n/** Scale a series into 0..1 using robust percentile bounds, so one spike can't flatten it. */ function normalise(src) {\n    const out = new Float32Array(src.length);\n    if (src.length === 0) return out;\n    const sorted = Array.from(src).sort((a, b)=>a - b);\n    const lo = sorted[Math.floor(sorted.length * 0.02)];\n    const hi = sorted[Math.floor(sorted.length * 0.98)];\n    const span = hi - lo;\n    if (span <= 1e-9) return out;\n    for(let i = 0; i < src.length; i++){\n        out[i] = Math.min(1, Math.max(0, (src[i] - lo) / span));\n    }\n    return out;\n}\nfunction smooth(src, radius) {\n    const out = new Float32Array(src.length);\n    for(let i = 0; i < src.length; i++){\n        let sum = 0;\n        let n = 0;\n        for(let j = Math.max(0, i - radius); j <= Math.min(src.length - 1, i + radius); j++){\n            sum += src[j];\n            n++;\n        }\n        out[i] = sum / n;\n    }\n    return out;\n}\nfunction mean(src) {\n    let from = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 0, to = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : src.length;\n    if (to <= from) return 0;\n    let sum = 0;\n    for(let i = from; i < to; i++)sum += src[i];\n    return sum / (to - from);\n}\n/**\n * Tempo via autocorrelation of the onset envelope, searched over 60-180 BPM.\n * Returns the period in frames alongside the beat phase, so cues can be\n * quantised onto the grid rather than landing between beats.\n */ function estimateTempo(flux, fps) {\n    const minBpm = 60;\n    const maxBpm = 180;\n    const minLag = Math.floor(60 / maxBpm * fps);\n    const maxLag = Math.ceil(60 / minBpm * fps);\n    const env = normalise(smooth(flux, 1));\n    const avg = mean(env);\n    const centred = new Float32Array(env.length);\n    for(let i = 0; i < env.length; i++)centred[i] = env[i] - avg;\n    let bestLag = minLag;\n    let bestScore = -Infinity;\n    for(let lag = minLag; lag <= maxLag; lag++){\n        let acc = 0;\n        for(let i = 0; i + lag < centred.length; i++)acc += centred[i] * centred[i + lag];\n        // Normalise by overlap so long lags aren't penalised, and gently favour\n        // the 90-140 BPM range where most music actually sits.\n        const overlap = centred.length - lag;\n        if (overlap <= 0) continue;\n        const bpm = 60 * fps / lag;\n        const prior = 1 - 0.25 * Math.min(1, Math.abs(Math.log2(bpm / 115)));\n        const score = acc / overlap * prior;\n        if (score > bestScore) {\n            bestScore = score;\n            bestLag = lag;\n        }\n    }\n    // Phase: slide a pulse train over the envelope and keep the best alignment.\n    let bestPhase = 0;\n    let bestPhaseScore = -Infinity;\n    for(let p = 0; p < bestLag; p++){\n        let acc = 0;\n        for(let i = p; i < env.length; i += bestLag)acc += env[i];\n        if (acc > bestPhaseScore) {\n            bestPhaseScore = acc;\n            bestPhase = p;\n        }\n    }\n    return {\n        bpm: 60 * fps / bestLag,\n        periodFrames: bestLag,\n        phaseFrames: bestPhase\n    };\n}\n\n\n;\n    // Wrapped in an IIFE to avoid polluting the global scope\n    ;\n    (function () {\n        var _a, _b;\n        // Legacy CSS implementations will `eval` browser code in a Node.js context\n        // to extract CSS. For backwards compatibility, we need to check we're in a\n        // browser context before continuing.\n        if (typeof self !== 'undefined' &&\n            // AMP / No-JS mode does not inject these helpers:\n            '$RefreshHelpers$' in self) {\n            // @ts-ignore __webpack_module__ is global\n            var currentExports = module.exports;\n            // @ts-ignore __webpack_module__ is global\n            var prevSignature = (_b = (_a = module.hot.data) === null || _a === void 0 ? void 0 : _a.prevSignature) !== null && _b !== void 0 ? _b : null;\n            // This cannot happen in MainTemplate because the exports mismatch between\n            // templating and execution.\n            self.$RefreshHelpers$.registerExportsForReactRefresh(currentExports, module.id);\n            // A module can be accepted automatically based on its exports, e.g. when\n            // it is a Refresh Boundary.\n            if (self.$RefreshHelpers$.isReactRefreshBoundary(currentExports)) {\n                // Save the previous exports signature on update so we can compare the boundary\n                // signatures. We avoid saving exports themselves since it causes memory leaks (https://github.com/vercel/next.js/pull/53797)\n                module.hot.dispose(function (data) {\n                    data.prevSignature =\n                        self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports);\n                });\n                // Unconditionally accept an update to this module, we'll check if it's\n                // still a Refresh Boundary later.\n                // @ts-ignore importMeta is replaced in the loader\n                module.hot.accept();\n                // This field is set when the previous version of this module was a\n                // Refresh Boundary, letting us know we need to check for invalidation or\n                // enqueue an update.\n                if (prevSignature !== null) {\n                    // A boundary can become ineligible if its exports are incompatible\n                    // with the previous exports.\n                    //\n                    // For example, if you add/remove/change exports, we'll want to\n                    // re-execute the importing modules, and force those components to\n                    // re-render. Similarly, if you convert a class component to a\n                    // function, we want to invalidate the boundary.\n                    if (self.$RefreshHelpers$.shouldInvalidateReactRefreshBoundary(prevSignature, self.$RefreshHelpers$.getRefreshBoundarySignature(currentExports))) {\n                        module.hot.invalidate();\n                    }\n                    else {\n                        self.$RefreshHelpers$.scheduleUpdate();\n                    }\n                }\n            }\n            else {\n                // Since we just executed the code for the module, it's possible that the\n                // new exports made it ineligible for being a boundary.\n                // We only care about the case when we were _previously_ a boundary,\n                // because we already accepted this update (accidental side effect).\n                var isNoLongerABoundary = prevSignature !== null;\n                if (isNoLongerABoundary) {\n                    module.hot.invalidate();\n                }\n            }\n        }\n    })();\n//# sourceURL=[module]\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiKGFwcC1wYWdlcy1icm93c2VyKS8uL2FwcC9saWIvYXVkaW8vZHNwLnRzIiwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7O0FBQUEsNkVBQTZFO0FBQzdFLHlFQUF5RTtBQUl6RSwwRkFBMEYsR0FDbkYsU0FBU0EsSUFBSUMsRUFBZ0IsRUFBRUMsRUFBZ0I7SUFDcEQsTUFBTUMsSUFBSUYsR0FBR0csTUFBTTtJQUVuQixJQUFLLElBQUlDLElBQUksR0FBR0MsSUFBSSxHQUFHRCxJQUFJRixHQUFHRSxJQUFLO1FBQ2pDLElBQUlFLE1BQU1KLEtBQUs7UUFDZixNQUFPRyxJQUFJQyxLQUFLQSxRQUFRLEVBQUdELEtBQUtDO1FBQ2hDRCxLQUFLQztRQUNMLElBQUlGLElBQUlDLEdBQUc7WUFDVCxJQUFJRSxJQUFJUCxFQUFFLENBQUNJLEVBQUU7WUFDYkosRUFBRSxDQUFDSSxFQUFFLEdBQUdKLEVBQUUsQ0FBQ0ssRUFBRTtZQUNiTCxFQUFFLENBQUNLLEVBQUUsR0FBR0U7WUFDUkEsSUFBSU4sRUFBRSxDQUFDRyxFQUFFO1lBQ1RILEVBQUUsQ0FBQ0csRUFBRSxHQUFHSCxFQUFFLENBQUNJLEVBQUU7WUFDYkosRUFBRSxDQUFDSSxFQUFFLEdBQUdFO1FBQ1Y7SUFDRjtJQUVBLElBQUssSUFBSUMsTUFBTSxHQUFHQSxPQUFPTixHQUFHTSxRQUFRLEVBQUc7UUFDckMsTUFBTUMsTUFBTSxDQUFFLElBQUlDLEtBQUtDLEVBQUUsR0FBSUg7UUFDN0IsTUFBTUksTUFBTUYsS0FBS0csR0FBRyxDQUFDSjtRQUNyQixNQUFNSyxNQUFNSixLQUFLSyxHQUFHLENBQUNOO1FBQ3JCLElBQUssSUFBSUwsSUFBSSxHQUFHQSxJQUFJRixHQUFHRSxLQUFLSSxJQUFLO1lBQy9CLElBQUlRLFFBQVE7WUFDWixJQUFJQyxRQUFRO1lBQ1osSUFBSyxJQUFJQyxJQUFJLEdBQUdBLElBQUlWLE9BQU8sR0FBR1UsSUFBSztnQkFDakMsTUFBTUMsTUFBTW5CLEVBQUUsQ0FBQ0ksSUFBSWMsRUFBRTtnQkFDckIsTUFBTUUsTUFBTW5CLEVBQUUsQ0FBQ0csSUFBSWMsRUFBRTtnQkFDckIsTUFBTUcsTUFBTXJCLEVBQUUsQ0FBQ0ksSUFBSWMsSUFBS1YsQ0FBQUEsT0FBTyxHQUFHLEdBQUdRLFFBQVFmLEVBQUUsQ0FBQ0csSUFBSWMsSUFBS1YsQ0FBQUEsT0FBTyxHQUFHLEdBQUdTO2dCQUN0RSxNQUFNSyxNQUFNdEIsRUFBRSxDQUFDSSxJQUFJYyxJQUFLVixDQUFBQSxPQUFPLEdBQUcsR0FBR1MsUUFBUWhCLEVBQUUsQ0FBQ0csSUFBSWMsSUFBS1YsQ0FBQUEsT0FBTyxHQUFHLEdBQUdRO2dCQUN0RWhCLEVBQUUsQ0FBQ0ksSUFBSWMsRUFBRSxHQUFHQyxNQUFNRTtnQkFDbEJwQixFQUFFLENBQUNHLElBQUljLEVBQUUsR0FBR0UsTUFBTUU7Z0JBQ2xCdEIsRUFBRSxDQUFDSSxJQUFJYyxJQUFLVixDQUFBQSxPQUFPLEdBQUcsR0FBR1csTUFBTUU7Z0JBQy9CcEIsRUFBRSxDQUFDRyxJQUFJYyxJQUFLVixDQUFBQSxPQUFPLEdBQUcsR0FBR1ksTUFBTUU7Z0JBQy9CLE1BQU1DLFNBQVNQLFFBQVFKLE1BQU1LLFFBQVFIO2dCQUNyQ0csUUFBUUQsUUFBUUYsTUFBTUcsUUFBUUw7Z0JBQzlCSSxRQUFRTztZQUNWO1FBQ0Y7SUFDRjtBQUNGO0FBRU8sU0FBU0MsV0FBV0MsSUFBWTtJQUNyQyxNQUFNQyxJQUFJLElBQUlDLGFBQWFGO0lBQzNCLElBQUssSUFBSXJCLElBQUksR0FBR0EsSUFBSXFCLE1BQU1yQixJQUFLc0IsQ0FBQyxDQUFDdEIsRUFBRSxHQUFHLE1BQU8sS0FBSU0sS0FBS0csR0FBRyxDQUFDLElBQUtILEtBQUtDLEVBQUUsR0FBR1AsSUFBTXFCLENBQUFBLE9BQU8sR0FBRTtJQUN4RixPQUFPQztBQUNUO0FBNkJBLDBFQUEwRSxHQUMxRSxNQUFNRSxlQUFlLElBQUksS0FBSztBQUM5QixNQUFNQyxlQUFlLE1BQU0sS0FBSztBQUVoQyw4RUFBOEUsR0FDdkUsU0FBU0MsY0FDZEMsR0FBaUIsRUFDakJDLFVBQWtCO1FBQ2xCQyxZQUFBQSxpRUFBWSxNQUNaQyxNQUFBQSxpRUFBTTtJQUVOLE1BQU1DLFFBQVF6QixLQUFLMEIsR0FBRyxDQUFDLEdBQUcxQixLQUFLMkIsS0FBSyxDQUFDLENBQUNOLElBQUk1QixNQUFNLEdBQUc4QixTQUFRLElBQUtDLE9BQU87SUFDdkUsTUFBTUksT0FBT0wsYUFBYTtJQUMxQixNQUFNTSxTQUFTZixXQUFXUztJQUMxQixNQUFNTyxRQUFRUixhQUFhQztJQUUzQiwwREFBMEQ7SUFDMUQsTUFBTVEsU0FBUy9CLEtBQUswQixHQUFHLENBQUMsR0FBRzFCLEtBQUsyQixLQUFLLENBQUMsTUFBTUc7SUFDNUMsTUFBTUUsU0FBU2hDLEtBQUswQixHQUFHLENBQUNLLFNBQVMsR0FBRy9CLEtBQUsyQixLQUFLLENBQUMsT0FBT0c7SUFDdEQsTUFBTUcsWUFBWWpDLEtBQUswQixHQUFHLENBQUNNLFNBQVMsR0FBR2hDLEtBQUsyQixLQUFLLENBQUMsT0FBT0c7SUFFekQsTUFBTUksTUFBTSxJQUFJakIsYUFBYVE7SUFDN0IsTUFBTVUsT0FBTyxJQUFJbEIsYUFBYVE7SUFDOUIsTUFBTVcsV0FBVyxJQUFJbkIsYUFBYVE7SUFDbEMsTUFBTVksTUFBTSxJQUFJcEIsYUFBYVE7SUFDN0IsTUFBTWEsTUFBTSxJQUFJckIsYUFBYVE7SUFDN0IsTUFBTWMsT0FBTyxJQUFJdEIsYUFBYVE7SUFDOUIsTUFBTWUsU0FBUyxJQUFJdkIsYUFBYVEsUUFBUTtJQUN4QyxNQUFNZ0IsUUFBUSxJQUFJeEIsYUFBYVE7SUFFL0IsNEVBQTRFO0lBQzVFLDBFQUEwRTtJQUMxRSwrQ0FBK0M7SUFDL0MsTUFBTWlCLGdCQUFnQixJQUFJQyxVQUFVZixNQUFNZ0IsSUFBSSxDQUFDLENBQUM7SUFDaEQsTUFBTUMsVUFBVSxJQUFJNUIsYUFBYVc7SUFDakMsSUFBSyxJQUFJa0IsSUFBSSxHQUFHQSxJQUFJbEIsTUFBTWtCLElBQUs7UUFDN0IsTUFBTUMsS0FBS0QsSUFBSWhCO1FBQ2YsSUFBSWlCLEtBQUs3QixnQkFBZ0I2QixLQUFLNUIsY0FBYztRQUM1QyxNQUFNNkIsT0FBTyxLQUFLLEtBQUtoRCxLQUFLaUQsSUFBSSxDQUFDRixLQUFLO1FBQ3RDRixPQUFPLENBQUNDLEVBQUUsR0FBR0U7UUFDYk4sYUFBYSxDQUFDSSxFQUFFLEdBQUcsQ0FBQyxLQUFNSSxLQUFLLENBQUNGLFFBQVEsS0FBTSxFQUFDLElBQUs7SUFDdEQ7SUFFQSxNQUFNMUQsS0FBSyxJQUFJMkIsYUFBYU07SUFDNUIsTUFBTWhDLEtBQUssSUFBSTBCLGFBQWFNO0lBQzVCLE1BQU00QixNQUFNLElBQUlsQyxhQUFhVztJQUM3QixNQUFNd0IsVUFBVSxJQUFJbkMsYUFBYVc7SUFFakMsSUFBSyxJQUFJeUIsSUFBSSxHQUFHQSxJQUFJNUIsT0FBTzRCLElBQUs7UUFDOUIsTUFBTUMsTUFBTUQsSUFBSTdCO1FBQ2hCLElBQUkrQixRQUFRO1FBQ1osSUFBSyxJQUFJN0QsSUFBSSxHQUFHQSxJQUFJNkIsV0FBVzdCLElBQUs7Z0JBQ3hCMkI7WUFBVixNQUFNbUMsSUFBSW5DLENBQUFBLFFBQUFBLEdBQUcsQ0FBQ2lDLE1BQU01RCxFQUFFLGNBQVoyQixtQkFBQUEsUUFBZ0I7WUFDMUJrQyxTQUFTQyxJQUFJQTtZQUNibEUsRUFBRSxDQUFDSSxFQUFFLEdBQUc4RCxJQUFJM0IsTUFBTSxDQUFDbkMsRUFBRTtZQUNyQkgsRUFBRSxDQUFDRyxFQUFFLEdBQUc7UUFDVjtRQUNBd0MsR0FBRyxDQUFDbUIsRUFBRSxHQUFHckQsS0FBS3lELElBQUksQ0FBQ0YsUUFBUWhDO1FBRTNCbEMsSUFBSUMsSUFBSUM7UUFFUixJQUFJbUUsU0FBUztRQUNiLElBQUlDLFdBQVc7UUFDZixJQUFJQyxVQUFVO1FBQ2QsSUFBSUMsU0FBUztRQUNiLElBQUlDLFNBQVM7UUFDYixJQUFJQyxVQUFVO1FBQ2QsSUFBSUMsV0FBVztRQUNmLElBQUlDLGdCQUFnQjtRQUVwQixNQUFNQyxZQUFZYixJQUFJO1FBRXRCLElBQUssSUFBSVAsSUFBSSxHQUFHQSxJQUFJbEIsTUFBTWtCLElBQUs7WUFDN0IsTUFBTXFCLElBQUluRSxLQUFLb0UsS0FBSyxDQUFDOUUsRUFBRSxDQUFDd0QsRUFBRSxFQUFFdkQsRUFBRSxDQUFDdUQsRUFBRTtZQUNqQ0ssR0FBRyxDQUFDTCxFQUFFLEdBQUdxQjtZQUNUVCxVQUFVUztZQUNWUixZQUFZUSxJQUFJckIsSUFBSWhCO1lBQ3BCLE1BQU11QyxJQUFJRixJQUFJZixPQUFPLENBQUNOLEVBQUU7WUFDeEIsSUFBSXVCLElBQUksR0FBR1QsV0FBV1M7WUFDdEIsSUFBSXZCLElBQUlmLFFBQVE4QixVQUFVTTtpQkFDckIsSUFBSXJCLElBQUlkLFFBQVE4QixVQUFVSztpQkFDMUIsSUFBSXJCLEtBQUtiLFdBQVc4QixXQUFXSTtZQUVwQyxNQUFNRyxLQUFLNUIsYUFBYSxDQUFDSSxFQUFFO1lBQzNCLElBQUl3QixNQUFNLEdBQUc7Z0JBQ1g5QixNQUFNLENBQUMwQixZQUFZSSxHQUFHLElBQUlIO2dCQUMxQkgsWUFBWUc7Z0JBQ1pGLGlCQUFpQkUsSUFBSXRCLE9BQU8sQ0FBQ0MsRUFBRTtZQUNqQztRQUNGO1FBRUFYLElBQUksQ0FBQ2tCLEVBQUUsR0FBR087UUFDVnhCLFFBQVEsQ0FBQ2lCLEVBQUUsR0FBR0ssU0FBUyxJQUFJQyxXQUFXRCxTQUFTO1FBQy9DckIsR0FBRyxDQUFDZ0IsRUFBRSxHQUFHUTtRQUNUdkIsR0FBRyxDQUFDZSxFQUFFLEdBQUdTO1FBQ1R2QixJQUFJLENBQUNjLEVBQUUsR0FBR1U7UUFDVnRCLEtBQUssQ0FBQ1ksRUFBRSxHQUFHVyxXQUFXLElBQUlDLGdCQUFnQkQsV0FBVztRQUVyRCx3RUFBd0U7UUFDeEUsMkVBQTJFO1FBQzNFLElBQUlPLFlBQVk7UUFDaEIsSUFBSyxJQUFJQyxJQUFJLEdBQUdBLElBQUksSUFBSUEsSUFBS0QsYUFBYS9CLE1BQU0sQ0FBQzBCLFlBQVlNLEVBQUU7UUFDL0QsSUFBSUQsWUFBWSxHQUFHO1lBQ2pCLElBQUssSUFBSUMsSUFBSSxHQUFHQSxJQUFJLElBQUlBLElBQUtoQyxNQUFNLENBQUMwQixZQUFZTSxFQUFFLElBQUlEO1FBQ3hEO1FBRUFuQixRQUFRcUIsR0FBRyxDQUFDdEI7SUFDZDtJQUVBLE9BQU87UUFBRXVCLEtBQUtwRCxhQUFhRTtRQUFLQztRQUFPUztRQUFLQztRQUFNQztRQUFVQztRQUFLQztRQUFLQztRQUFNQztRQUFRQztJQUFNO0FBQzVGO0FBRU8sTUFBTWtDLG9CQUFvQjtJQUMvQjtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7SUFDQTtJQUNBO0lBQ0E7Q0FDRCxDQUFVO0FBRVg7Ozs7Q0FJQyxHQUNELE1BQU1DLGdCQUFnQjtJQUFDO0lBQU07SUFBTTtJQUFNO0lBQU07SUFBTTtJQUFNO0lBQU07SUFBTTtJQUFNO0lBQU07SUFBTTtDQUFLO0FBQzlGLE1BQU1DLGdCQUFnQjtJQUFDO0lBQU07SUFBTTtJQUFNO0lBQU07SUFBSztJQUFNO0lBQU07SUFBTTtJQUFNO0lBQU07SUFBTTtDQUFLO0FBRTdGOzs7O0NBSUMsR0FDRCxNQUFNQyxzQkFBc0I7SUFBQztJQUFHO0lBQUs7SUFBTTtJQUFNO0lBQUs7SUFBTTtJQUFNO0lBQU07SUFBTTtJQUFLO0lBQUs7Q0FBSTtBQUU1RixTQUFTQyxVQUFVQyxDQUFvQixFQUFFbEMsQ0FBb0IsRUFBRW1DLFFBQWdCO0lBQzdFLElBQUlDLE9BQU87SUFDWCxJQUFJQyxPQUFPO0lBQ1gsSUFBSyxJQUFJekYsSUFBSSxHQUFHQSxJQUFJLElBQUlBLElBQUs7UUFDM0J3RixRQUFRRixDQUFDLENBQUN0RixFQUFFO1FBQ1p5RixRQUFRckMsQ0FBQyxDQUFDLENBQUNwRCxJQUFJdUYsUUFBTyxJQUFLLEdBQUc7SUFDaEM7SUFDQSxNQUFNRyxRQUFRRixPQUFPO0lBQ3JCLE1BQU1HLFFBQVFGLE9BQU87SUFFckIsSUFBSUcsTUFBTTtJQUNWLElBQUlDLE9BQU87SUFDWCxJQUFJQyxPQUFPO0lBQ1gsSUFBSyxJQUFJOUYsSUFBSSxHQUFHQSxJQUFJLElBQUlBLElBQUs7UUFDM0IsTUFBTStGLEtBQUtULENBQUMsQ0FBQ3RGLEVBQUUsR0FBRzBGO1FBQ2xCLE1BQU1NLEtBQUs1QyxDQUFDLENBQUMsQ0FBQ3BELElBQUl1RixRQUFPLElBQUssR0FBRyxHQUFHSTtRQUNwQ0MsT0FBT0csS0FBS0M7UUFDWkgsUUFBUUUsS0FBS0E7UUFDYkQsUUFBUUUsS0FBS0E7SUFDZjtJQUNBLE1BQU1DLE1BQU0zRixLQUFLeUQsSUFBSSxDQUFDOEIsT0FBT0M7SUFDN0IsT0FBT0csTUFBTSxPQUFPTCxNQUFNSyxNQUFNO0FBQ2xDO0FBRUE7Ozs7Q0FJQyxHQUNNLFNBQVNDLFVBQVVDLE9BQTBCO0lBQ2xELElBQUlDLFlBQVksQ0FBQ0M7SUFDakIsSUFBSUMsaUJBQWlCO0lBQ3JCLElBQUlDLFlBQVksQ0FBQ0Y7SUFDakIsSUFBSUcsaUJBQWlCO0lBRXJCLElBQUssSUFBSWpCLFdBQVcsR0FBR0EsV0FBVyxJQUFJQSxXQUFZO1FBQ2hELDRFQUE0RTtRQUM1RSxNQUFNa0IsTUFBTXBCLFVBQVVjLFNBQVNqQixlQUFlLENBQUMsS0FBS0ssUUFBTyxJQUFLO1FBQ2hFLE1BQU1tQixNQUFNckIsVUFBVWMsU0FBU2hCLGVBQWUsQ0FBQyxLQUFLSSxRQUFPLElBQUs7UUFDaEUsSUFBSWtCLE1BQU1MLFdBQVc7WUFDbkJBLFlBQVlLO1lBQ1pILGlCQUFpQmY7UUFDbkI7UUFDQSxJQUFJbUIsTUFBTUgsV0FBVztZQUNuQkEsWUFBWUc7WUFDWkYsaUJBQWlCakI7UUFDbkI7SUFDRjtJQUVBLE1BQU1vQixVQUFVUCxhQUFhRztJQUM3QixNQUFNSyxRQUFRRCxVQUFVTCxpQkFBaUJFO0lBRXpDLE9BQU87UUFDTEk7UUFDQUMsV0FBVzVCLGlCQUFpQixDQUFDMkIsTUFBTTtRQUNuQ0UsTUFBTUgsVUFBVSxVQUFVO1FBQzFCSSxXQUFXekcsS0FBSzBCLEdBQUcsQ0FBQyxDQUFDLEdBQUcxQixLQUFLb0csR0FBRyxDQUFDLEdBQUdOLFlBQVlHO1FBQ2hEUyxZQUFZMUcsS0FBSzBCLEdBQUcsQ0FBQyxHQUFHMUIsS0FBS29HLEdBQUcsQ0FBQyxHQUFHQyxVQUFVUCxZQUFZRztJQUM1RDtBQUNGO0FBRUE7Ozs7Q0FJQyxHQUNNLFNBQVNVLFdBQVdkLE9BQTBCO0lBQ25ELElBQUllLFFBQVE7SUFDWixJQUFJQyxTQUFTO0lBQ2IsSUFBSyxJQUFJbkgsSUFBSSxHQUFHQSxJQUFJLElBQUlBLElBQUs7UUFDM0IsSUFBSyxJQUFJQyxJQUFJRCxJQUFJLEdBQUdDLElBQUksSUFBSUEsSUFBSztZQUMvQixNQUFNbUgsT0FBT2pCLE9BQU8sQ0FBQ25HLEVBQUUsR0FBR21HLE9BQU8sQ0FBQ2xHLEVBQUU7WUFDcENpSCxTQUFTRSxPQUFPaEMsbUJBQW1CLENBQUNuRixJQUFJRCxFQUFFO1lBQzFDbUgsVUFBVUM7UUFDWjtJQUNGO0lBQ0EsT0FBT0QsU0FBUyxPQUFPN0csS0FBS29HLEdBQUcsQ0FBQyxHQUFHUSxRQUFRQyxVQUFVO0FBQ3ZEO0FBRUEsaUZBQWlGLEdBQzFFLFNBQVNFLFdBQVd2RSxNQUFvQixFQUFFd0UsSUFBWSxFQUFFQyxFQUFVO0lBQ3ZFLE1BQU1DLE1BQU0sSUFBSUMsTUFBYyxJQUFJdkUsSUFBSSxDQUFDO0lBQ3ZDLE1BQU1wRCxJQUFJUSxLQUFLMEIsR0FBRyxDQUFDLEdBQUd1RixLQUFLRDtJQUMzQixJQUFLLElBQUkzRCxJQUFJMkQsTUFBTTNELElBQUk0RCxJQUFJNUQsSUFBSztRQUM5QixNQUFNQyxNQUFNRCxJQUFJO1FBQ2hCLElBQUssSUFBSW1CLElBQUksR0FBR0EsSUFBSSxJQUFJQSxJQUFLMEMsR0FBRyxDQUFDMUMsRUFBRSxJQUFJaEMsTUFBTSxDQUFDYyxNQUFNa0IsRUFBRTtJQUN4RDtJQUNBLElBQUssSUFBSUEsSUFBSSxHQUFHQSxJQUFJLElBQUlBLElBQUswQyxHQUFHLENBQUMxQyxFQUFFLElBQUloRjtJQUN2QyxPQUFPMEg7QUFDVDtBQUVBLDRGQUE0RixHQUNyRixTQUFTRSxVQUFVQyxHQUFzQjtJQUM5QyxNQUFNSCxNQUFNLElBQUlqRyxhQUFhb0csSUFBSTVILE1BQU07SUFDdkMsSUFBSTRILElBQUk1SCxNQUFNLEtBQUssR0FBRyxPQUFPeUg7SUFDN0IsTUFBTUksU0FBU0gsTUFBTUgsSUFBSSxDQUFDSyxLQUFLRSxJQUFJLENBQUMsQ0FBQ3ZDLEdBQUdsQyxJQUFNa0MsSUFBSWxDO0lBQ2xELE1BQU0wRSxLQUFLRixNQUFNLENBQUN0SCxLQUFLMkIsS0FBSyxDQUFDMkYsT0FBTzdILE1BQU0sR0FBRyxNQUFNO0lBQ25ELE1BQU1nSSxLQUFLSCxNQUFNLENBQUN0SCxLQUFLMkIsS0FBSyxDQUFDMkYsT0FBTzdILE1BQU0sR0FBRyxNQUFNO0lBQ25ELE1BQU1pSSxPQUFPRCxLQUFLRDtJQUNsQixJQUFJRSxRQUFRLE1BQU0sT0FBT1I7SUFDekIsSUFBSyxJQUFJeEgsSUFBSSxHQUFHQSxJQUFJMkgsSUFBSTVILE1BQU0sRUFBRUMsSUFBSztRQUNuQ3dILEdBQUcsQ0FBQ3hILEVBQUUsR0FBR00sS0FBS29HLEdBQUcsQ0FBQyxHQUFHcEcsS0FBSzBCLEdBQUcsQ0FBQyxHQUFHLENBQUMyRixHQUFHLENBQUMzSCxFQUFFLEdBQUc4SCxFQUFDLElBQUtFO0lBQ25EO0lBQ0EsT0FBT1I7QUFDVDtBQUVPLFNBQVNTLE9BQU9OLEdBQXNCLEVBQUVPLE1BQWM7SUFDM0QsTUFBTVYsTUFBTSxJQUFJakcsYUFBYW9HLElBQUk1SCxNQUFNO0lBQ3ZDLElBQUssSUFBSUMsSUFBSSxHQUFHQSxJQUFJMkgsSUFBSTVILE1BQU0sRUFBRUMsSUFBSztRQUNuQyxJQUFJbUksTUFBTTtRQUNWLElBQUlySSxJQUFJO1FBQ1IsSUFBSyxJQUFJRyxJQUFJSyxLQUFLMEIsR0FBRyxDQUFDLEdBQUdoQyxJQUFJa0ksU0FBU2pJLEtBQUtLLEtBQUtvRyxHQUFHLENBQUNpQixJQUFJNUgsTUFBTSxHQUFHLEdBQUdDLElBQUlrSSxTQUFTakksSUFBSztZQUNwRmtJLE9BQU9SLEdBQUcsQ0FBQzFILEVBQUU7WUFDYkg7UUFDRjtRQUNBMEgsR0FBRyxDQUFDeEgsRUFBRSxHQUFHbUksTUFBTXJJO0lBQ2pCO0lBQ0EsT0FBTzBIO0FBQ1Q7QUFFTyxTQUFTWSxLQUFLVCxHQUFzQjtRQUFFTCxPQUFBQSxpRUFBTyxHQUFHQyxLQUFBQSxpRUFBS0ksSUFBSTVILE1BQU07SUFDcEUsSUFBSXdILE1BQU1ELE1BQU0sT0FBTztJQUN2QixJQUFJYSxNQUFNO0lBQ1YsSUFBSyxJQUFJbkksSUFBSXNILE1BQU10SCxJQUFJdUgsSUFBSXZILElBQUttSSxPQUFPUixHQUFHLENBQUMzSCxFQUFFO0lBQzdDLE9BQU9tSSxNQUFPWixDQUFBQSxLQUFLRCxJQUFHO0FBQ3hCO0FBRUE7Ozs7Q0FJQyxHQUNNLFNBQVNlLGNBQ2Q1RixJQUF1QixFQUN2QnVDLEdBQVc7SUFFWCxNQUFNc0QsU0FBUztJQUNmLE1BQU1DLFNBQVM7SUFDZixNQUFNQyxTQUFTbEksS0FBSzJCLEtBQUssQ0FBQyxLQUFNc0csU0FBVXZEO0lBQzFDLE1BQU15RCxTQUFTbkksS0FBS29JLElBQUksQ0FBQyxLQUFNSixTQUFVdEQ7SUFFekMsTUFBTTJELE1BQU1qQixVQUFVTyxPQUFPeEYsTUFBTTtJQUNuQyxNQUFNbUcsTUFBTVIsS0FBS087SUFDakIsTUFBTUUsVUFBVSxJQUFJdEgsYUFBYW9ILElBQUk1SSxNQUFNO0lBQzNDLElBQUssSUFBSUMsSUFBSSxHQUFHQSxJQUFJMkksSUFBSTVJLE1BQU0sRUFBRUMsSUFBSzZJLE9BQU8sQ0FBQzdJLEVBQUUsR0FBRzJJLEdBQUcsQ0FBQzNJLEVBQUUsR0FBRzRJO0lBRTNELElBQUlFLFVBQVVOO0lBQ2QsSUFBSU8sWUFBWSxDQUFDMUM7SUFDakIsSUFBSyxJQUFJMkMsTUFBTVIsUUFBUVEsT0FBT1AsUUFBUU8sTUFBTztRQUMzQyxJQUFJQyxNQUFNO1FBQ1YsSUFBSyxJQUFJakosSUFBSSxHQUFHQSxJQUFJZ0osTUFBTUgsUUFBUTlJLE1BQU0sRUFBRUMsSUFBS2lKLE9BQU9KLE9BQU8sQ0FBQzdJLEVBQUUsR0FBRzZJLE9BQU8sQ0FBQzdJLElBQUlnSixJQUFJO1FBQ25GLHdFQUF3RTtRQUN4RSx1REFBdUQ7UUFDdkQsTUFBTUUsVUFBVUwsUUFBUTlJLE1BQU0sR0FBR2lKO1FBQ2pDLElBQUlFLFdBQVcsR0FBRztRQUNsQixNQUFNQyxNQUFNLEtBQU1uRSxNQUFPZ0U7UUFDekIsTUFBTUksUUFBUSxJQUFJLE9BQU85SSxLQUFLb0csR0FBRyxDQUFDLEdBQUdwRyxLQUFLK0ksR0FBRyxDQUFDL0ksS0FBS2lELElBQUksQ0FBQzRGLE1BQU07UUFDOUQsTUFBTUcsUUFBUSxNQUFPSixVQUFXRTtRQUNoQyxJQUFJRSxRQUFRUCxXQUFXO1lBQ3JCQSxZQUFZTztZQUNaUixVQUFVRTtRQUNaO0lBQ0Y7SUFFQSw0RUFBNEU7SUFDNUUsSUFBSU8sWUFBWTtJQUNoQixJQUFJQyxpQkFBaUIsQ0FBQ25EO0lBQ3RCLElBQUssSUFBSW9ELElBQUksR0FBR0EsSUFBSVgsU0FBU1csSUFBSztRQUNoQyxJQUFJUixNQUFNO1FBQ1YsSUFBSyxJQUFJakosSUFBSXlKLEdBQUd6SixJQUFJMkksSUFBSTVJLE1BQU0sRUFBRUMsS0FBSzhJLFFBQVNHLE9BQU9OLEdBQUcsQ0FBQzNJLEVBQUU7UUFDM0QsSUFBSWlKLE1BQU1PLGdCQUFnQjtZQUN4QkEsaUJBQWlCUDtZQUNqQk0sWUFBWUU7UUFDZDtJQUNGO0lBRUEsT0FBTztRQUFFTixLQUFLLEtBQU1uRSxNQUFPOEQ7UUFBU1ksY0FBY1o7UUFBU2EsYUFBYUo7SUFBVTtBQUNwRiIsInNvdXJjZXMiOlsiL1VzZXJzL21pbGFuL0Rvd25sb2Fkcy93bS93b3JsZHNjb3JlL2FwcC9saWIvYXVkaW8vZHNwLnRzIl0sInNvdXJjZXNDb250ZW50IjpbIi8vIE1pbmltYWwgRFNQIGtpdDogYW4gaW4tcGxhY2UgcmFkaXgtMiBGRlQgcGx1cyB0aGUgZnJhbWUtbGV2ZWwgZmVhdHVyZXMgdGhlXG4vLyBhbmFseXNlciBuZWVkcy4gS2VwdCBkZXBlbmRlbmN5LWZyZWUgc28gaXQgcnVucyB1bmNoYW5nZWQgaW4gYSB3b3JrZXIuXG5cbmltcG9ydCB0eXBlIHsgS2V5RXN0aW1hdGUgfSBmcm9tIFwiLi90eXBlc1wiO1xuXG4vKiogSW4tcGxhY2UgaXRlcmF0aXZlIHJhZGl4LTIgQ29vbGV5LVR1a2V5IEZGVC4gYHJlYC9gaW1gIGxlbmd0aCBtdXN0IGJlIGEgcG93ZXIgb2YgdHdvLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZmdChyZTogRmxvYXQzMkFycmF5LCBpbTogRmxvYXQzMkFycmF5KTogdm9pZCB7XG4gIGNvbnN0IG4gPSByZS5sZW5ndGg7XG5cbiAgZm9yIChsZXQgaSA9IDEsIGogPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgbGV0IGJpdCA9IG4gPj4gMTtcbiAgICBmb3IgKDsgaiAmIGJpdDsgYml0ID4+PSAxKSBqIF49IGJpdDtcbiAgICBqIF49IGJpdDtcbiAgICBpZiAoaSA8IGopIHtcbiAgICAgIGxldCB0ID0gcmVbaV07XG4gICAgICByZVtpXSA9IHJlW2pdO1xuICAgICAgcmVbal0gPSB0O1xuICAgICAgdCA9IGltW2ldO1xuICAgICAgaW1baV0gPSBpbVtqXTtcbiAgICAgIGltW2pdID0gdDtcbiAgICB9XG4gIH1cblxuICBmb3IgKGxldCBsZW4gPSAyOyBsZW4gPD0gbjsgbGVuIDw8PSAxKSB7XG4gICAgY29uc3QgYW5nID0gKC0yICogTWF0aC5QSSkgLyBsZW47XG4gICAgY29uc3Qgd1JlID0gTWF0aC5jb3MoYW5nKTtcbiAgICBjb25zdCB3SW0gPSBNYXRoLnNpbihhbmcpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbjsgaSArPSBsZW4pIHtcbiAgICAgIGxldCBjdXJSZSA9IDE7XG4gICAgICBsZXQgY3VySW0gPSAwO1xuICAgICAgZm9yIChsZXQgayA9IDA7IGsgPCBsZW4gPj4gMTsgaysrKSB7XG4gICAgICAgIGNvbnN0IGFSZSA9IHJlW2kgKyBrXTtcbiAgICAgICAgY29uc3QgYUltID0gaW1baSArIGtdO1xuICAgICAgICBjb25zdCBiUmUgPSByZVtpICsgayArIChsZW4gPj4gMSldICogY3VyUmUgLSBpbVtpICsgayArIChsZW4gPj4gMSldICogY3VySW07XG4gICAgICAgIGNvbnN0IGJJbSA9IHJlW2kgKyBrICsgKGxlbiA+PiAxKV0gKiBjdXJJbSArIGltW2kgKyBrICsgKGxlbiA+PiAxKV0gKiBjdXJSZTtcbiAgICAgICAgcmVbaSArIGtdID0gYVJlICsgYlJlO1xuICAgICAgICBpbVtpICsga10gPSBhSW0gKyBiSW07XG4gICAgICAgIHJlW2kgKyBrICsgKGxlbiA+PiAxKV0gPSBhUmUgLSBiUmU7XG4gICAgICAgIGltW2kgKyBrICsgKGxlbiA+PiAxKV0gPSBhSW0gLSBiSW07XG4gICAgICAgIGNvbnN0IG5leHRSZSA9IGN1clJlICogd1JlIC0gY3VySW0gKiB3SW07XG4gICAgICAgIGN1ckltID0gY3VyUmUgKiB3SW0gKyBjdXJJbSAqIHdSZTtcbiAgICAgICAgY3VyUmUgPSBuZXh0UmU7XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBoYW5uV2luZG93KHNpemU6IG51bWJlcik6IEZsb2F0MzJBcnJheSB7XG4gIGNvbnN0IHcgPSBuZXcgRmxvYXQzMkFycmF5KHNpemUpO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHNpemU7IGkrKykgd1tpXSA9IDAuNSAqICgxIC0gTWF0aC5jb3MoKDIgKiBNYXRoLlBJICogaSkgLyAoc2l6ZSAtIDEpKSk7XG4gIHJldHVybiB3O1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZyYW1lcyB7XG4gIC8qKiBGcmFtZXMgcGVyIHNlY29uZCBvZiB0aGUgU1RGVC4gKi9cbiAgZnBzOiBudW1iZXI7XG4gIGNvdW50OiBudW1iZXI7XG4gIHJtczogRmxvYXQzMkFycmF5O1xuICAvKiogUG9zaXRpdmUgc3BlY3RyYWwgZmx1eCDigJQgdGhlIG9uc2V0IGVudmVsb3BlLiAqL1xuICBmbHV4OiBGbG9hdDMyQXJyYXk7XG4gIC8qKiBTcGVjdHJhbCBjZW50cm9pZCBpbiBIei4gKi9cbiAgY2VudHJvaWQ6IEZsb2F0MzJBcnJheTtcbiAgbG93OiBGbG9hdDMyQXJyYXk7XG4gIG1pZDogRmxvYXQzMkFycmF5O1xuICBoaWdoOiBGbG9hdDMyQXJyYXk7XG4gIC8qKlxuICAgKiAxMi1iaW4gcGl0Y2gtY2xhc3MgcHJvZmlsZSBwZXIgZnJhbWUsIGZsYXR0ZW5lZCB0byBgY291bnQgKiAxMmAuIEZyYW1lIGBmYFxuICAgKiBvY2N1cGllcyBgW2YgKiAxMiwgZiAqIDEyICsgMTIpYC4gVGhpcyBpcyB3aGF0IGtleSwgbW9kZSBhbmQgZGlzc29uYW5jZSBhcmVcbiAgICogcmVhZCBmcm9tIOKAlCB0aGUgaGFybW9uaWMgc2lnbmFsIHRoZSBjbGltYXRlIG1hcHBpbmcgcnVucyBvbi5cbiAgICovXG4gIGNocm9tYTogRmxvYXQzMkFycmF5O1xuICAvKipcbiAgICogTWFnbml0dWRlLXdlaWdodGVkIG1lYW4gTUlESSBwaXRjaCBwZXIgZnJhbWUsIG92ZXIgdGhlIG11c2ljYWwgYmFuZCBvbmx5LlxuICAgKiBVbmxpa2UgdGhlIHNwZWN0cmFsIGNlbnRyb2lkIHRoaXMgdHJhY2tzIGhvdyBoaWdoIHRoZSBtdXNpYyBpcyAqcGxheWVkKlxuICAgKiByYXRoZXIgdGhhbiBob3cgYnJpZ2h0IGl0IGlzICpwcm9kdWNlZCosIHNvIGEgbXV0ZWQgdHJ1bXBldCBhbmQgYSBicmlnaHRcbiAgICogc3ludGggcGxheWluZyB0aGUgc2FtZSBub3RlIGxhbmQgaW4gdGhlIHNhbWUgcGxhY2UuXG4gICAqL1xuICBwaXRjaDogRmxvYXQzMkFycmF5O1xufVxuXG4vKiogTG93ZXN0IGFuZCBoaWdoZXN0IG5vdGUgd2UgbGV0IGNvbnRyaWJ1dGUgdG8gY2hyb21hIGFuZCBwaXRjaCBoZWlnaHQuICovXG5jb25zdCBQSVRDSF9NSU5fSFogPSA1NTsgLy8gQTFcbmNvbnN0IFBJVENIX01BWF9IWiA9IDIwOTM7IC8vIEM3XG5cbi8qKiBSdW4gYW4gU1RGVCBvdmVyIG1vbm8gUENNIGFuZCByZWR1Y2UgZWFjaCBmcmFtZSB0byBhIGhhbmRmdWwgb2YgZmVhdHVyZXMuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcHV0ZUZyYW1lcyhcbiAgcGNtOiBGbG9hdDMyQXJyYXksXG4gIHNhbXBsZVJhdGU6IG51bWJlcixcbiAgZnJhbWVTaXplID0gMjA0OCxcbiAgaG9wID0gNTEyLFxuKTogRnJhbWVzIHtcbiAgY29uc3QgY291bnQgPSBNYXRoLm1heCgxLCBNYXRoLmZsb29yKChwY20ubGVuZ3RoIC0gZnJhbWVTaXplKSAvIGhvcCkgKyAxKTtcbiAgY29uc3QgYmlucyA9IGZyYW1lU2l6ZSA+PiAxO1xuICBjb25zdCB3aW5kb3cgPSBoYW5uV2luZG93KGZyYW1lU2l6ZSk7XG4gIGNvbnN0IGJpbkh6ID0gc2FtcGxlUmF0ZSAvIGZyYW1lU2l6ZTtcblxuICAvLyBCYW5kIGVkZ2VzIGluIGJpbnMuIExvdyBpcyBraWNrL2Jhc3MsIGhpZ2ggaXMgaGF0cy9haXIuXG4gIGNvbnN0IGxvd0VuZCA9IE1hdGgubWF4KDEsIE1hdGguZmxvb3IoMTUwIC8gYmluSHopKTtcbiAgY29uc3QgbWlkRW5kID0gTWF0aC5tYXgobG93RW5kICsgMSwgTWF0aC5mbG9vcigyMDAwIC8gYmluSHopKTtcbiAgY29uc3QgaGlnaFN0YXJ0ID0gTWF0aC5tYXgobWlkRW5kICsgMSwgTWF0aC5mbG9vcig2MDAwIC8gYmluSHopKTtcblxuICBjb25zdCBybXMgPSBuZXcgRmxvYXQzMkFycmF5KGNvdW50KTtcbiAgY29uc3QgZmx1eCA9IG5ldyBGbG9hdDMyQXJyYXkoY291bnQpO1xuICBjb25zdCBjZW50cm9pZCA9IG5ldyBGbG9hdDMyQXJyYXkoY291bnQpO1xuICBjb25zdCBsb3cgPSBuZXcgRmxvYXQzMkFycmF5KGNvdW50KTtcbiAgY29uc3QgbWlkID0gbmV3IEZsb2F0MzJBcnJheShjb3VudCk7XG4gIGNvbnN0IGhpZ2ggPSBuZXcgRmxvYXQzMkFycmF5KGNvdW50KTtcbiAgY29uc3QgY2hyb21hID0gbmV3IEZsb2F0MzJBcnJheShjb3VudCAqIDEyKTtcbiAgY29uc3QgcGl0Y2ggPSBuZXcgRmxvYXQzMkFycmF5KGNvdW50KTtcblxuICAvLyBCaW4gLT4gcGl0Y2ggbG9va3VwLCBidWlsdCBvbmNlLiAtMSBtYXJrcyBhIGJpbiBvdXRzaWRlIHRoZSBtdXNpY2FsIGJhbmQsXG4gIC8vIHdoaWNoIHNraXBzIGJvdGggdGhlIHN1Yi1iYXNzIHJ1bWJsZSBhbmQgdGhlIGhhcm1vbmljIHdhc2ggdXAgdG9wIHdoZXJlXG4gIC8vIHBpdGNoLWNsYXNzIGVzdGltYXRlcyBzdG9wIG1lYW5pbmcgYW55dGhpbmcuXG4gIGNvbnN0IGJpblBpdGNoQ2xhc3MgPSBuZXcgSW50OEFycmF5KGJpbnMpLmZpbGwoLTEpO1xuICBjb25zdCBiaW5NaWRpID0gbmV3IEZsb2F0MzJBcnJheShiaW5zKTtcbiAgZm9yIChsZXQgYiA9IDE7IGIgPCBiaW5zOyBiKyspIHtcbiAgICBjb25zdCBoeiA9IGIgKiBiaW5IejtcbiAgICBpZiAoaHogPCBQSVRDSF9NSU5fSFogfHwgaHogPiBQSVRDSF9NQVhfSFopIGNvbnRpbnVlO1xuICAgIGNvbnN0IG1pZGkgPSA2OSArIDEyICogTWF0aC5sb2cyKGh6IC8gNDQwKTtcbiAgICBiaW5NaWRpW2JdID0gbWlkaTtcbiAgICBiaW5QaXRjaENsYXNzW2JdID0gKChNYXRoLnJvdW5kKG1pZGkpICUgMTIpICsgMTIpICUgMTI7XG4gIH1cblxuICBjb25zdCByZSA9IG5ldyBGbG9hdDMyQXJyYXkoZnJhbWVTaXplKTtcbiAgY29uc3QgaW0gPSBuZXcgRmxvYXQzMkFycmF5KGZyYW1lU2l6ZSk7XG4gIGNvbnN0IG1hZyA9IG5ldyBGbG9hdDMyQXJyYXkoYmlucyk7XG4gIGNvbnN0IHByZXZNYWcgPSBuZXcgRmxvYXQzMkFycmF5KGJpbnMpO1xuXG4gIGZvciAobGV0IGYgPSAwOyBmIDwgY291bnQ7IGYrKykge1xuICAgIGNvbnN0IG9mZiA9IGYgKiBob3A7XG4gICAgbGV0IHN1bVNxID0gMDtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGZyYW1lU2l6ZTsgaSsrKSB7XG4gICAgICBjb25zdCBzID0gcGNtW29mZiArIGldID8/IDA7XG4gICAgICBzdW1TcSArPSBzICogcztcbiAgICAgIHJlW2ldID0gcyAqIHdpbmRvd1tpXTtcbiAgICAgIGltW2ldID0gMDtcbiAgICB9XG4gICAgcm1zW2ZdID0gTWF0aC5zcXJ0KHN1bVNxIC8gZnJhbWVTaXplKTtcblxuICAgIGZmdChyZSwgaW0pO1xuXG4gICAgbGV0IG1hZ1N1bSA9IDA7XG4gICAgbGV0IHdlaWdodGVkID0gMDtcbiAgICBsZXQgZmx1eFN1bSA9IDA7XG4gICAgbGV0IGxvd1N1bSA9IDA7XG4gICAgbGV0IG1pZFN1bSA9IDA7XG4gICAgbGV0IGhpZ2hTdW0gPSAwO1xuICAgIGxldCBwaXRjaE1hZyA9IDA7XG4gICAgbGV0IHBpdGNoV2VpZ2h0ZWQgPSAwO1xuXG4gICAgY29uc3QgY2hyb21hT2ZmID0gZiAqIDEyO1xuXG4gICAgZm9yIChsZXQgYiA9IDA7IGIgPCBiaW5zOyBiKyspIHtcbiAgICAgIGNvbnN0IG0gPSBNYXRoLmh5cG90KHJlW2JdLCBpbVtiXSk7XG4gICAgICBtYWdbYl0gPSBtO1xuICAgICAgbWFnU3VtICs9IG07XG4gICAgICB3ZWlnaHRlZCArPSBtICogYiAqIGJpbkh6O1xuICAgICAgY29uc3QgZCA9IG0gLSBwcmV2TWFnW2JdO1xuICAgICAgaWYgKGQgPiAwKSBmbHV4U3VtICs9IGQ7XG4gICAgICBpZiAoYiA8IGxvd0VuZCkgbG93U3VtICs9IG07XG4gICAgICBlbHNlIGlmIChiIDwgbWlkRW5kKSBtaWRTdW0gKz0gbTtcbiAgICAgIGVsc2UgaWYgKGIgPj0gaGlnaFN0YXJ0KSBoaWdoU3VtICs9IG07XG5cbiAgICAgIGNvbnN0IHBjID0gYmluUGl0Y2hDbGFzc1tiXTtcbiAgICAgIGlmIChwYyA+PSAwKSB7XG4gICAgICAgIGNocm9tYVtjaHJvbWFPZmYgKyBwY10gKz0gbTtcbiAgICAgICAgcGl0Y2hNYWcgKz0gbTtcbiAgICAgICAgcGl0Y2hXZWlnaHRlZCArPSBtICogYmluTWlkaVtiXTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmbHV4W2ZdID0gZmx1eFN1bTtcbiAgICBjZW50cm9pZFtmXSA9IG1hZ1N1bSA+IDAgPyB3ZWlnaHRlZCAvIG1hZ1N1bSA6IDA7XG4gICAgbG93W2ZdID0gbG93U3VtO1xuICAgIG1pZFtmXSA9IG1pZFN1bTtcbiAgICBoaWdoW2ZdID0gaGlnaFN1bTtcbiAgICBwaXRjaFtmXSA9IHBpdGNoTWFnID4gMCA/IHBpdGNoV2VpZ2h0ZWQgLyBwaXRjaE1hZyA6IDA7XG5cbiAgICAvLyBOb3JtYWxpc2UgZWFjaCBmcmFtZSdzIHByb2ZpbGUgc28gYSBsb3VkIGJhciBhbmQgYSBxdWlldCBiYXIgd2l0aCB0aGVcbiAgICAvLyBzYW1lIGhhcm1vbnkgY29tcGFyZSBlcXVhbCDigJQga2V5IGRldGVjdGlvbiBjYXJlcyBhYm91dCBzaGFwZSwgbm90IGxldmVsLlxuICAgIGxldCBjaHJvbWFTdW0gPSAwO1xuICAgIGZvciAobGV0IGMgPSAwOyBjIDwgMTI7IGMrKykgY2hyb21hU3VtICs9IGNocm9tYVtjaHJvbWFPZmYgKyBjXTtcbiAgICBpZiAoY2hyb21hU3VtID4gMCkge1xuICAgICAgZm9yIChsZXQgYyA9IDA7IGMgPCAxMjsgYysrKSBjaHJvbWFbY2hyb21hT2ZmICsgY10gLz0gY2hyb21hU3VtO1xuICAgIH1cblxuICAgIHByZXZNYWcuc2V0KG1hZyk7XG4gIH1cblxuICByZXR1cm4geyBmcHM6IHNhbXBsZVJhdGUgLyBob3AsIGNvdW50LCBybXMsIGZsdXgsIGNlbnRyb2lkLCBsb3csIG1pZCwgaGlnaCwgY2hyb21hLCBwaXRjaCB9O1xufVxuXG5leHBvcnQgY29uc3QgUElUQ0hfQ0xBU1NfTkFNRVMgPSBbXG4gIFwiQ1wiLFxuICBcIkMjXCIsXG4gIFwiRFwiLFxuICBcIkQjXCIsXG4gIFwiRVwiLFxuICBcIkZcIixcbiAgXCJGI1wiLFxuICBcIkdcIixcbiAgXCJHI1wiLFxuICBcIkFcIixcbiAgXCJBI1wiLFxuICBcIkJcIixcbl0gYXMgY29uc3Q7XG5cbi8qKlxuICogS3J1bWhhbnNsLVNjaG11Y2tsZXIga2V5IHByb2ZpbGVzOiBob3cgc3Ryb25nbHkgZWFjaCBzY2FsZSBkZWdyZWUgaXNcbiAqIGV4cGVjdGVkIHRvIHNvdW5kIGluIGEgcGllY2Ugd3JpdHRlbiBpbiB0aGF0IGtleS4gQ29ycmVsYXRpbmcgYSBtZWFzdXJlZFxuICogY2hyb21hIHByb2ZpbGUgYWdhaW5zdCBhbGwgMjQgcm90YXRpb25zIGlzIHRoZSBzdGFuZGFyZCB3YXkgdG8gbmFtZSBhIGtleS5cbiAqL1xuY29uc3QgTUFKT1JfUFJPRklMRSA9IFs2LjM1LCAyLjIzLCAzLjQ4LCAyLjMzLCA0LjM4LCA0LjA5LCAyLjUyLCA1LjE5LCAyLjM5LCAzLjY2LCAyLjI5LCAyLjg4XTtcbmNvbnN0IE1JTk9SX1BST0ZJTEUgPSBbNi4zMywgMi42OCwgMy41MiwgNS4zOCwgMi42LCAzLjUzLCAyLjU0LCA0Ljc1LCAzLjk4LCAyLjY5LCAzLjM0LCAzLjE3XTtcblxuLyoqXG4gKiBQZXJjZWl2ZWQgcm91Z2huZXNzIG9mIGVhY2ggaW50ZXJ2YWwsIGluZGV4ZWQgYnkgc2VtaXRvbmUgZGlzdGFuY2UuIE1pbm9yXG4gKiBzZWNvbmRzIGFuZCBtYWpvciBzZXZlbnRocyBncmF0ZTsgZmlmdGhzIGFuZCB0aGlyZHMgc2l0IHN0aWxsLiBVc2VkIHRvIHR1cm5cbiAqIGEgY2hyb21hIHByb2ZpbGUgaW50byBhIHNpbmdsZSBcImhvdyB0ZW5zZSBpcyB0aGlzIGhhcm1vbnlcIiBudW1iZXIuXG4gKi9cbmNvbnN0IElOVEVSVkFMX0RJU1NPTkFOQ0UgPSBbMCwgMS4wLCAwLjU1LCAwLjI1LCAwLjIsIDAuMTUsIDAuNzUsIDAuMDUsIDAuMjUsIDAuMiwgMC41LCAwLjldO1xuXG5mdW5jdGlvbiBjb3JyZWxhdGUoYTogQXJyYXlMaWtlPG51bWJlcj4sIGI6IEFycmF5TGlrZTxudW1iZXI+LCByb3RhdGlvbjogbnVtYmVyKTogbnVtYmVyIHtcbiAgbGV0IHN1bUEgPSAwO1xuICBsZXQgc3VtQiA9IDA7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgMTI7IGkrKykge1xuICAgIHN1bUEgKz0gYVtpXTtcbiAgICBzdW1CICs9IGJbKGkgKyByb3RhdGlvbikgJSAxMl07XG4gIH1cbiAgY29uc3QgbWVhbkEgPSBzdW1BIC8gMTI7XG4gIGNvbnN0IG1lYW5CID0gc3VtQiAvIDEyO1xuXG4gIGxldCBudW0gPSAwO1xuICBsZXQgZGVuQSA9IDA7XG4gIGxldCBkZW5CID0gMDtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCAxMjsgaSsrKSB7XG4gICAgY29uc3QgZGEgPSBhW2ldIC0gbWVhbkE7XG4gICAgY29uc3QgZGIgPSBiWyhpICsgcm90YXRpb24pICUgMTJdIC0gbWVhbkI7XG4gICAgbnVtICs9IGRhICogZGI7XG4gICAgZGVuQSArPSBkYSAqIGRhO1xuICAgIGRlbkIgKz0gZGIgKiBkYjtcbiAgfVxuICBjb25zdCBkZW4gPSBNYXRoLnNxcnQoZGVuQSAqIGRlbkIpO1xuICByZXR1cm4gZGVuID4gMWUtOSA/IG51bSAvIGRlbiA6IDA7XG59XG5cbi8qKlxuICogTmFtZSB0aGUga2V5IG9mIGEgMTItYmluIGNocm9tYSBwcm9maWxlIGJ5IGJlc3QtZml0dGluZyBwcm9maWxlIHJvdGF0aW9uLlxuICogYG1ham9ybmVzc2AgaXMga2VwdCBjb250aW51b3VzIHJhdGhlciB0aGFuIGJpbmFyeSBzbyB0aGUgc2Vhc29uIGNhbiBzaXRcbiAqIGJldHdlZW4gdHdvIHN0YXRlcyBpbnN0ZWFkIG9mIHNuYXBwaW5nLCB3aGljaCBpcyB3aGF0IHN0b3BzIGl0IGZsaWNrZXJpbmcuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBkZXRlY3RLZXkocHJvZmlsZTogQXJyYXlMaWtlPG51bWJlcj4pOiBLZXlFc3RpbWF0ZSB7XG4gIGxldCBiZXN0TWFqb3IgPSAtSW5maW5pdHk7XG4gIGxldCBiZXN0TWFqb3JUb25pYyA9IDA7XG4gIGxldCBiZXN0TWlub3IgPSAtSW5maW5pdHk7XG4gIGxldCBiZXN0TWlub3JUb25pYyA9IDA7XG5cbiAgZm9yIChsZXQgcm90YXRpb24gPSAwOyByb3RhdGlvbiA8IDEyOyByb3RhdGlvbisrKSB7XG4gICAgLy8gUm90YXRpbmcgdGhlIHByb2ZpbGUgYnkgYHJgIHRlc3RzIHRoZSBrZXkgd2hvc2UgdG9uaWMgaXMgcGl0Y2ggY2xhc3MgYHJgLlxuICAgIGNvbnN0IG1haiA9IGNvcnJlbGF0ZShwcm9maWxlLCBNQUpPUl9QUk9GSUxFLCAoMTIgLSByb3RhdGlvbikgJSAxMik7XG4gICAgY29uc3QgbWluID0gY29ycmVsYXRlKHByb2ZpbGUsIE1JTk9SX1BST0ZJTEUsICgxMiAtIHJvdGF0aW9uKSAlIDEyKTtcbiAgICBpZiAobWFqID4gYmVzdE1ham9yKSB7XG4gICAgICBiZXN0TWFqb3IgPSBtYWo7XG4gICAgICBiZXN0TWFqb3JUb25pYyA9IHJvdGF0aW9uO1xuICAgIH1cbiAgICBpZiAobWluID4gYmVzdE1pbm9yKSB7XG4gICAgICBiZXN0TWlub3IgPSBtaW47XG4gICAgICBiZXN0TWlub3JUb25pYyA9IHJvdGF0aW9uO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGlzTWFqb3IgPSBiZXN0TWFqb3IgPj0gYmVzdE1pbm9yO1xuICBjb25zdCB0b25pYyA9IGlzTWFqb3IgPyBiZXN0TWFqb3JUb25pYyA6IGJlc3RNaW5vclRvbmljO1xuXG4gIHJldHVybiB7XG4gICAgdG9uaWMsXG4gICAgdG9uaWNOYW1lOiBQSVRDSF9DTEFTU19OQU1FU1t0b25pY10sXG4gICAgbW9kZTogaXNNYWpvciA/IFwibWFqb3JcIiA6IFwibWlub3JcIixcbiAgICBtYWpvcm5lc3M6IE1hdGgubWF4KC0xLCBNYXRoLm1pbigxLCBiZXN0TWFqb3IgLSBiZXN0TWlub3IpKSxcbiAgICBjb25maWRlbmNlOiBNYXRoLm1heCgwLCBNYXRoLm1pbigxLCBpc01ham9yID8gYmVzdE1ham9yIDogYmVzdE1pbm9yKSksXG4gIH07XG59XG5cbi8qKlxuICogSG93IHJvdWdoIGEgY2hyb21hIHByb2ZpbGUgc291bmRzLCAwLi4xLiBFdmVyeSBwYWlyIG9mIHNvdW5kaW5nIHBpdGNoXG4gKiBjbGFzc2VzIGNvbnRyaWJ1dGVzIGl0cyBpbnRlcnZhbCdzIHJvdWdobmVzcywgd2VpZ2h0ZWQgYnkgaG93IHByZXNlbnQgYm90aFxuICogYXJlLCBzbyBhIGJhcmUgZmlmdGggc2NvcmVzIG5lYXIgemVybyBhbmQgYSBjbHVzdGVyIHNjb3JlcyBoaWdoLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZGlzc29uYW5jZShwcm9maWxlOiBBcnJheUxpa2U8bnVtYmVyPik6IG51bWJlciB7XG4gIGxldCB0b3RhbCA9IDA7XG4gIGxldCB3ZWlnaHQgPSAwO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IDEyOyBpKyspIHtcbiAgICBmb3IgKGxldCBqID0gaSArIDE7IGogPCAxMjsgaisrKSB7XG4gICAgICBjb25zdCBwYWlyID0gcHJvZmlsZVtpXSAqIHByb2ZpbGVbal07XG4gICAgICB0b3RhbCArPSBwYWlyICogSU5URVJWQUxfRElTU09OQU5DRVtqIC0gaV07XG4gICAgICB3ZWlnaHQgKz0gcGFpcjtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHdlaWdodCA+IDFlLTkgPyBNYXRoLm1pbigxLCB0b3RhbCAvIHdlaWdodCkgOiAwO1xufVxuXG4vKiogQXZlcmFnZSB0aGUgcGVyLWZyYW1lIGNocm9tYSBwcm9maWxlcyBhY3Jvc3MgYSBmcmFtZSByYW5nZSBpbnRvIG9uZSBwcm9maWxlLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIG1lYW5DaHJvbWEoY2hyb21hOiBGbG9hdDMyQXJyYXksIGZyb206IG51bWJlciwgdG86IG51bWJlcik6IG51bWJlcltdIHtcbiAgY29uc3Qgb3V0ID0gbmV3IEFycmF5PG51bWJlcj4oMTIpLmZpbGwoMCk7XG4gIGNvbnN0IG4gPSBNYXRoLm1heCgxLCB0byAtIGZyb20pO1xuICBmb3IgKGxldCBmID0gZnJvbTsgZiA8IHRvOyBmKyspIHtcbiAgICBjb25zdCBvZmYgPSBmICogMTI7XG4gICAgZm9yIChsZXQgYyA9IDA7IGMgPCAxMjsgYysrKSBvdXRbY10gKz0gY2hyb21hW29mZiArIGNdO1xuICB9XG4gIGZvciAobGV0IGMgPSAwOyBjIDwgMTI7IGMrKykgb3V0W2NdIC89IG47XG4gIHJldHVybiBvdXQ7XG59XG5cbi8qKiBTY2FsZSBhIHNlcmllcyBpbnRvIDAuLjEgdXNpbmcgcm9idXN0IHBlcmNlbnRpbGUgYm91bmRzLCBzbyBvbmUgc3Bpa2UgY2FuJ3QgZmxhdHRlbiBpdC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBub3JtYWxpc2Uoc3JjOiBBcnJheUxpa2U8bnVtYmVyPik6IEZsb2F0MzJBcnJheSB7XG4gIGNvbnN0IG91dCA9IG5ldyBGbG9hdDMyQXJyYXkoc3JjLmxlbmd0aCk7XG4gIGlmIChzcmMubGVuZ3RoID09PSAwKSByZXR1cm4gb3V0O1xuICBjb25zdCBzb3J0ZWQgPSBBcnJheS5mcm9tKHNyYykuc29ydCgoYSwgYikgPT4gYSAtIGIpO1xuICBjb25zdCBsbyA9IHNvcnRlZFtNYXRoLmZsb29yKHNvcnRlZC5sZW5ndGggKiAwLjAyKV07XG4gIGNvbnN0IGhpID0gc29ydGVkW01hdGguZmxvb3Ioc29ydGVkLmxlbmd0aCAqIDAuOTgpXTtcbiAgY29uc3Qgc3BhbiA9IGhpIC0gbG87XG4gIGlmIChzcGFuIDw9IDFlLTkpIHJldHVybiBvdXQ7XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc3JjLmxlbmd0aDsgaSsrKSB7XG4gICAgb3V0W2ldID0gTWF0aC5taW4oMSwgTWF0aC5tYXgoMCwgKHNyY1tpXSAtIGxvKSAvIHNwYW4pKTtcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc21vb3RoKHNyYzogQXJyYXlMaWtlPG51bWJlcj4sIHJhZGl1czogbnVtYmVyKTogRmxvYXQzMkFycmF5IHtcbiAgY29uc3Qgb3V0ID0gbmV3IEZsb2F0MzJBcnJheShzcmMubGVuZ3RoKTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBzcmMubGVuZ3RoOyBpKyspIHtcbiAgICBsZXQgc3VtID0gMDtcbiAgICBsZXQgbiA9IDA7XG4gICAgZm9yIChsZXQgaiA9IE1hdGgubWF4KDAsIGkgLSByYWRpdXMpOyBqIDw9IE1hdGgubWluKHNyYy5sZW5ndGggLSAxLCBpICsgcmFkaXVzKTsgaisrKSB7XG4gICAgICBzdW0gKz0gc3JjW2pdO1xuICAgICAgbisrO1xuICAgIH1cbiAgICBvdXRbaV0gPSBzdW0gLyBuO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtZWFuKHNyYzogQXJyYXlMaWtlPG51bWJlcj4sIGZyb20gPSAwLCB0byA9IHNyYy5sZW5ndGgpOiBudW1iZXIge1xuICBpZiAodG8gPD0gZnJvbSkgcmV0dXJuIDA7XG4gIGxldCBzdW0gPSAwO1xuICBmb3IgKGxldCBpID0gZnJvbTsgaSA8IHRvOyBpKyspIHN1bSArPSBzcmNbaV07XG4gIHJldHVybiBzdW0gLyAodG8gLSBmcm9tKTtcbn1cblxuLyoqXG4gKiBUZW1wbyB2aWEgYXV0b2NvcnJlbGF0aW9uIG9mIHRoZSBvbnNldCBlbnZlbG9wZSwgc2VhcmNoZWQgb3ZlciA2MC0xODAgQlBNLlxuICogUmV0dXJucyB0aGUgcGVyaW9kIGluIGZyYW1lcyBhbG9uZ3NpZGUgdGhlIGJlYXQgcGhhc2UsIHNvIGN1ZXMgY2FuIGJlXG4gKiBxdWFudGlzZWQgb250byB0aGUgZ3JpZCByYXRoZXIgdGhhbiBsYW5kaW5nIGJldHdlZW4gYmVhdHMuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBlc3RpbWF0ZVRlbXBvKFxuICBmbHV4OiBBcnJheUxpa2U8bnVtYmVyPixcbiAgZnBzOiBudW1iZXIsXG4pOiB7IGJwbTogbnVtYmVyOyBwZXJpb2RGcmFtZXM6IG51bWJlcjsgcGhhc2VGcmFtZXM6IG51bWJlciB9IHtcbiAgY29uc3QgbWluQnBtID0gNjA7XG4gIGNvbnN0IG1heEJwbSA9IDE4MDtcbiAgY29uc3QgbWluTGFnID0gTWF0aC5mbG9vcigoNjAgLyBtYXhCcG0pICogZnBzKTtcbiAgY29uc3QgbWF4TGFnID0gTWF0aC5jZWlsKCg2MCAvIG1pbkJwbSkgKiBmcHMpO1xuXG4gIGNvbnN0IGVudiA9IG5vcm1hbGlzZShzbW9vdGgoZmx1eCwgMSkpO1xuICBjb25zdCBhdmcgPSBtZWFuKGVudik7XG4gIGNvbnN0IGNlbnRyZWQgPSBuZXcgRmxvYXQzMkFycmF5KGVudi5sZW5ndGgpO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGVudi5sZW5ndGg7IGkrKykgY2VudHJlZFtpXSA9IGVudltpXSAtIGF2ZztcblxuICBsZXQgYmVzdExhZyA9IG1pbkxhZztcbiAgbGV0IGJlc3RTY29yZSA9IC1JbmZpbml0eTtcbiAgZm9yIChsZXQgbGFnID0gbWluTGFnOyBsYWcgPD0gbWF4TGFnOyBsYWcrKykge1xuICAgIGxldCBhY2MgPSAwO1xuICAgIGZvciAobGV0IGkgPSAwOyBpICsgbGFnIDwgY2VudHJlZC5sZW5ndGg7IGkrKykgYWNjICs9IGNlbnRyZWRbaV0gKiBjZW50cmVkW2kgKyBsYWddO1xuICAgIC8vIE5vcm1hbGlzZSBieSBvdmVybGFwIHNvIGxvbmcgbGFncyBhcmVuJ3QgcGVuYWxpc2VkLCBhbmQgZ2VudGx5IGZhdm91clxuICAgIC8vIHRoZSA5MC0xNDAgQlBNIHJhbmdlIHdoZXJlIG1vc3QgbXVzaWMgYWN0dWFsbHkgc2l0cy5cbiAgICBjb25zdCBvdmVybGFwID0gY2VudHJlZC5sZW5ndGggLSBsYWc7XG4gICAgaWYgKG92ZXJsYXAgPD0gMCkgY29udGludWU7XG4gICAgY29uc3QgYnBtID0gKDYwICogZnBzKSAvIGxhZztcbiAgICBjb25zdCBwcmlvciA9IDEgLSAwLjI1ICogTWF0aC5taW4oMSwgTWF0aC5hYnMoTWF0aC5sb2cyKGJwbSAvIDExNSkpKTtcbiAgICBjb25zdCBzY29yZSA9IChhY2MgLyBvdmVybGFwKSAqIHByaW9yO1xuICAgIGlmIChzY29yZSA+IGJlc3RTY29yZSkge1xuICAgICAgYmVzdFNjb3JlID0gc2NvcmU7XG4gICAgICBiZXN0TGFnID0gbGFnO1xuICAgIH1cbiAgfVxuXG4gIC8vIFBoYXNlOiBzbGlkZSBhIHB1bHNlIHRyYWluIG92ZXIgdGhlIGVudmVsb3BlIGFuZCBrZWVwIHRoZSBiZXN0IGFsaWdubWVudC5cbiAgbGV0IGJlc3RQaGFzZSA9IDA7XG4gIGxldCBiZXN0UGhhc2VTY29yZSA9IC1JbmZpbml0eTtcbiAgZm9yIChsZXQgcCA9IDA7IHAgPCBiZXN0TGFnOyBwKyspIHtcbiAgICBsZXQgYWNjID0gMDtcbiAgICBmb3IgKGxldCBpID0gcDsgaSA8IGVudi5sZW5ndGg7IGkgKz0gYmVzdExhZykgYWNjICs9IGVudltpXTtcbiAgICBpZiAoYWNjID4gYmVzdFBoYXNlU2NvcmUpIHtcbiAgICAgIGJlc3RQaGFzZVNjb3JlID0gYWNjO1xuICAgICAgYmVzdFBoYXNlID0gcDtcbiAgICB9XG4gIH1cblxuICByZXR1cm4geyBicG06ICg2MCAqIGZwcykgLyBiZXN0TGFnLCBwZXJpb2RGcmFtZXM6IGJlc3RMYWcsIHBoYXNlRnJhbWVzOiBiZXN0UGhhc2UgfTtcbn1cbiJdLCJuYW1lcyI6WyJmZnQiLCJyZSIsImltIiwibiIsImxlbmd0aCIsImkiLCJqIiwiYml0IiwidCIsImxlbiIsImFuZyIsIk1hdGgiLCJQSSIsIndSZSIsImNvcyIsIndJbSIsInNpbiIsImN1clJlIiwiY3VySW0iLCJrIiwiYVJlIiwiYUltIiwiYlJlIiwiYkltIiwibmV4dFJlIiwiaGFubldpbmRvdyIsInNpemUiLCJ3IiwiRmxvYXQzMkFycmF5IiwiUElUQ0hfTUlOX0haIiwiUElUQ0hfTUFYX0haIiwiY29tcHV0ZUZyYW1lcyIsInBjbSIsInNhbXBsZVJhdGUiLCJmcmFtZVNpemUiLCJob3AiLCJjb3VudCIsIm1heCIsImZsb29yIiwiYmlucyIsIndpbmRvdyIsImJpbkh6IiwibG93RW5kIiwibWlkRW5kIiwiaGlnaFN0YXJ0Iiwicm1zIiwiZmx1eCIsImNlbnRyb2lkIiwibG93IiwibWlkIiwiaGlnaCIsImNocm9tYSIsInBpdGNoIiwiYmluUGl0Y2hDbGFzcyIsIkludDhBcnJheSIsImZpbGwiLCJiaW5NaWRpIiwiYiIsImh6IiwibWlkaSIsImxvZzIiLCJyb3VuZCIsIm1hZyIsInByZXZNYWciLCJmIiwib2ZmIiwic3VtU3EiLCJzIiwic3FydCIsIm1hZ1N1bSIsIndlaWdodGVkIiwiZmx1eFN1bSIsImxvd1N1bSIsIm1pZFN1bSIsImhpZ2hTdW0iLCJwaXRjaE1hZyIsInBpdGNoV2VpZ2h0ZWQiLCJjaHJvbWFPZmYiLCJtIiwiaHlwb3QiLCJkIiwicGMiLCJjaHJvbWFTdW0iLCJjIiwic2V0IiwiZnBzIiwiUElUQ0hfQ0xBU1NfTkFNRVMiLCJNQUpPUl9QUk9GSUxFIiwiTUlOT1JfUFJPRklMRSIsIklOVEVSVkFMX0RJU1NPTkFOQ0UiLCJjb3JyZWxhdGUiLCJhIiwicm90YXRpb24iLCJzdW1BIiwic3VtQiIsIm1lYW5BIiwibWVhbkIiLCJudW0iLCJkZW5BIiwiZGVuQiIsImRhIiwiZGIiLCJkZW4iLCJkZXRlY3RLZXkiLCJwcm9maWxlIiwiYmVzdE1ham9yIiwiSW5maW5pdHkiLCJiZXN0TWFqb3JUb25pYyIsImJlc3RNaW5vciIsImJlc3RNaW5vclRvbmljIiwibWFqIiwibWluIiwiaXNNYWpvciIsInRvbmljIiwidG9uaWNOYW1lIiwibW9kZSIsIm1ham9ybmVzcyIsImNvbmZpZGVuY2UiLCJkaXNzb25hbmNlIiwidG90YWwiLCJ3ZWlnaHQiLCJwYWlyIiwibWVhbkNocm9tYSIsImZyb20iLCJ0byIsIm91dCIsIkFycmF5Iiwibm9ybWFsaXNlIiwic3JjIiwic29ydGVkIiwic29ydCIsImxvIiwiaGkiLCJzcGFuIiwic21vb3RoIiwicmFkaXVzIiwic3VtIiwibWVhbiIsImVzdGltYXRlVGVtcG8iLCJtaW5CcG0iLCJtYXhCcG0iLCJtaW5MYWciLCJtYXhMYWciLCJjZWlsIiwiZW52IiwiYXZnIiwiY2VudHJlZCIsImJlc3RMYWciLCJiZXN0U2NvcmUiLCJsYWciLCJhY2MiLCJvdmVybGFwIiwiYnBtIiwicHJpb3IiLCJhYnMiLCJzY29yZSIsImJlc3RQaGFzZSIsImJlc3RQaGFzZVNjb3JlIiwicCIsInBlcmlvZEZyYW1lcyIsInBoYXNlRnJhbWVzIl0sImlnbm9yZUxpc3QiOltdLCJzb3VyY2VSb290IjoiIn0=\n//# sourceURL=webpack-internal:///(app-pages-browser)/./app/lib/audio/dsp.ts\n"));

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			if (cachedModule.error !== undefined) throw cachedModule.error;
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			var execOptions = { id: moduleId, module: module, factory: __webpack_modules__[moduleId], require: __webpack_require__ };
/******/ 			__webpack_require__.i.forEach(function(handler) { handler(execOptions); });
/******/ 			module = execOptions.module;
/******/ 			execOptions.factory.call(module.exports, module, module.exports, execOptions.require);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = __webpack_module_cache__;
/******/ 	
/******/ 	// expose the module execution interceptor
/******/ 	__webpack_require__.i = [];
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get javascript update chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference all chunks
/******/ 		__webpack_require__.hu = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return "static/webpack/" + chunkId + "." + __webpack_require__.h() + ".hot-update.js";
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get mini-css chunk filename */
/******/ 	(() => {
/******/ 		// This function allow to reference async chunks
/******/ 		__webpack_require__.miniCssF = (chunkId) => {
/******/ 			// return url for filenames based on template
/******/ 			return undefined;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/get update manifest filename */
/******/ 	(() => {
/******/ 		__webpack_require__.hmrF = () => ("static/webpack/" + __webpack_require__.h() + ".aa0eb0e6171d8ff7.hot-update.json");
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/getFullHash */
/******/ 	(() => {
/******/ 		__webpack_require__.h = () => ("31a78d8e1218df6e")
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/trusted types policy */
/******/ 	(() => {
/******/ 		var policy;
/******/ 		__webpack_require__.tt = () => {
/******/ 			// Create Trusted Type policy if Trusted Types are available and the policy doesn't exist yet.
/******/ 			if (policy === undefined) {
/******/ 				policy = {
/******/ 					createScript: (script) => (script),
/******/ 					createScriptURL: (url) => (url)
/******/ 				};
/******/ 				if (typeof trustedTypes !== "undefined" && trustedTypes.createPolicy) {
/******/ 					policy = trustedTypes.createPolicy("nextjs#bundler", policy);
/******/ 				}
/******/ 			}
/******/ 			return policy;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/trusted types script */
/******/ 	(() => {
/******/ 		__webpack_require__.ts = (script) => (__webpack_require__.tt().createScript(script));
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/trusted types script url */
/******/ 	(() => {
/******/ 		__webpack_require__.tu = (url) => (__webpack_require__.tt().createScriptURL(url));
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hot module replacement */
/******/ 	(() => {
/******/ 		var currentModuleData = {};
/******/ 		var installedModules = __webpack_require__.c;
/******/ 		
/******/ 		// module and require creation
/******/ 		var currentChildModule;
/******/ 		var currentParents = [];
/******/ 		
/******/ 		// status
/******/ 		var registeredStatusHandlers = [];
/******/ 		var currentStatus = "idle";
/******/ 		
/******/ 		// while downloading
/******/ 		var blockingPromises = 0;
/******/ 		var blockingPromisesWaiting = [];
/******/ 		
/******/ 		// The update info
/******/ 		var currentUpdateApplyHandlers;
/******/ 		var queuedInvalidatedModules;
/******/ 		
/******/ 		__webpack_require__.hmrD = currentModuleData;
/******/ 		
/******/ 		__webpack_require__.i.push(function (options) {
/******/ 			var module = options.module;
/******/ 			var require = createRequire(options.require, options.id);
/******/ 			module.hot = createModuleHotObject(options.id, module);
/******/ 			module.parents = currentParents;
/******/ 			module.children = [];
/******/ 			currentParents = [];
/******/ 			options.require = require;
/******/ 		});
/******/ 		
/******/ 		__webpack_require__.hmrC = {};
/******/ 		__webpack_require__.hmrI = {};
/******/ 		
/******/ 		function createRequire(require, moduleId) {
/******/ 			var me = installedModules[moduleId];
/******/ 			if (!me) return require;
/******/ 			var fn = function (request) {
/******/ 				if (me.hot.active) {
/******/ 					if (installedModules[request]) {
/******/ 						var parents = installedModules[request].parents;
/******/ 						if (parents.indexOf(moduleId) === -1) {
/******/ 							parents.push(moduleId);
/******/ 						}
/******/ 					} else {
/******/ 						currentParents = [moduleId];
/******/ 						currentChildModule = request;
/******/ 					}
/******/ 					if (me.children.indexOf(request) === -1) {
/******/ 						me.children.push(request);
/******/ 					}
/******/ 				} else {
/******/ 					console.warn(
/******/ 						"[HMR] unexpected require(" +
/******/ 							request +
/******/ 							") from disposed module " +
/******/ 							moduleId
/******/ 					);
/******/ 					currentParents = [];
/******/ 				}
/******/ 				return require(request);
/******/ 			};
/******/ 			var createPropertyDescriptor = function (name) {
/******/ 				return {
/******/ 					configurable: true,
/******/ 					enumerable: true,
/******/ 					get: function () {
/******/ 						return require[name];
/******/ 					},
/******/ 					set: function (value) {
/******/ 						require[name] = value;
/******/ 					}
/******/ 				};
/******/ 			};
/******/ 			for (var name in require) {
/******/ 				if (Object.prototype.hasOwnProperty.call(require, name) && name !== "e") {
/******/ 					Object.defineProperty(fn, name, createPropertyDescriptor(name));
/******/ 				}
/******/ 			}
/******/ 			fn.e = function (chunkId, fetchPriority) {
/******/ 				return trackBlockingPromise(require.e(chunkId, fetchPriority));
/******/ 			};
/******/ 			return fn;
/******/ 		}
/******/ 		
/******/ 		function createModuleHotObject(moduleId, me) {
/******/ 			var _main = currentChildModule !== moduleId;
/******/ 			var hot = {
/******/ 				// private stuff
/******/ 				_acceptedDependencies: {},
/******/ 				_acceptedErrorHandlers: {},
/******/ 				_declinedDependencies: {},
/******/ 				_selfAccepted: false,
/******/ 				_selfDeclined: false,
/******/ 				_selfInvalidated: false,
/******/ 				_disposeHandlers: [],
/******/ 				_main: _main,
/******/ 				_requireSelf: function () {
/******/ 					currentParents = me.parents.slice();
/******/ 					currentChildModule = _main ? undefined : moduleId;
/******/ 					__webpack_require__(moduleId);
/******/ 				},
/******/ 		
/******/ 				// Module API
/******/ 				active: true,
/******/ 				accept: function (dep, callback, errorHandler) {
/******/ 					if (dep === undefined) hot._selfAccepted = true;
/******/ 					else if (typeof dep === "function") hot._selfAccepted = dep;
/******/ 					else if (typeof dep === "object" && dep !== null) {
/******/ 						for (var i = 0; i < dep.length; i++) {
/******/ 							hot._acceptedDependencies[dep[i]] = callback || function () {};
/******/ 							hot._acceptedErrorHandlers[dep[i]] = errorHandler;
/******/ 						}
/******/ 					} else {
/******/ 						hot._acceptedDependencies[dep] = callback || function () {};
/******/ 						hot._acceptedErrorHandlers[dep] = errorHandler;
/******/ 					}
/******/ 				},
/******/ 				decline: function (dep) {
/******/ 					if (dep === undefined) hot._selfDeclined = true;
/******/ 					else if (typeof dep === "object" && dep !== null)
/******/ 						for (var i = 0; i < dep.length; i++)
/******/ 							hot._declinedDependencies[dep[i]] = true;
/******/ 					else hot._declinedDependencies[dep] = true;
/******/ 				},
/******/ 				dispose: function (callback) {
/******/ 					hot._disposeHandlers.push(callback);
/******/ 				},
/******/ 				addDisposeHandler: function (callback) {
/******/ 					hot._disposeHandlers.push(callback);
/******/ 				},
/******/ 				removeDisposeHandler: function (callback) {
/******/ 					var idx = hot._disposeHandlers.indexOf(callback);
/******/ 					if (idx >= 0) hot._disposeHandlers.splice(idx, 1);
/******/ 				},
/******/ 				invalidate: function () {
/******/ 					this._selfInvalidated = true;
/******/ 					switch (currentStatus) {
/******/ 						case "idle":
/******/ 							currentUpdateApplyHandlers = [];
/******/ 							Object.keys(__webpack_require__.hmrI).forEach(function (key) {
/******/ 								__webpack_require__.hmrI[key](
/******/ 									moduleId,
/******/ 									currentUpdateApplyHandlers
/******/ 								);
/******/ 							});
/******/ 							setStatus("ready");
/******/ 							break;
/******/ 						case "ready":
/******/ 							Object.keys(__webpack_require__.hmrI).forEach(function (key) {
/******/ 								__webpack_require__.hmrI[key](
/******/ 									moduleId,
/******/ 									currentUpdateApplyHandlers
/******/ 								);
/******/ 							});
/******/ 							break;
/******/ 						case "prepare":
/******/ 						case "check":
/******/ 						case "dispose":
/******/ 						case "apply":
/******/ 							(queuedInvalidatedModules = queuedInvalidatedModules || []).push(
/******/ 								moduleId
/******/ 							);
/******/ 							break;
/******/ 						default:
/******/ 							// ignore requests in error states
/******/ 							break;
/******/ 					}
/******/ 				},
/******/ 		
/******/ 				// Management API
/******/ 				check: hotCheck,
/******/ 				apply: hotApply,
/******/ 				status: function (l) {
/******/ 					if (!l) return currentStatus;
/******/ 					registeredStatusHandlers.push(l);
/******/ 				},
/******/ 				addStatusHandler: function (l) {
/******/ 					registeredStatusHandlers.push(l);
/******/ 				},
/******/ 				removeStatusHandler: function (l) {
/******/ 					var idx = registeredStatusHandlers.indexOf(l);
/******/ 					if (idx >= 0) registeredStatusHandlers.splice(idx, 1);
/******/ 				},
/******/ 		
/******/ 				// inherit from previous dispose call
/******/ 				data: currentModuleData[moduleId]
/******/ 			};
/******/ 			currentChildModule = undefined;
/******/ 			return hot;
/******/ 		}
/******/ 		
/******/ 		function setStatus(newStatus) {
/******/ 			currentStatus = newStatus;
/******/ 			var results = [];
/******/ 		
/******/ 			for (var i = 0; i < registeredStatusHandlers.length; i++)
/******/ 				results[i] = registeredStatusHandlers[i].call(null, newStatus);
/******/ 		
/******/ 			return Promise.all(results).then(function () {});
/******/ 		}
/******/ 		
/******/ 		function unblock() {
/******/ 			if (--blockingPromises === 0) {
/******/ 				setStatus("ready").then(function () {
/******/ 					if (blockingPromises === 0) {
/******/ 						var list = blockingPromisesWaiting;
/******/ 						blockingPromisesWaiting = [];
/******/ 						for (var i = 0; i < list.length; i++) {
/******/ 							list[i]();
/******/ 						}
/******/ 					}
/******/ 				});
/******/ 			}
/******/ 		}
/******/ 		
/******/ 		function trackBlockingPromise(promise) {
/******/ 			switch (currentStatus) {
/******/ 				case "ready":
/******/ 					setStatus("prepare");
/******/ 				/* fallthrough */
/******/ 				case "prepare":
/******/ 					blockingPromises++;
/******/ 					promise.then(unblock, unblock);
/******/ 					return promise;
/******/ 				default:
/******/ 					return promise;
/******/ 			}
/******/ 		}
/******/ 		
/******/ 		function waitForBlockingPromises(fn) {
/******/ 			if (blockingPromises === 0) return fn();
/******/ 			return new Promise(function (resolve) {
/******/ 				blockingPromisesWaiting.push(function () {
/******/ 					resolve(fn());
/******/ 				});
/******/ 			});
/******/ 		}
/******/ 		
/******/ 		function hotCheck(applyOnUpdate) {
/******/ 			if (currentStatus !== "idle") {
/******/ 				throw new Error("check() is only allowed in idle status");
/******/ 			}
/******/ 			return setStatus("check")
/******/ 				.then(__webpack_require__.hmrM)
/******/ 				.then(function (update) {
/******/ 					if (!update) {
/******/ 						return setStatus(applyInvalidatedModules() ? "ready" : "idle").then(
/******/ 							function () {
/******/ 								return null;
/******/ 							}
/******/ 						);
/******/ 					}
/******/ 		
/******/ 					return setStatus("prepare").then(function () {
/******/ 						var updatedModules = [];
/******/ 						currentUpdateApplyHandlers = [];
/******/ 		
/******/ 						return Promise.all(
/******/ 							Object.keys(__webpack_require__.hmrC).reduce(function (
/******/ 								promises,
/******/ 								key
/******/ 							) {
/******/ 								__webpack_require__.hmrC[key](
/******/ 									update.c,
/******/ 									update.r,
/******/ 									update.m,
/******/ 									promises,
/******/ 									currentUpdateApplyHandlers,
/******/ 									updatedModules
/******/ 								);
/******/ 								return promises;
/******/ 							}, [])
/******/ 						).then(function () {
/******/ 							return waitForBlockingPromises(function () {
/******/ 								if (applyOnUpdate) {
/******/ 									return internalApply(applyOnUpdate);
/******/ 								}
/******/ 								return setStatus("ready").then(function () {
/******/ 									return updatedModules;
/******/ 								});
/******/ 							});
/******/ 						});
/******/ 					});
/******/ 				});
/******/ 		}
/******/ 		
/******/ 		function hotApply(options) {
/******/ 			if (currentStatus !== "ready") {
/******/ 				return Promise.resolve().then(function () {
/******/ 					throw new Error(
/******/ 						"apply() is only allowed in ready status (state: " +
/******/ 							currentStatus +
/******/ 							")"
/******/ 					);
/******/ 				});
/******/ 			}
/******/ 			return internalApply(options);
/******/ 		}
/******/ 		
/******/ 		function internalApply(options) {
/******/ 			options = options || {};
/******/ 		
/******/ 			applyInvalidatedModules();
/******/ 		
/******/ 			var results = currentUpdateApplyHandlers.map(function (handler) {
/******/ 				return handler(options);
/******/ 			});
/******/ 			currentUpdateApplyHandlers = undefined;
/******/ 		
/******/ 			var errors = results
/******/ 				.map(function (r) {
/******/ 					return r.error;
/******/ 				})
/******/ 				.filter(Boolean);
/******/ 		
/******/ 			if (errors.length > 0) {
/******/ 				return setStatus("abort").then(function () {
/******/ 					throw errors[0];
/******/ 				});
/******/ 			}
/******/ 		
/******/ 			// Now in "dispose" phase
/******/ 			var disposePromise = setStatus("dispose");
/******/ 		
/******/ 			results.forEach(function (result) {
/******/ 				if (result.dispose) result.dispose();
/******/ 			});
/******/ 		
/******/ 			// Now in "apply" phase
/******/ 			var applyPromise = setStatus("apply");
/******/ 		
/******/ 			var error;
/******/ 			var reportError = function (err) {
/******/ 				if (!error) error = err;
/******/ 			};
/******/ 		
/******/ 			var outdatedModules = [];
/******/ 			results.forEach(function (result) {
/******/ 				if (result.apply) {
/******/ 					var modules = result.apply(reportError);
/******/ 					if (modules) {
/******/ 						for (var i = 0; i < modules.length; i++) {
/******/ 							outdatedModules.push(modules[i]);
/******/ 						}
/******/ 					}
/******/ 				}
/******/ 			});
/******/ 		
/******/ 			return Promise.all([disposePromise, applyPromise]).then(function () {
/******/ 				// handle errors in accept handlers and self accepted module load
/******/ 				if (error) {
/******/ 					return setStatus("fail").then(function () {
/******/ 						throw error;
/******/ 					});
/******/ 				}
/******/ 		
/******/ 				if (queuedInvalidatedModules) {
/******/ 					return internalApply(options).then(function (list) {
/******/ 						outdatedModules.forEach(function (moduleId) {
/******/ 							if (list.indexOf(moduleId) < 0) list.push(moduleId);
/******/ 						});
/******/ 						return list;
/******/ 					});
/******/ 				}
/******/ 		
/******/ 				return setStatus("idle").then(function () {
/******/ 					return outdatedModules;
/******/ 				});
/******/ 			});
/******/ 		}
/******/ 		
/******/ 		function applyInvalidatedModules() {
/******/ 			if (queuedInvalidatedModules) {
/******/ 				if (!currentUpdateApplyHandlers) currentUpdateApplyHandlers = [];
/******/ 				Object.keys(__webpack_require__.hmrI).forEach(function (key) {
/******/ 					queuedInvalidatedModules.forEach(function (moduleId) {
/******/ 						__webpack_require__.hmrI[key](
/******/ 							moduleId,
/******/ 							currentUpdateApplyHandlers
/******/ 						);
/******/ 					});
/******/ 				});
/******/ 				queuedInvalidatedModules = undefined;
/******/ 				return true;
/******/ 			}
/******/ 		}
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/publicPath */
/******/ 	(() => {
/******/ 		__webpack_require__.p = "/_next/";
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/react refresh */
/******/ 	(() => {
/******/ 		if (__webpack_require__.i) {
/******/ 		__webpack_require__.i.push((options) => {
/******/ 			const originalFactory = options.factory;
/******/ 			options.factory = (moduleObject, moduleExports, webpackRequire) => {
/******/ 				const hasRefresh = typeof self !== "undefined" && !!self.$RefreshInterceptModuleExecution$;
/******/ 				const cleanup = hasRefresh ? self.$RefreshInterceptModuleExecution$(moduleObject.id) : () => {};
/******/ 				try {
/******/ 					originalFactory.call(this, moduleObject, moduleExports, webpackRequire);
/******/ 				} finally {
/******/ 					cleanup();
/******/ 				}
/******/ 			}
/******/ 		})
/******/ 		}
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	
/******/ 	// noop fns to prevent runtime errors during initialization
/******/ 	if (typeof self !== "undefined") {
/******/ 		self.$RefreshReg$ = function () {};
/******/ 		self.$RefreshSig$ = function () {
/******/ 			return function (type) {
/******/ 				return type;
/******/ 			};
/******/ 		};
/******/ 	}
/******/ 	
/******/ 	/* webpack/runtime/css loading */
/******/ 	(() => {
/******/ 		var createStylesheet = (chunkId, fullhref, resolve, reject) => {
/******/ 			var linkTag = document.createElement("link");
/******/ 		
/******/ 			linkTag.rel = "stylesheet";
/******/ 			linkTag.type = "text/css";
/******/ 			var onLinkComplete = (event) => {
/******/ 				// avoid mem leaks.
/******/ 				linkTag.onerror = linkTag.onload = null;
/******/ 				if (event.type === 'load') {
/******/ 					resolve();
/******/ 				} else {
/******/ 					var errorType = event && (event.type === 'load' ? 'missing' : event.type);
/******/ 					var realHref = event && event.target && event.target.href || fullhref;
/******/ 					var err = new Error("Loading CSS chunk " + chunkId + " failed.\n(" + realHref + ")");
/******/ 					err.code = "CSS_CHUNK_LOAD_FAILED";
/******/ 					err.type = errorType;
/******/ 					err.request = realHref;
/******/ 					linkTag.parentNode.removeChild(linkTag)
/******/ 					reject(err);
/******/ 				}
/******/ 			}
/******/ 			linkTag.onerror = linkTag.onload = onLinkComplete;
/******/ 			linkTag.href = fullhref;
/******/ 		
/******/ 			(function(linkTag) {
/******/ 			                if (typeof _N_E_STYLE_LOAD === 'function') {
/******/ 			                    const { href, onload, onerror } = linkTag;
/******/ 			                    _N_E_STYLE_LOAD(href.indexOf(window.location.origin) === 0 ? new URL(href).pathname : href).then(()=>onload == null ? void 0 : onload.call(linkTag, {
/******/ 			                            type: 'load'
/******/ 			                        }), ()=>onerror == null ? void 0 : onerror.call(linkTag, {}));
/******/ 			                } else {
/******/ 			                    document.head.appendChild(linkTag);
/******/ 			                }
/******/ 			            })(linkTag)
/******/ 			return linkTag;
/******/ 		};
/******/ 		var findStylesheet = (href, fullhref) => {
/******/ 			var existingLinkTags = document.getElementsByTagName("link");
/******/ 			for(var i = 0; i < existingLinkTags.length; i++) {
/******/ 				var tag = existingLinkTags[i];
/******/ 				var dataHref = tag.getAttribute("data-href") || tag.getAttribute("href");
/******/ 				if(tag.rel === "stylesheet" && (dataHref === href || dataHref === fullhref)) return tag;
/******/ 			}
/******/ 			var existingStyleTags = document.getElementsByTagName("style");
/******/ 			for(var i = 0; i < existingStyleTags.length; i++) {
/******/ 				var tag = existingStyleTags[i];
/******/ 				var dataHref = tag.getAttribute("data-href");
/******/ 				if(dataHref === href || dataHref === fullhref) return tag;
/******/ 			}
/******/ 		};
/******/ 		var loadStylesheet = (chunkId) => {
/******/ 			return new Promise((resolve, reject) => {
/******/ 				var href = __webpack_require__.miniCssF(chunkId);
/******/ 				var fullhref = __webpack_require__.p + href;
/******/ 				if(findStylesheet(href, fullhref)) return resolve();
/******/ 				createStylesheet(chunkId, fullhref, resolve, reject);
/******/ 			});
/******/ 		}
/******/ 		// no chunk loading
/******/ 		
/******/ 		var oldTags = [];
/******/ 		var newTags = [];
/******/ 		var applyHandler = (options) => {
/******/ 			return { dispose: () => {
/******/ 				for(var i = 0; i < oldTags.length; i++) {
/******/ 					var oldTag = oldTags[i];
/******/ 					if(oldTag.parentNode) oldTag.parentNode.removeChild(oldTag);
/******/ 				}
/******/ 				oldTags.length = 0;
/******/ 			}, apply: () => {
/******/ 				for(var i = 0; i < newTags.length; i++) newTags[i].rel = "stylesheet";
/******/ 				newTags.length = 0;
/******/ 			} };
/******/ 		}
/******/ 		__webpack_require__.hmrC.miniCss = (chunkIds, removedChunks, removedModules, promises, applyHandlers, updatedModulesList) => {
/******/ 			applyHandlers.push(applyHandler);
/******/ 			chunkIds.forEach((chunkId) => {
/******/ 				var href = __webpack_require__.miniCssF(chunkId);
/******/ 				var fullhref = __webpack_require__.p + href;
/******/ 				var oldTag = findStylesheet(href, fullhref);
/******/ 				if(!oldTag) return;
/******/ 				promises.push(new Promise((resolve, reject) => {
/******/ 					var tag = createStylesheet(chunkId, fullhref, () => {
/******/ 						tag.as = "style";
/******/ 						tag.rel = "preload";
/******/ 						resolve();
/******/ 					}, reject);
/******/ 					oldTags.push(oldTag);
/******/ 					newTags.push(tag);
/******/ 				}));
/******/ 			});
/******/ 		}
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/importScripts chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded chunks
/******/ 		// "1" means "already loaded"
/******/ 		var installedChunks = __webpack_require__.hmrS_importScripts = __webpack_require__.hmrS_importScripts || {
/******/ 			"_app-pages-browser_app_lib_audio_analyze_worker_ts": 1
/******/ 		};
/******/ 		
/******/ 		// no chunk install function needed
/******/ 		// no chunk loading
/******/ 		
/******/ 		function loadUpdateChunk(chunkId, updatedModulesList) {
/******/ 			var success = false;
/******/ 			self["webpackHotUpdate_N_E"] = (_, moreModules, runtime) => {
/******/ 				for(var moduleId in moreModules) {
/******/ 					if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 						currentUpdate[moduleId] = moreModules[moduleId];
/******/ 						if(updatedModulesList) updatedModulesList.push(moduleId);
/******/ 					}
/******/ 				}
/******/ 				if(runtime) currentUpdateRuntime.push(runtime);
/******/ 				success = true;
/******/ 			};
/******/ 			// start update chunk loading
/******/ 			importScripts(__webpack_require__.tu(__webpack_require__.p + __webpack_require__.hu(chunkId)));
/******/ 			if(!success) throw new Error("Loading update chunk failed for unknown reason");
/******/ 		}
/******/ 		
/******/ 		var currentUpdateChunks;
/******/ 		var currentUpdate;
/******/ 		var currentUpdateRemovedChunks;
/******/ 		var currentUpdateRuntime;
/******/ 		function applyHandler(options) {
/******/ 			if (__webpack_require__.f) delete __webpack_require__.f.importScriptsHmr;
/******/ 			currentUpdateChunks = undefined;
/******/ 			function getAffectedModuleEffects(updateModuleId) {
/******/ 				var outdatedModules = [updateModuleId];
/******/ 				var outdatedDependencies = {};
/******/ 		
/******/ 				var queue = outdatedModules.map(function (id) {
/******/ 					return {
/******/ 						chain: [id],
/******/ 						id: id
/******/ 					};
/******/ 				});
/******/ 				while (queue.length > 0) {
/******/ 					var queueItem = queue.pop();
/******/ 					var moduleId = queueItem.id;
/******/ 					var chain = queueItem.chain;
/******/ 					var module = __webpack_require__.c[moduleId];
/******/ 					if (
/******/ 						!module ||
/******/ 						(module.hot._selfAccepted && !module.hot._selfInvalidated)
/******/ 					)
/******/ 						continue;
/******/ 					if (module.hot._selfDeclined) {
/******/ 						return {
/******/ 							type: "self-declined",
/******/ 							chain: chain,
/******/ 							moduleId: moduleId
/******/ 						};
/******/ 					}
/******/ 					if (module.hot._main) {
/******/ 						return {
/******/ 							type: "unaccepted",
/******/ 							chain: chain,
/******/ 							moduleId: moduleId
/******/ 						};
/******/ 					}
/******/ 					for (var i = 0; i < module.parents.length; i++) {
/******/ 						var parentId = module.parents[i];
/******/ 						var parent = __webpack_require__.c[parentId];
/******/ 						if (!parent) continue;
/******/ 						if (parent.hot._declinedDependencies[moduleId]) {
/******/ 							return {
/******/ 								type: "declined",
/******/ 								chain: chain.concat([parentId]),
/******/ 								moduleId: moduleId,
/******/ 								parentId: parentId
/******/ 							};
/******/ 						}
/******/ 						if (outdatedModules.indexOf(parentId) !== -1) continue;
/******/ 						if (parent.hot._acceptedDependencies[moduleId]) {
/******/ 							if (!outdatedDependencies[parentId])
/******/ 								outdatedDependencies[parentId] = [];
/******/ 							addAllToSet(outdatedDependencies[parentId], [moduleId]);
/******/ 							continue;
/******/ 						}
/******/ 						delete outdatedDependencies[parentId];
/******/ 						outdatedModules.push(parentId);
/******/ 						queue.push({
/******/ 							chain: chain.concat([parentId]),
/******/ 							id: parentId
/******/ 						});
/******/ 					}
/******/ 				}
/******/ 		
/******/ 				return {
/******/ 					type: "accepted",
/******/ 					moduleId: updateModuleId,
/******/ 					outdatedModules: outdatedModules,
/******/ 					outdatedDependencies: outdatedDependencies
/******/ 				};
/******/ 			}
/******/ 		
/******/ 			function addAllToSet(a, b) {
/******/ 				for (var i = 0; i < b.length; i++) {
/******/ 					var item = b[i];
/******/ 					if (a.indexOf(item) === -1) a.push(item);
/******/ 				}
/******/ 			}
/******/ 		
/******/ 			// at begin all updates modules are outdated
/******/ 			// the "outdated" status can propagate to parents if they don't accept the children
/******/ 			var outdatedDependencies = {};
/******/ 			var outdatedModules = [];
/******/ 			var appliedUpdate = {};
/******/ 		
/******/ 			var warnUnexpectedRequire = function warnUnexpectedRequire(module) {
/******/ 				console.warn(
/******/ 					"[HMR] unexpected require(" + module.id + ") to disposed module"
/******/ 				);
/******/ 			};
/******/ 		
/******/ 			for (var moduleId in currentUpdate) {
/******/ 				if (__webpack_require__.o(currentUpdate, moduleId)) {
/******/ 					var newModuleFactory = currentUpdate[moduleId];
/******/ 					/** @type {TODO} */
/******/ 					var result = newModuleFactory
/******/ 						? getAffectedModuleEffects(moduleId)
/******/ 						: {
/******/ 								type: "disposed",
/******/ 								moduleId: moduleId
/******/ 							};
/******/ 					/** @type {Error|false} */
/******/ 					var abortError = false;
/******/ 					var doApply = false;
/******/ 					var doDispose = false;
/******/ 					var chainInfo = "";
/******/ 					if (result.chain) {
/******/ 						chainInfo = "\nUpdate propagation: " + result.chain.join(" -> ");
/******/ 					}
/******/ 					switch (result.type) {
/******/ 						case "self-declined":
/******/ 							if (options.onDeclined) options.onDeclined(result);
/******/ 							if (!options.ignoreDeclined)
/******/ 								abortError = new Error(
/******/ 									"Aborted because of self decline: " +
/******/ 										result.moduleId +
/******/ 										chainInfo
/******/ 								);
/******/ 							break;
/******/ 						case "declined":
/******/ 							if (options.onDeclined) options.onDeclined(result);
/******/ 							if (!options.ignoreDeclined)
/******/ 								abortError = new Error(
/******/ 									"Aborted because of declined dependency: " +
/******/ 										result.moduleId +
/******/ 										" in " +
/******/ 										result.parentId +
/******/ 										chainInfo
/******/ 								);
/******/ 							break;
/******/ 						case "unaccepted":
/******/ 							if (options.onUnaccepted) options.onUnaccepted(result);
/******/ 							if (!options.ignoreUnaccepted)
/******/ 								abortError = new Error(
/******/ 									"Aborted because " + moduleId + " is not accepted" + chainInfo
/******/ 								);
/******/ 							break;
/******/ 						case "accepted":
/******/ 							if (options.onAccepted) options.onAccepted(result);
/******/ 							doApply = true;
/******/ 							break;
/******/ 						case "disposed":
/******/ 							if (options.onDisposed) options.onDisposed(result);
/******/ 							doDispose = true;
/******/ 							break;
/******/ 						default:
/******/ 							throw new Error("Unexception type " + result.type);
/******/ 					}
/******/ 					if (abortError) {
/******/ 						return {
/******/ 							error: abortError
/******/ 						};
/******/ 					}
/******/ 					if (doApply) {
/******/ 						appliedUpdate[moduleId] = newModuleFactory;
/******/ 						addAllToSet(outdatedModules, result.outdatedModules);
/******/ 						for (moduleId in result.outdatedDependencies) {
/******/ 							if (__webpack_require__.o(result.outdatedDependencies, moduleId)) {
/******/ 								if (!outdatedDependencies[moduleId])
/******/ 									outdatedDependencies[moduleId] = [];
/******/ 								addAllToSet(
/******/ 									outdatedDependencies[moduleId],
/******/ 									result.outdatedDependencies[moduleId]
/******/ 								);
/******/ 							}
/******/ 						}
/******/ 					}
/******/ 					if (doDispose) {
/******/ 						addAllToSet(outdatedModules, [result.moduleId]);
/******/ 						appliedUpdate[moduleId] = warnUnexpectedRequire;
/******/ 					}
/******/ 				}
/******/ 			}
/******/ 			currentUpdate = undefined;
/******/ 		
/******/ 			// Store self accepted outdated modules to require them later by the module system
/******/ 			var outdatedSelfAcceptedModules = [];
/******/ 			for (var j = 0; j < outdatedModules.length; j++) {
/******/ 				var outdatedModuleId = outdatedModules[j];
/******/ 				var module = __webpack_require__.c[outdatedModuleId];
/******/ 				if (
/******/ 					module &&
/******/ 					(module.hot._selfAccepted || module.hot._main) &&
/******/ 					// removed self-accepted modules should not be required
/******/ 					appliedUpdate[outdatedModuleId] !== warnUnexpectedRequire &&
/******/ 					// when called invalidate self-accepting is not possible
/******/ 					!module.hot._selfInvalidated
/******/ 				) {
/******/ 					outdatedSelfAcceptedModules.push({
/******/ 						module: outdatedModuleId,
/******/ 						require: module.hot._requireSelf,
/******/ 						errorHandler: module.hot._selfAccepted
/******/ 					});
/******/ 				}
/******/ 			}
/******/ 		
/******/ 			var moduleOutdatedDependencies;
/******/ 		
/******/ 			return {
/******/ 				dispose: function () {
/******/ 					currentUpdateRemovedChunks.forEach(function (chunkId) {
/******/ 						delete installedChunks[chunkId];
/******/ 					});
/******/ 					currentUpdateRemovedChunks = undefined;
/******/ 		
/******/ 					var idx;
/******/ 					var queue = outdatedModules.slice();
/******/ 					while (queue.length > 0) {
/******/ 						var moduleId = queue.pop();
/******/ 						var module = __webpack_require__.c[moduleId];
/******/ 						if (!module) continue;
/******/ 		
/******/ 						var data = {};
/******/ 		
/******/ 						// Call dispose handlers
/******/ 						var disposeHandlers = module.hot._disposeHandlers;
/******/ 						for (j = 0; j < disposeHandlers.length; j++) {
/******/ 							disposeHandlers[j].call(null, data);
/******/ 						}
/******/ 						__webpack_require__.hmrD[moduleId] = data;
/******/ 		
/******/ 						// disable module (this disables requires from this module)
/******/ 						module.hot.active = false;
/******/ 		
/******/ 						// remove module from cache
/******/ 						delete __webpack_require__.c[moduleId];
/******/ 		
/******/ 						// when disposing there is no need to call dispose handler
/******/ 						delete outdatedDependencies[moduleId];
/******/ 		
/******/ 						// remove "parents" references from all children
/******/ 						for (j = 0; j < module.children.length; j++) {
/******/ 							var child = __webpack_require__.c[module.children[j]];
/******/ 							if (!child) continue;
/******/ 							idx = child.parents.indexOf(moduleId);
/******/ 							if (idx >= 0) {
/******/ 								child.parents.splice(idx, 1);
/******/ 							}
/******/ 						}
/******/ 					}
/******/ 		
/******/ 					// remove outdated dependency from module children
/******/ 					var dependency;
/******/ 					for (var outdatedModuleId in outdatedDependencies) {
/******/ 						if (__webpack_require__.o(outdatedDependencies, outdatedModuleId)) {
/******/ 							module = __webpack_require__.c[outdatedModuleId];
/******/ 							if (module) {
/******/ 								moduleOutdatedDependencies =
/******/ 									outdatedDependencies[outdatedModuleId];
/******/ 								for (j = 0; j < moduleOutdatedDependencies.length; j++) {
/******/ 									dependency = moduleOutdatedDependencies[j];
/******/ 									idx = module.children.indexOf(dependency);
/******/ 									if (idx >= 0) module.children.splice(idx, 1);
/******/ 								}
/******/ 							}
/******/ 						}
/******/ 					}
/******/ 				},
/******/ 				apply: function (reportError) {
/******/ 					// insert new code
/******/ 					for (var updateModuleId in appliedUpdate) {
/******/ 						if (__webpack_require__.o(appliedUpdate, updateModuleId)) {
/******/ 							__webpack_require__.m[updateModuleId] = appliedUpdate[updateModuleId];
/******/ 						}
/******/ 					}
/******/ 		
/******/ 					// run new runtime modules
/******/ 					for (var i = 0; i < currentUpdateRuntime.length; i++) {
/******/ 						currentUpdateRuntime[i](__webpack_require__);
/******/ 					}
/******/ 		
/******/ 					// call accept handlers
/******/ 					for (var outdatedModuleId in outdatedDependencies) {
/******/ 						if (__webpack_require__.o(outdatedDependencies, outdatedModuleId)) {
/******/ 							var module = __webpack_require__.c[outdatedModuleId];
/******/ 							if (module) {
/******/ 								moduleOutdatedDependencies =
/******/ 									outdatedDependencies[outdatedModuleId];
/******/ 								var callbacks = [];
/******/ 								var errorHandlers = [];
/******/ 								var dependenciesForCallbacks = [];
/******/ 								for (var j = 0; j < moduleOutdatedDependencies.length; j++) {
/******/ 									var dependency = moduleOutdatedDependencies[j];
/******/ 									var acceptCallback =
/******/ 										module.hot._acceptedDependencies[dependency];
/******/ 									var errorHandler =
/******/ 										module.hot._acceptedErrorHandlers[dependency];
/******/ 									if (acceptCallback) {
/******/ 										if (callbacks.indexOf(acceptCallback) !== -1) continue;
/******/ 										callbacks.push(acceptCallback);
/******/ 										errorHandlers.push(errorHandler);
/******/ 										dependenciesForCallbacks.push(dependency);
/******/ 									}
/******/ 								}
/******/ 								for (var k = 0; k < callbacks.length; k++) {
/******/ 									try {
/******/ 										callbacks[k].call(null, moduleOutdatedDependencies);
/******/ 									} catch (err) {
/******/ 										if (typeof errorHandlers[k] === "function") {
/******/ 											try {
/******/ 												errorHandlers[k](err, {
/******/ 													moduleId: outdatedModuleId,
/******/ 													dependencyId: dependenciesForCallbacks[k]
/******/ 												});
/******/ 											} catch (err2) {
/******/ 												if (options.onErrored) {
/******/ 													options.onErrored({
/******/ 														type: "accept-error-handler-errored",
/******/ 														moduleId: outdatedModuleId,
/******/ 														dependencyId: dependenciesForCallbacks[k],
/******/ 														error: err2,
/******/ 														originalError: err
/******/ 													});
/******/ 												}
/******/ 												if (!options.ignoreErrored) {
/******/ 													reportError(err2);
/******/ 													reportError(err);
/******/ 												}
/******/ 											}
/******/ 										} else {
/******/ 											if (options.onErrored) {
/******/ 												options.onErrored({
/******/ 													type: "accept-errored",
/******/ 													moduleId: outdatedModuleId,
/******/ 													dependencyId: dependenciesForCallbacks[k],
/******/ 													error: err
/******/ 												});
/******/ 											}
/******/ 											if (!options.ignoreErrored) {
/******/ 												reportError(err);
/******/ 											}
/******/ 										}
/******/ 									}
/******/ 								}
/******/ 							}
/******/ 						}
/******/ 					}
/******/ 		
/******/ 					// Load self accepted modules
/******/ 					for (var o = 0; o < outdatedSelfAcceptedModules.length; o++) {
/******/ 						var item = outdatedSelfAcceptedModules[o];
/******/ 						var moduleId = item.module;
/******/ 						try {
/******/ 							item.require(moduleId);
/******/ 						} catch (err) {
/******/ 							if (typeof item.errorHandler === "function") {
/******/ 								try {
/******/ 									item.errorHandler(err, {
/******/ 										moduleId: moduleId,
/******/ 										module: __webpack_require__.c[moduleId]
/******/ 									});
/******/ 								} catch (err1) {
/******/ 									if (options.onErrored) {
/******/ 										options.onErrored({
/******/ 											type: "self-accept-error-handler-errored",
/******/ 											moduleId: moduleId,
/******/ 											error: err1,
/******/ 											originalError: err
/******/ 										});
/******/ 									}
/******/ 									if (!options.ignoreErrored) {
/******/ 										reportError(err1);
/******/ 										reportError(err);
/******/ 									}
/******/ 								}
/******/ 							} else {
/******/ 								if (options.onErrored) {
/******/ 									options.onErrored({
/******/ 										type: "self-accept-errored",
/******/ 										moduleId: moduleId,
/******/ 										error: err
/******/ 									});
/******/ 								}
/******/ 								if (!options.ignoreErrored) {
/******/ 									reportError(err);
/******/ 								}
/******/ 							}
/******/ 						}
/******/ 					}
/******/ 		
/******/ 					return outdatedModules;
/******/ 				}
/******/ 			};
/******/ 		}
/******/ 		__webpack_require__.hmrI.importScripts = function (moduleId, applyHandlers) {
/******/ 			if (!currentUpdate) {
/******/ 				currentUpdate = {};
/******/ 				currentUpdateRuntime = [];
/******/ 				currentUpdateRemovedChunks = [];
/******/ 				applyHandlers.push(applyHandler);
/******/ 			}
/******/ 			if (!__webpack_require__.o(currentUpdate, moduleId)) {
/******/ 				currentUpdate[moduleId] = __webpack_require__.m[moduleId];
/******/ 			}
/******/ 		};
/******/ 		__webpack_require__.hmrC.importScripts = function (
/******/ 			chunkIds,
/******/ 			removedChunks,
/******/ 			removedModules,
/******/ 			promises,
/******/ 			applyHandlers,
/******/ 			updatedModulesList
/******/ 		) {
/******/ 			applyHandlers.push(applyHandler);
/******/ 			currentUpdateChunks = {};
/******/ 			currentUpdateRemovedChunks = removedChunks;
/******/ 			currentUpdate = removedModules.reduce(function (obj, key) {
/******/ 				obj[key] = false;
/******/ 				return obj;
/******/ 			}, {});
/******/ 			currentUpdateRuntime = [];
/******/ 			chunkIds.forEach(function (chunkId) {
/******/ 				if (
/******/ 					__webpack_require__.o(installedChunks, chunkId) &&
/******/ 					installedChunks[chunkId] !== undefined
/******/ 				) {
/******/ 					promises.push(loadUpdateChunk(chunkId, updatedModulesList));
/******/ 					currentUpdateChunks[chunkId] = true;
/******/ 				} else {
/******/ 					currentUpdateChunks[chunkId] = false;
/******/ 				}
/******/ 			});
/******/ 			if (__webpack_require__.f) {
/******/ 				__webpack_require__.f.importScriptsHmr = function (chunkId, promises) {
/******/ 					if (
/******/ 						currentUpdateChunks &&
/******/ 						__webpack_require__.o(currentUpdateChunks, chunkId) &&
/******/ 						!currentUpdateChunks[chunkId]
/******/ 					) {
/******/ 						promises.push(loadUpdateChunk(chunkId));
/******/ 						currentUpdateChunks[chunkId] = true;
/******/ 					}
/******/ 				};
/******/ 			}
/******/ 		};
/******/ 		
/******/ 		__webpack_require__.hmrM = () => {
/******/ 			if (typeof fetch === "undefined") throw new Error("No browser support: need fetch API");
/******/ 			return fetch(__webpack_require__.p + __webpack_require__.hmrF()).then((response) => {
/******/ 				if(response.status === 404) return; // no update available
/******/ 				if(!response.ok) throw new Error("Failed to fetch update manifest " + response.statusText);
/******/ 				return response.json();
/******/ 			});
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// module cache are used so entry inlining is disabled
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	var __webpack_exports__ = __webpack_require__("(app-pages-browser)/./app/lib/audio/analyze.worker.ts");
/******/ 	_N_E = __webpack_exports__;
/******/ 	
/******/ })()
;