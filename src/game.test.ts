import { describe, expect, it } from 'vitest'
import { attack, createGame, stepGame } from './game'

describe('fighter combat rules', () => {
  it('reduces the opponent health when a punch lands in range', () => {
    const game = createGame()
    game.ember.x = 400
    game.aqua.x = 490

    expect(attack(game, 'ember', 'punch')).toBe(true)
    expect(game.aqua.health).toBe(91)
  })

  it('reduces incoming damage while the defender is blocking toward the attacker', () => {
    const game = createGame()
    game.ember.x = 400
    game.aqua.x = 490
    game.aqua.blocking = true

    expect(attack(game, 'ember', 'punch')).toBe(true)
    expect(game.aqua.health).toBe(99)
  })

  it('awards the round and match when a hit takes health to zero', () => {
    const game = createGame()
    game.ember.x = 400
    game.aqua.x = 490
    game.aqua.health = 9

    expect(attack(game, 'ember', 'punch')).toBe(true)
    expect(game.aqua.health).toBe(0)
    expect(game.ember.wins).toBe(1)
    expect(game.phase).toBe('round-over')

    const rematch = createGame()
    rematch.ember.x = 400
    rematch.aqua.x = 490
    rematch.aqua.health = 9
    rematch.ember.wins = 1
    attack(rematch, 'ember', 'punch')

    expect(rematch.ember.wins).toBe(2)
    expect(rematch.phase).toBe('match-over')
    expect(rematch.winner).toBe('ember')
  })

  it('starts a fresh round after a knockout while preserving round wins', () => {
    const game = createGame()
    game.ember.x = 400
    game.aqua.x = 490
    game.aqua.health = 9
    attack(game, 'ember', 'punch')
    stepGame(game, 1.6, { left: false, right: false, jump: false, block: false })

    expect(game.round).toBe(2)
    expect(game.ember.health).toBe(100)
    expect(game.ember.wins).toBe(1)
    expect(game.phase).toBe('fight')
  })
})
