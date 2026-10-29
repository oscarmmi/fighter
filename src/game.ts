export type FighterId = 'ember' | 'aqua'
export type AttackKind = 'punch' | 'kick'
export type FighterAction = 'idle' | 'punch' | 'kick' | 'hit'

export interface Fighter {
  x: number
  y: number
  velocityY: number
  vx: number
  health: number
  wins: number
  facing: 1 | -1
  action: FighterAction
  actionTimer: number
  stun: number
  cooldown: number
  hitFlash: number
  blocking: boolean
}

export interface GameState {
  ember: Fighter
  aqua: Fighter
  round: number
  phase: 'fight' | 'round-over' | 'match-over'
  phaseTimer: number
  winner: FighterId | null
  cpuThink: number
}

export interface GameInput {
  left: boolean
  right: boolean
  jump: boolean
  block: boolean
}

const MAX_HEALTH = 100
const FLOOR = 0
const LEFT_BOUND = 54
const RIGHT_BOUND = 906

function fighter(x: number, facing: 1 | -1): Fighter {
  return {
    x, y: 0, velocityY: 0, vx: 0, health: MAX_HEALTH, wins: 0, facing,
    action: 'idle', actionTimer: 0, stun: 0, cooldown: 0, hitFlash: 0, blocking: false,
  }
}

export function createGame(): GameState {
  return {
    ember: fighter(270, 1),
    aqua: fighter(690, -1),
    round: 1,
    phase: 'fight',
    phaseTimer: 0,
    winner: null,
    cpuThink: 0.85,
  }
}

function isFacingTarget(attacker: Fighter, target: Fighter) {
  return (target.x - attacker.x) * attacker.facing >= 0
}

/** Resolve a close-range strike and update round state when it lands. */
export function attack(state: GameState, attackerId: FighterId, kind: AttackKind): boolean {
  if (state.phase !== 'fight') return false
  const attacker = state[attackerId]
  const defender = state[attackerId === 'ember' ? 'aqua' : 'ember']
  if (attacker.stun > 0 || attacker.cooldown > 0 || !isFacingTarget(attacker, defender)) return false

  const isKick = kind === 'kick'
  const reach = isKick ? 164 : 116
  const verticalDifference = Math.abs(attacker.y - defender.y)
  attacker.action = kind
  attacker.actionTimer = isKick ? 0.35 : 0.24
  attacker.cooldown = isKick ? 0.72 : 0.48
  if (Math.abs(attacker.x - defender.x) > reach || verticalDifference > 54) return false

  const damage = isKick ? 14 : 9
  const isGuarding = defender.blocking && isFacingTarget(defender, attacker)
  const appliedDamage = isGuarding ? (isKick ? 3 : 1) : damage
  defender.health = Math.max(0, defender.health - appliedDamage)
  defender.hitFlash = 0.2
  defender.stun = isGuarding ? 0.08 : (isKick ? 0.36 : 0.24)
  defender.vx = (defender.x > attacker.x ? 1 : -1) * (isGuarding ? 45 : (isKick ? 250 : 165))
  if (!isGuarding) defender.action = 'hit'

  if (defender.health === 0) finishRound(state, attackerId)
  return true
}

function finishRound(state: GameState, winner: FighterId) {
  state[winner].wins += 1
  state.winner = winner
  state.phase = state[winner].wins >= 2 ? 'match-over' : 'round-over'
  state.phaseTimer = 0
}

function startNextRound(state: GameState) {
  const emberWins = state.ember.wins
  const aquaWins = state.aqua.wins
  state.round += 1
  state.ember = fighter(270, 1)
  state.aqua = fighter(690, -1)
  state.ember.wins = emberWins
  state.aqua.wins = aquaWins
  state.phase = 'fight'
  state.winner = null
  state.phaseTimer = 0
  state.cpuThink = 0.85
}

function updateFighter(fighterState: Fighter, dt: number) {
  fighterState.cooldown = Math.max(0, fighterState.cooldown - dt)
  fighterState.stun = Math.max(0, fighterState.stun - dt)
  fighterState.hitFlash = Math.max(0, fighterState.hitFlash - dt)
  fighterState.actionTimer = Math.max(0, fighterState.actionTimer - dt)
  if (fighterState.actionTimer === 0 && fighterState.action !== 'idle') fighterState.action = 'idle'

  fighterState.x += fighterState.vx * dt
  fighterState.vx *= Math.pow(0.0008, dt)
  fighterState.y += fighterState.velocityY * dt
  if (fighterState.y > FLOOR || fighterState.velocityY > 0) {
    fighterState.velocityY -= 1050 * dt
    if (fighterState.y <= FLOOR) {
      fighterState.y = FLOOR
      fighterState.velocityY = 0
    }
  }
  fighterState.x = Math.min(RIGHT_BOUND, Math.max(LEFT_BOUND, fighterState.x))
}

/** Advance movement, jumping, guard state, and the deliberately readable CPU. */
export function stepGame(state: GameState, dt: number, input: GameInput) {
  if (state.phase === 'match-over') return
  if (state.phase === 'round-over') {
    state.phaseTimer += dt
    if (state.phaseTimer >= 1.55) startNextRound(state)
    return
  }

  updateFighter(state.ember, dt)
  updateFighter(state.aqua, dt)
  state.ember.facing = state.ember.x <= state.aqua.x ? 1 : -1
  state.aqua.facing = state.aqua.x >= state.ember.x ? -1 : 1

  state.ember.blocking = input.block && state.ember.stun === 0
  if (state.ember.stun === 0) {
    const direction = Number(input.right) - Number(input.left)
    if (direction !== 0 && !state.ember.blocking) {
      state.ember.x = Math.min(RIGHT_BOUND, Math.max(LEFT_BOUND, state.ember.x + direction * 250 * dt))
      state.ember.vx = direction * 250
    } else {
      state.ember.vx *= 0.7
    }
    if (input.jump && state.ember.y === FLOOR) state.ember.velocityY = 480
  }

  const gap = Math.abs(state.aqua.x - state.ember.x)
  state.cpuThink -= dt
  state.aqua.blocking = false
  if (state.aqua.stun === 0) {
    if (gap > 130) {
      state.aqua.x += (state.ember.x > state.aqua.x ? 1 : -1) * 112 * dt
      state.aqua.vx = (state.ember.x > state.aqua.x ? 1 : -1) * 112
    } else if (gap < 250 && state.ember.action !== 'idle' && Math.random() < 0.08) {
      state.aqua.blocking = true
    }
    if (state.cpuThink <= 0) {
      if (gap <= 158) attack(state, 'aqua', gap > 112 && Math.random() < 0.74 ? 'kick' : 'punch')
      state.cpuThink = 0.62 + Math.random() * 0.43
    }
  }

  const separation = state.aqua.x - state.ember.x
  if (separation < 54) {
    const correction = (54 - separation) / 2
    state.ember.x -= correction
    state.aqua.x += correction
  }
}
