<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  attack,
  createGame,
  stepGame,
  type AttackKind,
  type GameInput,
  type GameState,
} from './game'

const canvas = ref<HTMLCanvasElement | null>(null)
const game = createGame()
const health = ref({ ember: game.ember.health, aqua: game.aqua.health })
const wins = ref({ ember: 0, aqua: 0 })
const phase = ref(game.phase)
const round = ref(game.round)
const paused = ref(false)
const keyMap: Record<string, keyof GameInput> = {
  a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right',
  w: 'jump', arrowup: 'jump', s: 'block', arrowdown: 'block',
}
const held: GameInput = { left: false, right: false, jump: false, block: false }
let frame = 0
let previous = 0
let lastHudSync = 0

const matchWinner = computed(() => {
  phase.value
  return game.winner === 'ember' ? 'EMBER' : game.winner === 'aqua' ? 'AQUA' : ''
})
const statusLabel = computed(() => {
  if (paused.value) return 'PAUSED'
  if (phase.value === 'match-over') return 'MATCH COMPLETE'
  if (phase.value === 'round-over') return 'KNOCKOUT'
  return `ROUND ${String(round.value).padStart(2, '0')} · FIGHT!`
})

function syncHud() {
  health.value = { ember: game.ember.health, aqua: game.aqua.health }
  wins.value = { ember: game.ember.wins, aqua: game.aqua.wins }
  phase.value = game.phase
  round.value = game.round
}

function act(kind: AttackKind) {
  if (paused.value) return
  attack(game, 'ember', kind)
  syncHud()
}

function setHeld(control: keyof GameInput, value: boolean) {
  held[control] = value
}

function onKeyDown(event: KeyboardEvent) {
  const key = event.key.toLowerCase()
  if (key === ' ' || key === 'spacebar') {
    event.preventDefault()
    if (!event.repeat && game.phase !== 'match-over') paused.value = !paused.value
    return
  }
  if (key === 'r') {
    event.preventDefault()
    resetMatch()
    return
  }
  const control = keyMap[key]
  if (control) {
    event.preventDefault()
    setHeld(control, true)
  } else if (key === 'j' && !event.repeat) act('punch')
  else if (key === 'k' && !event.repeat) act('kick')
}

function onKeyUp(event: KeyboardEvent) {
  const control = keyMap[event.key.toLowerCase()]
  if (control) setHeld(control, false)
}

function resetMatch() {
  Object.assign(game, createGame())
  paused.value = false
  syncHud()
}

function drawBackdrop(ctx: CanvasRenderingContext2D, time: number) {
  const sky = ctx.createLinearGradient(0, 0, 0, 540)
  sky.addColorStop(0, '#10112c')
  sky.addColorStop(0.55, '#25204a')
  sky.addColorStop(1, '#4a2452')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 960, 540)

  const moon = ctx.createRadialGradient(738, 112, 5, 738, 112, 102)
  moon.addColorStop(0, 'rgba(255, 218, 234, .38)')
  moon.addColorStop(1, 'rgba(255, 218, 234, 0)')
  ctx.fillStyle = moon
  ctx.fillRect(620, 0, 240, 235)
  ctx.fillStyle = '#ffd5e5'
  ctx.globalAlpha = 0.8
  ctx.beginPath()
  ctx.arc(738, 112, 27, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1

  // Distant city blocks and their scattered windows.
  for (let i = 0; i < 17; i++) {
    const x = i * 61 - 10
    const width = 34 + (i * 17 % 27)
    const height = 75 + (i * 43 % 125)
    ctx.fillStyle = i % 2 ? '#171a3d' : '#1c1b42'
    ctx.fillRect(x, 305 - height, width, height)
    ctx.fillStyle = i % 3 ? 'rgba(70, 226, 255, .3)' : 'rgba(255, 74, 185, .35)'
    for (let wy = 0; wy < height - 14; wy += 19) {
      for (let wx = 8; wx < width - 5; wx += 14) {
        if ((i + wy + wx) % 3 !== 0) ctx.fillRect(x + wx, 314 - height + wy, 3, 6)
      }
    }
  }

  ctx.fillStyle = '#11152d'
  ctx.beginPath()
  ctx.moveTo(0, 342); ctx.lineTo(155, 318); ctx.lineTo(265, 339); ctx.lineTo(416, 315)
  ctx.lineTo(566, 340); ctx.lineTo(715, 316); ctx.lineTo(960, 346); ctx.lineTo(960, 540); ctx.lineTo(0, 540)
  ctx.closePath(); ctx.fill()
  ctx.strokeStyle = 'rgba(75, 222, 255, .55)'
  ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(0, 342); ctx.lineTo(155, 318); ctx.lineTo(265, 339); ctx.lineTo(416, 315); ctx.lineTo(566, 340); ctx.lineTo(715, 316); ctx.lineTo(960, 346); ctx.stroke()

  const floor = ctx.createLinearGradient(0, 355, 0, 540)
  floor.addColorStop(0, '#202342')
  floor.addColorStop(1, '#111528')
  ctx.fillStyle = floor
  ctx.fillRect(0, 355, 960, 185)
  ctx.strokeStyle = 'rgba(255, 72, 177, .15)'
  ctx.lineWidth = 1
  for (let i = 0; i < 8; i++) {
    const y = 380 + i * i * 2.7
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(960, y); ctx.stroke()
  }
  for (let i = -5; i <= 5; i++) {
    ctx.beginPath(); ctx.moveTo(480 + i * 35, 355); ctx.lineTo(480 + i * 116, 540); ctx.stroke()
  }
  const glowX = 480 + Math.sin(time * 0.001) * 25
  const reflection = ctx.createLinearGradient(glowX - 90, 365, glowX + 90, 540)
  reflection.addColorStop(0, 'rgba(255, 54, 174, .16)')
  reflection.addColorStop(1, 'rgba(255, 54, 174, 0)')
  ctx.fillStyle = reflection
  ctx.fillRect(280, 360, 400, 180)

  ctx.fillStyle = 'rgba(8, 10, 28, .28)'
  ctx.fillRect(0, 0, 960, 540)
}

