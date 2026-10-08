export function tickCombo(combo,dt){if(combo.timer>0){combo.timer-=dt;if(combo.timer<0){combo.timer=0;combo.count=0;}}}
export function rewardKill(game,weapon){
  const value=10*(1+game.wave*.1);game.score+=value;game.xp+=value;
  while(game.xp>=game.xpNext){game.xp-=game.xpNext;game.playerLevel++;game.xpNext=Math.floor(game.xpNext*1.5);game.maxHp+=10;game.hp=Math.min(game.maxHp,game.hp+20);game.emit('levelUp',{level:game.playerLevel});}
  if(weapon){game.weaponProgress+=Math.min(3,1+game.wave*.06);if(game.weaponLevel<100&&game.weaponProgress>=6*game.weaponLevel)game.weaponLevel++;}
  game.combo.count=game.combo.timer>0?game.combo.count+1:1;game.combo.timer=2;
  game.score+=Math.min(50,2*game.combo.count);if(game.combo.count%5===0)game.coins++;
}
export function passiveRegen(game){if(game.simFrame%300===0&&game.hp<game.maxHp){game.hp=Math.min(game.maxHp,game.hp+1);game.emit('regen');}}
