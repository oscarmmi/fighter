Build a 2D one-on-one fighter in THIS folder: C:\xampp\htdocs\fighter

A recruiter-ready browser fighting game. Playable, polished, no backend.

## Game
- Canvas 2D side view. Player (left) vs CPU (right). First to win 2 of 3 rounds.
- Each fighter: walk, jump, punch, kick, block. Health bars. Hit stun + knockback.
- Keyboard: A/D or arrows walk, W/Up jump, J punch, K kick, S/Down block. Space pause. R restart.
- Touch: on-screen walk / jump / punch / kick / block so a 390px phone is playable.
- CPU with a small reaction delay so a human can win. Round reset after KO.
- Original fighters: Ember vs Aqua. No licensed characters.

## UI
- Neon night rooftop: magenta/cyan fighters, health bars, round pips, scanline overlay optional.
- Not a default Vite page. No Vue logo. 390px phone and 1280px desktop.

## Tests
- Vitest (pure logic): a punch in range reduces opponent health; blocking reduces or negates that damage; health reaching 0 wins the round.
- `npm test` and `npm run build` must pass.

## GitHub
- Repo: https://github.com/oscarmmi/fighter
- Pages: https://oscarmmi.github.io/fighter/
- vite base `/fighter/`
- Commit: feat: add fighter
- gh repo edit --description "2D fighter vs CPU in Vue 3 + TypeScript canvas, playable on GitHub Pages." --add-topic vue --add-topic typescript --add-topic game --add-topic fighting --add-topic canvas
- Stop. Print the repo URL and Pages URL.