function drawFighter(ctx: CanvasRenderingContext2D, fighter: GameState['ember'], color: string, accent: string, time: number, isPlayer: boolean) {
  const x = fighter.x
  const ground = 429 - fighter.y
  const facing = fighter.facing
  const moving = Math.abs(fighter.vx) > 10
  const stride = moving ? Math.sin(time * 0.018 + (isPlayer ? 0 : 2)) * 10 : Math.sin(time * 0.004 + (isPlayer ? 0 : 1)) * 2
  const punching = fighter.action === 'punch' && fighter.actionTimer > 0
  const kicking = fighter.action === 'kick' && fighter.actionTimer > 0
  const blocking = fighter.blocking
  const bob = fighter.y > 0 ? -fighter.y : Math.sin(time * 0.005 + (isPlayer ? 0 : 1)) * 2

  ctx.save()
  ctx.translate(x, ground + bob)
  ctx.scale(facing, 1)
  ctx.globalAlpha = 0.35
  ctx.fillStyle = color
  ctx.beginPath(); ctx.ellipse(0, 2, 46, 7, 0, 0, Math.PI * 2); ctx.fill()
  ctx.globalAlpha = 1

  // Far leg and boot.
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#14142a'
  ctx.lineWidth = 16
  ctx.beginPath(); ctx.moveTo(-8, -44); ctx.lineTo(-15 - stride, -16); ctx.lineTo(-22 - stride, -3); ctx.stroke()
  ctx.strokeStyle = accent
  ctx.lineWidth = 4
  ctx.beginPath(); ctx.moveTo(-18 - stride, -5); ctx.lineTo(-29 - stride, -4); ctx.stroke()

  // Torso, jacket and glowing center seam.
  const body = ctx.createLinearGradient(-18, -104, 21, -43)
  body.addColorStop(0, color)
  body.addColorStop(0.5, '#302546')
  body.addColorStop(1, '#15172d')
  ctx.fillStyle = body
  ctx.beginPath(); ctx.moveTo(-15, -103); ctx.lineTo(12, -101); ctx.lineTo(20, -59); ctx.lineTo(11, -41); ctx.lineTo(-13, -43); ctx.lineTo(-22, -62); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = accent
  ctx.lineWidth = 2.5
  ctx.beginPath(); ctx.moveTo(0, -96); ctx.lineTo(1, -54); ctx.stroke()
  ctx.fillStyle = color
  ctx.beginPath(); ctx.moveTo(-15, -100); ctx.lineTo(0, -91); ctx.lineTo(-7, -81); ctx.closePath(); ctx.fill()

  // Arms change silhouette while attacking or guarding.
  ctx.strokeStyle = '#17182d'
  ctx.lineWidth = 12
  ctx.beginPath(); ctx.moveTo(-14, -94); ctx.lineTo(-24, -74); ctx.lineTo(-12, -59); ctx.stroke()
  ctx.strokeStyle = color
  ctx.lineWidth = 4
  ctx.beginPath(); ctx.moveTo(-24, -74); ctx.lineTo(-12, -59); ctx.stroke()
  ctx.strokeStyle = '#202039'
  ctx.lineWidth = 13
  ctx.beginPath(); ctx.moveTo(13, -94)
  if (punching) { ctx.lineTo(29, -87); ctx.lineTo(54, -82) }
  else if (blocking) { ctx.lineTo(24, -83); ctx.lineTo(7, -104) }
  else { ctx.lineTo(23, -76); ctx.lineTo(12, -62) }
  ctx.stroke()
  ctx.fillStyle = accent
  ctx.shadowColor = accent
  ctx.shadowBlur = punching ? 18 : 9
  ctx.beginPath(); ctx.arc(punching ? 54 : blocking ? 7 : 12, punching ? -82 : blocking ? -104 : -62, 7, 0, Math.PI * 2); ctx.fill()
  ctx.shadowBlur = 0

  // Near leg, with an extended kick pose.
  ctx.strokeStyle = '#17182d'
  ctx.lineWidth = 17
  ctx.beginPath(); ctx.moveTo(7, -46)
  if (kicking) { ctx.lineTo(25, -61); ctx.lineTo(65, -63) }
  else { ctx.lineTo(12 + stride, -21); ctx.lineTo(17 + stride, -3) }
  ctx.stroke()
  if (kicking) {
    ctx.strokeStyle = color; ctx.lineWidth = 4
    ctx.beginPath(); ctx.moveTo(28, -62); ctx.lineTo(66, -63); ctx.stroke()
  }

  // Head, fringe and luminous visor.
  ctx.fillStyle = '#e9bfd1'
  ctx.beginPath(); ctx.ellipse(0, -116, 14, 17, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = color
  ctx.beginPath(); ctx.arc(-2, -122, 15, Math.PI, Math.PI * 2); ctx.lineTo(13, -113); ctx.lineTo(-12, -116); ctx.closePath(); ctx.fill()
  ctx.fillStyle = accent
  ctx.shadowColor = accent; ctx.shadowBlur = 12
  ctx.fillRect(2, -117, 9, 3)
  ctx.shadowBlur = 0
  if (fighter.hitFlash > 0) {
    ctx.globalAlpha = Math.min(0.7, fighter.hitFlash * 3)
    ctx.fillStyle = '#fff'
    ctx.beginPath(); ctx.ellipse(0, -77, 28, 52, 0, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

function render(time: number) {
  const ctx = canvas.value?.getContext('2d')
  if (!ctx) return
  drawBackdrop(ctx, time)
  // Rooftop edge lights.
  ctx.fillStyle = '#111326'; ctx.fillRect(0, 432, 960, 20)
  for (let x = 24; x < 960; x += 48) {
    ctx.fillStyle = x % 96 ? 'rgba(69, 227, 255, .55)' : 'rgba(255, 75, 183, .7)'
    ctx.fillRect(x, 438, 20, 2)
  }
  drawFighter(ctx, game.ember, '#ff3ca7', '#ff9acb', time, true)
  drawFighter(ctx, game.aqua, '#27dff4', '#9effff', time, false)
  if (game.ember.action === 'punch' || game.ember.action === 'kick') {
    ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#ff9acb'; ctx.beginPath(); ctx.arc(game.ember.x + 60, 330, 45, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  }
  if (paused.value) {
    ctx.fillStyle = 'rgba(8, 9, 24, .64)'; ctx.fillRect(0, 0, 960, 540)
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff'; ctx.font = '800 42px sans-serif'; ctx.fillText('PAUSED', 480, 280)
    ctx.fillStyle = '#88eaf5'; ctx.font = '600 13px sans-serif'; ctx.fillText('PRESS SPACE TO RETURN', 480, 312)
  }
}

function loop(time: number) {
  const dt = previous ? Math.min((time - previous) / 1000, 0.04) : 0
  previous = time
  if (!paused.value && game.phase !== 'match-over') stepGame(game, dt, held)
  render(time)
  if (time - lastHudSync > 100) {
    syncHud()
    lastHudSync = time
  }
  frame = requestAnimationFrame(loop)
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  frame = requestAnimationFrame(loop)
})
onUnmounted(() => {
  cancelAnimationFrame(frame)
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
})
</script>

<template>
  <main class="shell">
    <header class="topbar">
      <a class="brand" href="#top" aria-label="Neon Clash home"><span class="brand-mark">N<span>/</span>C</span><span class="brand-name">NIGHTSHIFT<br><b>ARCADE</b></span></a>
      <div class="season"><span class="live-dot"></span> ROOFTOP CIRCUIT <span class="season-divider">/</span> SEASON 01</div>
      <button class="sound-toggle" type="button" @click="paused = !paused" :aria-pressed="paused"><span class="sound-glyph">{{ paused ? '▶' : 'Ⅱ' }}</span><span>{{ paused ? 'RESUME' : 'PAUSE' }}</span></button>
    </header>

    <section id="top" class="intro">
      <div class="intro-kicker"><span>01</span> AFTER HOURS · UNDERGROUND FIGHT CLUB</div>
      <h1>NEON <span>CLASH</span><i>™</i></h1>
      <p>One rooftop. Two rivals. <strong>Settle it in the skyline.</strong></p>
    </section>

    <section class="arena" aria-label="Neon Clash game arena">
      <div class="fight-hud">
        <div class="fighter-hud ember-hud">
          <div class="hud-topline"><span class="fighter-tag">P1 <i>YOU</i></span><span class="fighter-name">EMBER</span></div>
          <div class="health-track" aria-label="Ember health"><div class="health-fill ember-fill" :style="{ width: `${health.ember}%` }"></div></div>
          <div class="hud-foot"><span>THE SPARK</span><div class="round-pips"><i v-for="pip in 2" :key="pip" :class="{ won: wins.ember >= pip }"></i></div></div>
        </div>
        <div class="round-display"><span class="round-label">{{ statusLabel }}</span><strong>VS</strong><span class="round-sub">FIRST TO 2</span></div>
        <div class="fighter-hud aqua-hud">
          <div class="hud-topline"><span class="fighter-name">AQUA</span><span class="fighter-tag">CPU <i>LV. 01</i></span></div>
          <div class="health-track" aria-label="Aqua health"><div class="health-fill aqua-fill" :style="{ width: `${health.aqua}%` }"></div></div>
          <div class="hud-foot"><span class="round-pips"><i v-for="pip in 2" :key="pip" :class="{ won: wins.aqua >= pip }"></i></span><span>THE CURRENT</span></div>
        </div>
      </div>
      <div class="canvas-frame">
        <canvas ref="canvas" width="960" height="540" aria-label="Ember fights Aqua on a neon rooftop. Use the controls below." />
        <div class="arena-corner corner-left">TOKYO · 02:17 AM</div><div class="arena-corner corner-right">FIGHT NO. 008</div>
        <div v-if="phase === 'match-over'" class="match-overlay"><span>MATCH WINNER</span><strong>{{ matchWinner }}</strong><button type="button" @click="resetMatch">RUN IT BACK <span>↗</span></button></div>
        <div v-else-if="phase === 'round-over'" class="round-flash"><span>KNOCKOUT</span></div>
      </div>
      <div class="arena-caption"><span><b class="caption-line"></b> LIVE FROM SHINJUKU ROOFTOP</span><span>BEST OF THREE <b class="caption-diamond">◆</b></span></div>
    </section>

    <section class="controls-panel" aria-label="Game controls">
      <div class="controls-heading"><span>YOUR MOVE</span><span>MAKE IT COUNT <i>✳</i></span></div>
      <div class="control-groups">
        <div class="move-controls">
          <div class="control-group-label">MOVE <span>01—04</span></div>
          <div class="move-buttons">
            <button class="control-button move-key" aria-label="Move left" @pointerdown="setHeld('left', true)" @pointerup="setHeld('left', false)" @pointerleave="setHeld('left', false)" @pointercancel="setHeld('left', false)"><span>←</span></button>
            <button class="control-button move-key" aria-label="Move right" @pointerdown="setHeld('right', true)" @pointerup="setHeld('right', false)" @pointerleave="setHeld('right', false)" @pointercancel="setHeld('right', false)"><span>→</span></button>
            <button class="control-button jump-key" aria-label="Jump" @pointerdown="setHeld('jump', true)" @pointerup="setHeld('jump', false)" @pointerleave="setHeld('jump', false)" @pointercancel="setHeld('jump', false)"><span>↑</span><small>JUMP</small></button>
            <button class="control-button block-key" aria-label="Block" @pointerdown="setHeld('block', true)" @pointerup="setHeld('block', false)" @pointerleave="setHeld('block', false)" @pointercancel="setHeld('block', false)"><span>◒</span><small>BLOCK</small></button>
          </div>
        </div>
        <div class="attack-controls">
          <div class="control-group-label">ATTACK <span>05—06</span></div>
          <div class="attack-buttons"><button class="control-button punch-key" @pointerdown="act('punch')"><span>J</span><small>PUNCH</small></button><button class="control-button kick-key" @pointerdown="act('kick')"><span>K</span><small>KICK</small></button></div>
        </div>
        <div class="keyboard-hint"><span class="key-cap">SPACE</span> PAUSE <span class="hint-separator">·</span> <span class="key-cap">R</span> RESTART</div>
      </div>
    </section>

    <footer class="footer"><span>NO RULES ABOVE THE CITY <b>✳</b></span><span>BUILT FOR THE LAST TRAIN HOME</span><span>© NIGHTSHIFT ARCADE <b>001</b></span></footer>
  </main>
</template>
